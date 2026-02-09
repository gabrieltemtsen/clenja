// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PoolVault.sol";
import "./RiskRules.sol";

/**
 * @title LoanManager
 * @notice Manages loan lifecycle: request -> approve+disburse -> repay -> close
 * @dev Repayments route principal back to vault, interest computed linearly.
 *      Agent fee is taken from INTEREST ONLY.
 */
contract LoanManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- Types ---
    struct Loan {
        address borrower;
        uint256 principal;
        uint256 principalRepaid;
        uint256 interestPaid;
        uint256 aprBps;           // Annual percentage rate in basis points
        uint256 startTime;
        uint256 duration;
        uint256 lastPaymentTime;
        bytes32 metadataHash;     // IPFS hash or similar for loan details
        bool active;
        bool disbursed;
    }

    // --- State Variables ---
    IERC20 public immutable asset;
    PoolVault public immutable vault;
    RiskRules public riskRules;

    uint256 public loanCount;
    mapping(uint256 => Loan) public loans;
    
    // Agent fee configuration
    uint256 public agentFeeBps;       // Fee taken from interest (e.g., 1000 = 10%)
    address public agentTreasury;
    uint256 public totalAgentFees;

    // Constants
    uint256 private constant SECONDS_PER_YEAR = 365 days;
    uint256 private constant BPS_DENOMINATOR = 10000;

    // --- Events ---
    event LoanRequested(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 principal,
        uint256 duration,
        uint256 aprBps,
        bytes32 metadataHash
    );
    event LoanDisbursed(uint256 indexed loanId, address indexed borrower, uint256 principal);
    event LoanRepaid(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 amount,
        uint256 interestPortion,
        uint256 principalPortion,
        uint256 agentFee
    );
    event LoanClosed(uint256 indexed loanId);
    event AgentFeeUpdated(uint256 newFeeBps, address treasury);
    event RiskRulesUpdated(address indexed newRules);

    // --- Errors ---
    error ZeroAmount();
    error ZeroAddress();
    error LoanNotFound();
    error LoanNotActive();
    error LoanAlreadyDisbursed();
    error LoanNotDisbursed();
    error NotBorrower();
    error ValidationFailed(string reason);
    error LoanNotFullyRepaid();
    error InvalidFeeBps();

    // --- Constructor ---
    constructor(
        address _asset,
        address _vault,
        address _riskRules,
        address _owner,
        address _agentTreasury,
        uint256 _agentFeeBps
    ) Ownable(_owner) {
        if (_asset == address(0) || _vault == address(0) || _riskRules == address(0)) {
            revert ZeroAddress();
        }
        if (_agentFeeBps > BPS_DENOMINATOR) {
            revert InvalidFeeBps();
        }
        
        asset = IERC20(_asset);
        vault = PoolVault(_vault);
        riskRules = RiskRules(_riskRules);
        agentTreasury = _agentTreasury;
        agentFeeBps = _agentFeeBps;
    }

    // --- Admin Functions ---

    /**
     * @notice Update agent fee configuration
     */
    function setAgentFee(uint256 _feeBps, address _treasury) external onlyOwner {
        if (_feeBps > BPS_DENOMINATOR) revert InvalidFeeBps();
        if (_treasury == address(0)) revert ZeroAddress();
        
        agentFeeBps = _feeBps;
        agentTreasury = _treasury;
        emit AgentFeeUpdated(_feeBps, _treasury);
    }

    /**
     * @notice Update risk rules contract
     */
    function setRiskRules(address _riskRules) external onlyOwner {
        if (_riskRules == address(0)) revert ZeroAddress();
        riskRules = RiskRules(_riskRules);
        emit RiskRulesUpdated(_riskRules);
    }

    // --- View Functions ---

    /**
     * @notice Calculate accrued interest for a loan
     * @param _loanId Loan ID
     * @return Accrued interest since last payment
     */
    function accruedInterest(uint256 _loanId) public view returns (uint256) {
        Loan storage loan = loans[_loanId];
        if (!loan.disbursed || !loan.active) return 0;
        
        uint256 remainingPrincipal = loan.principal - loan.principalRepaid;
        if (remainingPrincipal == 0) return 0;
        
        uint256 elapsed = block.timestamp - loan.lastPaymentTime;
        
        // Linear interest: remainingPrincipal * aprBps / 10000 * elapsed / 365 days
        return (remainingPrincipal * loan.aprBps * elapsed) / (BPS_DENOMINATOR * SECONDS_PER_YEAR);
    }

    /**
     * @notice Get total amount owed on a loan
     * @param _loanId Loan ID
     * @return Total amount owed (remaining principal + accrued interest)
     */
    function totalOwed(uint256 _loanId) public view returns (uint256) {
        Loan storage loan = loans[_loanId];
        uint256 remainingPrincipal = loan.principal - loan.principalRepaid;
        return remainingPrincipal + accruedInterest(_loanId);
    }

    /**
     * @notice Get loan details
     */
    function getLoan(uint256 _loanId) external view returns (Loan memory) {
        return loans[_loanId];
    }

    // --- Borrower Functions ---

    /**
     * @notice Request a new loan
     * @param _principal Requested loan amount
     * @param _duration Loan duration in seconds
     * @param _aprBps Agreed APR in basis points
     * @param _metadataHash IPFS hash with loan details
     * @return loanId New loan ID
     */
    function requestLoan(
        uint256 _principal,
        uint256 _duration,
        uint256 _aprBps,
        bytes32 _metadataHash
    ) external nonReentrant returns (uint256 loanId) {
        if (_principal == 0) revert ZeroAmount();

        // Validate against risk rules
        (bool ok, string memory reason) = riskRules.validateNewLoan(
            msg.sender,
            _principal,
            _duration,
            _aprBps,
            vault.totalAssets(),
            vault.outstandingLoans()
        );
        if (!ok) revert ValidationFailed(reason);

        loanId = ++loanCount;
        
        loans[loanId] = Loan({
            borrower: msg.sender,
            principal: _principal,
            principalRepaid: 0,
            interestPaid: 0,
            aprBps: _aprBps,
            startTime: 0,           // Set on disbursement
            duration: _duration,
            lastPaymentTime: 0,     // Set on disbursement
            metadataHash: _metadataHash,
            active: true,
            disbursed: false
        });

        emit LoanRequested(loanId, msg.sender, _principal, _duration, _aprBps, _metadataHash);
    }

    /**
     * @notice Approve and disburse loan funds
     * @dev Can be called by owner or automated process after verification
     * @param _loanId Loan ID to disburse
     */
    function approveAndDisburse(uint256 _loanId) external onlyOwner nonReentrant {
        Loan storage loan = loans[_loanId];
        
        if (loan.borrower == address(0)) revert LoanNotFound();
        if (!loan.active) revert LoanNotActive();
        if (loan.disbursed) revert LoanAlreadyDisbursed();

        // Re-validate in case pool state changed
        (bool ok, string memory reason) = riskRules.validateNewLoan(
            loan.borrower,
            loan.principal,
            loan.duration,
            loan.aprBps,
            vault.totalAssets(),
            vault.outstandingLoans()
        );
        if (!ok) revert ValidationFailed(reason);

        loan.disbursed = true;
        loan.startTime = block.timestamp;
        loan.lastPaymentTime = block.timestamp;

        // Fund loan through vault
        vault.fundLoan(_loanId, loan.borrower, loan.principal);

        emit LoanDisbursed(_loanId, loan.borrower, loan.principal);
    }

    /**
     * @notice Repay loan (partial or full)
     * @param _loanId Loan ID
     * @param _amount Amount to repay
     */
    function repay(uint256 _loanId, uint256 _amount) external nonReentrant {
        if (_amount == 0) revert ZeroAmount();
        
        Loan storage loan = loans[_loanId];
        if (loan.borrower == address(0)) revert LoanNotFound();
        if (!loan.active) revert LoanNotActive();
        if (!loan.disbursed) revert LoanNotDisbursed();

        // Calculate interest accrued since last payment
        uint256 interestDue = accruedInterest(_loanId);
        uint256 remainingPrincipal = loan.principal - loan.principalRepaid;
        
        // Determine split: interest first, then principal
        uint256 interestPortion;
        uint256 principalPortion;
        uint256 agentFee;

        if (_amount <= interestDue) {
            // Payment only covers interest
            interestPortion = _amount;
            principalPortion = 0;
        } else {
            // Payment covers interest + some principal
            interestPortion = interestDue;
            principalPortion = _amount - interestDue;
            
            // Cap principal portion
            if (principalPortion > remainingPrincipal) {
                principalPortion = remainingPrincipal;
            }
        }

        // Calculate agent fee from interest portion
        if (interestPortion > 0 && agentFeeBps > 0) {
            agentFee = (interestPortion * agentFeeBps) / BPS_DENOMINATOR;
        }

        uint256 actualPayment = interestPortion + principalPortion;
        
        // Transfer payment from borrower
        asset.safeTransferFrom(msg.sender, address(this), actualPayment);

        // Update loan state
        loan.principalRepaid += principalPortion;
        loan.interestPaid += interestPortion;
        loan.lastPaymentTime = block.timestamp;

        // Send agent fee to treasury
        if (agentFee > 0) {
            asset.safeTransfer(agentTreasury, agentFee);
            totalAgentFees += agentFee;
        }

        // Send rest to vault (principal goes back, interest minus fee adds to yield)
        uint256 toVault = actualPayment - agentFee;
        asset.safeTransfer(address(vault), toVault);
        
        // Notify vault of repayment split
        uint256 interestToVault = interestPortion - agentFee;
        vault.receiveRepayment(_loanId, principalPortion, interestToVault);

        emit LoanRepaid(_loanId, loan.borrower, actualPayment, interestPortion, principalPortion, agentFee);
    }

    /**
     * @notice Close a fully repaid loan
     * @param _loanId Loan ID
     */
    function closeLoan(uint256 _loanId) external {
        Loan storage loan = loans[_loanId];
        
        if (loan.borrower == address(0)) revert LoanNotFound();
        if (!loan.active) revert LoanNotActive();
        
        // Only borrower or owner can close
        if (msg.sender != loan.borrower && msg.sender != owner()) {
            revert NotBorrower();
        }

        // Must be fully repaid
        if (loan.principalRepaid < loan.principal) {
            revert LoanNotFullyRepaid();
        }

        loan.active = false;

        emit LoanClosed(_loanId);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PoolVault
 * @notice Non-custodial ERC20 vault for cUSD with share accounting
 * @dev Implements a simple vault pattern where depositors receive shares
 *      proportional to their deposit. Only LoanManager can fund loans.
 */
contract PoolVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- State Variables ---
    IERC20 public immutable asset;
    
    uint256 public totalShares;
    uint256 public totalAssets;
    uint256 public outstandingLoans;
    
    mapping(address => uint256) public shares;
    
    address public loanManager;
    bool public loanManagerSet;

    // --- Events ---
    event Deposit(address indexed caller, address indexed owner, uint256 assets, uint256 shares);
    event Withdraw(address indexed caller, address indexed receiver, address indexed owner, uint256 assets, uint256 sharesBurned);
    event LoanFunded(uint256 indexed loanId, address indexed borrower, uint256 amount);
    event RepaymentReceived(uint256 indexed loanId, uint256 amount);
    event LoanManagerSet(address indexed loanManager);

    // --- Errors ---
    error ZeroAmount();
    error InsufficientShares();
    error InsufficientLiquidity();
    error LoanManagerAlreadySet();
    error NotLoanManager();
    error ZeroAddress();

    // --- Constructor ---
    constructor(address _asset, address _owner) Ownable(_owner) {
        if (_asset == address(0)) revert ZeroAddress();
        asset = IERC20(_asset);
    }

    // --- Modifiers ---
    modifier onlyLoanManager() {
        if (msg.sender != loanManager) revert NotLoanManager();
        _;
    }

    // --- Admin Functions ---
    
    /**
     * @notice Set the LoanManager address (one-time only)
     * @param _loanManager The LoanManager contract address
     */
    function setLoanManager(address _loanManager) external onlyOwner {
        if (loanManagerSet) revert LoanManagerAlreadySet();
        if (_loanManager == address(0)) revert ZeroAddress();
        loanManager = _loanManager;
        loanManagerSet = true;
        emit LoanManagerSet(_loanManager);
    }

    // --- View Functions ---

    /**
     * @notice Convert assets to shares
     * @param _assets Amount of assets to convert
     * @return Number of shares
     */
    function convertToShares(uint256 _assets) public view returns (uint256) {
        if (totalShares == 0 || totalAssets == 0) {
            return _assets; // 1:1 ratio for first deposit
        }
        return (_assets * totalShares) / totalAssets;
    }

    /**
     * @notice Convert shares to assets
     * @param _shares Number of shares to convert
     * @return Amount of assets
     */
    function convertToAssets(uint256 _shares) public view returns (uint256) {
        if (totalShares == 0) {
            return 0;
        }
        return (_shares * totalAssets) / totalShares;
    }

    /**
     * @notice Get available liquidity (not lent out)
     * @return Available assets
     */
    function availableLiquidity() public view returns (uint256) {
        return totalAssets - outstandingLoans;
    }

    /**
     * @notice Get utilization rate in basis points
     * @return Utilization rate (e.g., 5000 = 50%)
     */
    function utilizationBps() public view returns (uint256) {
        if (totalAssets == 0) return 0;
        return (outstandingLoans * 10000) / totalAssets;
    }

    // --- User Functions ---

    /**
     * @notice Deposit assets and receive shares
     * @param _assets Amount of assets to deposit
     * @param _receiver Address to receive shares
     * @return sharesOut Number of shares minted
     */
    function deposit(uint256 _assets, address _receiver) external nonReentrant returns (uint256 sharesOut) {
        if (_assets == 0) revert ZeroAmount();
        if (_receiver == address(0)) revert ZeroAddress();

        sharesOut = convertToShares(_assets);
        
        // Transfer assets from caller
        asset.safeTransferFrom(msg.sender, address(this), _assets);
        
        // Update state
        shares[_receiver] += sharesOut;
        totalShares += sharesOut;
        totalAssets += _assets;

        emit Deposit(msg.sender, _receiver, _assets, sharesOut);
    }

    /**
     * @notice Withdraw assets by burning shares
     * @param _assets Amount of assets to withdraw
     * @param _receiver Address to receive assets
     * @param _owner Owner of the shares to burn
     * @return sharesBurned Number of shares burned
     */
    function withdraw(
        uint256 _assets,
        address _receiver,
        address _owner
    ) external nonReentrant returns (uint256 sharesBurned) {
        if (_assets == 0) revert ZeroAmount();
        if (_receiver == address(0)) revert ZeroAddress();
        if (_assets > availableLiquidity()) revert InsufficientLiquidity();

        sharesBurned = convertToShares(_assets);
        
        // Check caller has permission (must be owner for MVP)
        if (msg.sender != _owner) {
            revert InsufficientShares(); // Simplified: no allowance system
        }
        
        if (shares[_owner] < sharesBurned) revert InsufficientShares();

        // Update state
        shares[_owner] -= sharesBurned;
        totalShares -= sharesBurned;
        totalAssets -= _assets;

        // Transfer assets
        asset.safeTransfer(_receiver, _assets);

        emit Withdraw(msg.sender, _receiver, _owner, _assets, sharesBurned);
    }

    // --- LoanManager Functions ---

    /**
     * @notice Fund a loan (called by LoanManager only)
     * @param _loanId Unique loan identifier
     * @param _borrower Borrower address
     * @param _amount Amount to disburse
     */
    function fundLoan(
        uint256 _loanId,
        address _borrower,
        uint256 _amount
    ) external onlyLoanManager nonReentrant {
        if (_amount == 0) revert ZeroAmount();
        if (_amount > availableLiquidity()) revert InsufficientLiquidity();
        if (_borrower == address(0)) revert ZeroAddress();

        outstandingLoans += _amount;
        
        asset.safeTransfer(_borrower, _amount);

        emit LoanFunded(_loanId, _borrower, _amount);
    }

    /**
     * @notice Receive repayment (called by LoanManager only)
     * @param _loanId Unique loan identifier
     * @param _principalPortion Principal portion being repaid
     * @param _interestPortion Interest portion (stays in vault as earnings)
     */
    function receiveRepayment(
        uint256 _loanId,
        uint256 _principalPortion,
        uint256 _interestPortion
    ) external onlyLoanManager nonReentrant {
        // Principal reduces outstanding loans
        outstandingLoans -= _principalPortion;
        
        // Interest adds to total assets (increases share value)
        totalAssets += _interestPortion;

        emit RepaymentReceived(_loanId, _principalPortion + _interestPortion);
    }
}

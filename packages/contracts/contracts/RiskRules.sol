// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IVerification.sol";

/**
 * @title RiskRules
 * @notice Deterministic lending guardrails for loan validation
 * @dev All parameters are configurable by owner within safe bounds
 */
contract RiskRules is Ownable {
    // --- Configuration ---
    uint256 public maxBorrowerBps;      // Max % of pool per borrower (e.g., 500 = 5%)
    uint256 public maxUtilizationBps;   // Max total utilization (e.g., 8000 = 80%)
    uint256 public maxLoanDuration;     // Max loan duration in seconds
    uint256 public minAprBps;           // Min APR in basis points
    uint256 public maxAprBps;           // Max APR in basis points
    uint256 public minLoanAmount;       // Minimum loan size
    uint256 public maxLoanAmount;       // Maximum loan size
    bool public requireVerifiedBorrower;
    
    IVerification public verifier;

    // --- Events ---
    event RulesUpdated(
        uint256 maxBorrowerBps,
        uint256 maxUtilizationBps,
        uint256 maxLoanDuration,
        uint256 minAprBps,
        uint256 maxAprBps
    );
    event VerifierUpdated(address indexed verifier);
    event LoanAmountBoundsUpdated(uint256 minAmount, uint256 maxAmount);

    // --- Errors ---
    error InvalidConfiguration();

    // --- Constructor ---
    constructor(
        address _owner,
        address _verifier,
        uint256 _maxBorrowerBps,
        uint256 _maxUtilizationBps,
        uint256 _maxLoanDuration,
        uint256 _minAprBps,
        uint256 _maxAprBps,
        uint256 _minLoanAmount,
        uint256 _maxLoanAmount,
        bool _requireVerified
    ) Ownable(_owner) {
        verifier = IVerification(_verifier);
        maxBorrowerBps = _maxBorrowerBps;
        maxUtilizationBps = _maxUtilizationBps;
        maxLoanDuration = _maxLoanDuration;
        minAprBps = _minAprBps;
        maxAprBps = _maxAprBps;
        minLoanAmount = _minLoanAmount;
        maxLoanAmount = _maxLoanAmount;
        requireVerifiedBorrower = _requireVerified;
    }

    // --- Admin Functions ---

    /**
     * @notice Update risk parameters
     */
    function updateRules(
        uint256 _maxBorrowerBps,
        uint256 _maxUtilizationBps,
        uint256 _maxLoanDuration,
        uint256 _minAprBps,
        uint256 _maxAprBps
    ) external onlyOwner {
        if (_maxBorrowerBps > 10000 || _maxUtilizationBps > 10000) {
            revert InvalidConfiguration();
        }
        if (_minAprBps > _maxAprBps) {
            revert InvalidConfiguration();
        }
        
        maxBorrowerBps = _maxBorrowerBps;
        maxUtilizationBps = _maxUtilizationBps;
        maxLoanDuration = _maxLoanDuration;
        minAprBps = _minAprBps;
        maxAprBps = _maxAprBps;

        emit RulesUpdated(
            _maxBorrowerBps,
            _maxUtilizationBps,
            _maxLoanDuration,
            _minAprBps,
            _maxAprBps
        );
    }

    /**
     * @notice Update loan amount bounds
     */
    function updateLoanAmountBounds(
        uint256 _minLoanAmount,
        uint256 _maxLoanAmount
    ) external onlyOwner {
        if (_minLoanAmount > _maxLoanAmount) {
            revert InvalidConfiguration();
        }
        minLoanAmount = _minLoanAmount;
        maxLoanAmount = _maxLoanAmount;
        emit LoanAmountBoundsUpdated(_minLoanAmount, _maxLoanAmount);
    }

    /**
     * @notice Update verifier address
     */
    function setVerifier(address _verifier) external onlyOwner {
        verifier = IVerification(_verifier);
        emit VerifierUpdated(_verifier);
    }

    /**
     * @notice Toggle verification requirement
     */
    function setRequireVerified(bool _required) external onlyOwner {
        requireVerifiedBorrower = _required;
    }

    // --- Validation Function ---

    /**
     * @notice Validate a new loan request
     * @param borrower Borrower address
     * @param principal Loan principal amount
     * @param duration Loan duration in seconds
     * @param aprBps APR in basis points
     * @param poolAssets Total pool assets
     * @param poolOutstanding Current outstanding loans
     * @return ok True if loan passes all checks
     * @return reason Failure reason if not ok
     */
    function validateNewLoan(
        address borrower,
        uint256 principal,
        uint256 duration,
        uint256 aprBps,
        uint256 poolAssets,
        uint256 poolOutstanding
    ) external view returns (bool ok, string memory reason) {
        // Check borrower verification
        if (requireVerifiedBorrower && address(verifier) != address(0)) {
            if (!verifier.isVerified(borrower)) {
                return (false, "Borrower not verified");
            }
        }

        // Check loan amount bounds
        if (principal < minLoanAmount) {
            return (false, "Loan amount below minimum");
        }
        if (principal > maxLoanAmount) {
            return (false, "Loan amount above maximum");
        }

        // Check borrower cap (max % of pool)
        if (poolAssets > 0) {
            uint256 maxBorrowerAmount = (poolAssets * maxBorrowerBps) / 10000;
            if (principal > maxBorrowerAmount) {
                return (false, "Exceeds borrower cap");
            }
        }

        // Check utilization after loan
        if (poolAssets > 0) {
            uint256 newOutstanding = poolOutstanding + principal;
            uint256 newUtilization = (newOutstanding * 10000) / poolAssets;
            if (newUtilization > maxUtilizationBps) {
                return (false, "Exceeds utilization cap");
            }
        }

        // Check duration
        if (duration > maxLoanDuration) {
            return (false, "Duration exceeds maximum");
        }
        if (duration == 0) {
            return (false, "Duration cannot be zero");
        }

        // Check APR bounds
        if (aprBps < minAprBps) {
            return (false, "APR below minimum");
        }
        if (aprBps > maxAprBps) {
            return (false, "APR above maximum");
        }

        return (true, "");
    }
}

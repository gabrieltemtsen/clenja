// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IVerification
 * @notice Interface for borrower verification (SelfClaw adapter stub)
 */
interface IVerification {
    /**
     * @notice Check if a borrower is verified
     * @param borrower The address to check
     * @return verified True if the borrower is verified
     */
    function isVerified(address borrower) external view returns (bool verified);
}

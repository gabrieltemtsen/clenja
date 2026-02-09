// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IVerification.sol";

/**
 * @title MockVerifier
 * @notice Mock verifier for testing - allows owner to set verification status
 * @dev In production, this would integrate with SelfClaw
 */
contract MockVerifier is IVerification {
    mapping(address => bool) public verifiedAddresses;
    address public owner;

    event Verified(address indexed account);
    event Unverified(address indexed account);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _owner) {
        owner = _owner;
    }

    function setVerified(address _account, bool _verified) external onlyOwner {
        verifiedAddresses[_account] = _verified;
        if (_verified) {
            emit Verified(_account);
        } else {
            emit Unverified(_account);
        }
    }

    function batchSetVerified(address[] calldata _accounts, bool _verified) external onlyOwner {
        for (uint256 i = 0; i < _accounts.length; i++) {
            verifiedAddresses[_accounts[i]] = _verified;
            if (_verified) {
                emit Verified(_accounts[i]);
            } else {
                emit Unverified(_accounts[i]);
            }
        }
    }

    function isVerified(address borrower) external view override returns (bool) {
        return verifiedAddresses[borrower];
    }
}

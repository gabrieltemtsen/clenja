// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockIdentityRegistry
 * @notice A simple mock of the ERC-8004 Identity Registry for testing/hackathon on Alfajores
 */
contract MockIdentityRegistry {
    event AgentRegistered(uint256 indexed agentId, address indexed agentWallet);

    uint256 public nextAgentId = 1;
    mapping(address => uint256) public agentIds;
    mapping(uint256 => address) public agentWallets;

    function registerAgent(address agentWallet) external returns (uint256) {
        require(agentWallet != address(0), "Invalid wallet");
        require(agentIds[agentWallet] == 0, "Already registered");

        uint256 id = nextAgentId++;
        agentIds[agentWallet] = id;
        agentWallets[id] = agentWallet;

        emit AgentRegistered(id, agentWallet);
        return id;
    }

    function getAgentId(address agentWallet) external view returns (uint256) {
        return agentIds[agentWallet];
    }
}

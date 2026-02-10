import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores } from 'viem/chains';

/**
 * Get the agent's wallet client for blockchain operations.
 * 
 * SECURITY NOTE: This wallet is used for:
 * - Reading blockchain state
 * - Preparing transaction calldata
 * - Estimating gas costs
 * 
 * It is NOT used to execute transactions on behalf of users.
 * Users must sign all transactions via their connected wallet (RainbowKit).
 */
export function getAgentWalletClient() {
    if (!process.env.AGENT_WALLET_PRIVATE_KEY) {
        throw new Error('AGENT_WALLET_PRIVATE_KEY not configured in environment variables');
    }

    const account = privateKeyToAccount(
        process.env.AGENT_WALLET_PRIVATE_KEY as `0x${string}`
    );

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://alfajores-forno.celo-testnet.org';

    return createWalletClient({
        account,
        transport: http(rpcUrl),
        chain: celoAlfajores,
    });
}

import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.20",
      },
      production: {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    alfajores: {
      type: "http",
      chainType: "l1",
      url: configVariable("ALFAJORES_RPC_URL"),
      accounts: [configVariable("PRIVATE_KEY")],
    },
    celo: {
      type: "http",
      chainType: "l1",
      url: configVariable("CELO_RPC_URL"),
      accounts: [configVariable("PRIVATE_KEY")],
    },
  },
});

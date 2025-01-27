import { BN } from "@coral-xyz/anchor";
import { VaultConfig, VaultParams } from "@voltr/vault-sdk";

// ONLY NEEDED FOR INIT VAULT
export const vaultConfig: VaultConfig = {
  maxCap: new BN(0), // 100K USDC (10^6 Decimals)
  startAtTs: new BN(0),
  managerPerformanceFee: -1, // 500 = 5% in basis points
  adminPerformanceFee: -1, //
  managerManagementFee: -1, //
  adminManagementFee: -1, //
};

// ONLY NEEDED FOR INIT VAULT
export const vaultParams: VaultParams = {
  config: vaultConfig,
  name: "",
  description: "",
};

// ONLY NEEDED FOR INIT VAULT, INIT STRATEGIES, INIT DIRECT WITHDRAWS
export const adminFilePath = "/path/to/admin.json";
// ONLY NEEDED FOR DEPOSIT STRATEGY, WITHDRAW STRATEGY
export const managerFilePath = "/path/to/manager.json";
// ONLY NEEDED FOR DEPOSIT VAULT, WITHDRAW VAULT, DIRECT WITHDRAW STRATEGY
export const userFilePath = "/path/to/user.json";
export const assetMintAddress = "";
export const assetTokenProgram = ""; // TOKEN_PROGRAM_ID or TOKEN_2022_PROGRAM_ID
export const heliusRpcUrl = "";

// TO FILL UP AFTER INIT VAULT
export const vaultAddress = "";

// TO FILL UP AFTER INIT MARGINFI STRATEGY (MARGINFI SPECIFIC)
export const marginfiAccount = "";

// TAKE INTO ACCOUNT TOKEN DECIMALS 1_000_000 = 1 USDC (6 DECIMALS) LP is ALWAYS 9 DECIMALS
// ONLY NEEDED FOR DEPOSIT STRATEGY, WITHDRAW STRATEGY
export const depositAmountPerStrategy = -1;
export const withdrawAmountPerStrategy = -1;

// TAKE INTO ACCOUNT TOKEN DECIMALS 1_000_000 = 1 USDC (6 DECIMALS) LP is ALWAYS 9 DECIMALS
// ONLY NEEDED FOR DEPOSIT VAULT, WITHDRAW VAULT, DIRECT WITHDRAW STRATEGY
export const depositAmount = -1;
export const withdrawAmount = -1;

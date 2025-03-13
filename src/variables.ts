import { BN } from "@coral-xyz/anchor";
import { VaultConfig, VaultParams } from "@voltr/vault-sdk";

// ONLY NEEDED FOR INIT VAULT
export const vaultConfig: VaultConfig = {
  maxCap: new BN(100_000_000_000), // 100K USDC (10^6 Decimals)
  startAtTs: new BN(0),
  managerPerformanceFee: 500, // 500 = 5% in basis points
  adminPerformanceFee: 500, // 500 = 5% in basis points
  managerManagementFee: 0, // management fee not yet implemented
  adminManagementFee: 0, // management fee not yet implemented
  lockedProfitDegradationDuration: new BN(0),
  redemptionFee: 0,
  issuanceFee: 0,
  withdrawalWaitingPeriod: new BN(0),
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

// LUT CREATED AND EXTENDED ON INITS AND UTILISED FOR DEPOSIT AND WITHDRAW STRATEGIES
export const useLookupTable = false;
// TO FILL UP IF useLookupTable IS TRUE AFTER LUT IS CREATED
export const lookupTableAddress = "";

// TO FILL UP AFTER INIT MARGINFI STRATEGY (MARGINFI SPECIFIC)
export const marginfiAccount = "";

// TAKE INTO ACCOUNT TOKEN DECIMALS 1_000_000 = 1 USDC (6 DECIMALS) LP is ALWAYS 9 DECIMALS
// ONLY NEEDED FOR DEPOSIT STRATEGY, WITHDRAW STRATEGY
export const depositAssetAmountPerStrategy = -1;
export const withdrawAssetAmountPerStrategy = -1;
export const directWithdrawLpAmountPerStrategy = -1;

// TAKE INTO ACCOUNT TOKEN DECIMALS 1_000_000 = 1 USDC (6 DECIMALS) LP is ALWAYS 9 DECIMALS
// ONLY NEEDED FOR DEPOSIT VAULT, WITHDRAW VAULT, DIRECT WITHDRAW STRATEGY
export const depositAssetAmountVault = -1;
export const withdrawAssetAmountVault = -1;
export const withdrawLpAmountVault = -1;

// JUP SWAP SPECIFICS
export const JUP_SWAP_SLIPPAGE_BPS = 100;
export const JUP_SWAP_MAX_ACCOUNTS = 30;
export const outputMintAddress = assetMintAddress;
export const outputTokenProgram = assetTokenProgram;

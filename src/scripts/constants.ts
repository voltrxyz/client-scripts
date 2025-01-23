import { BN } from "@coral-xyz/anchor";
import { VaultConfig, VaultParams } from "@voltr/vault-sdk";

const VAULT_CONFIG: VaultConfig = {
  maxCap: new BN(0), // 100K USDC (10^6 Decimals)
  startAtTs: new BN(0),
  managerPerformanceFee: -1, // 500 = 5% in basis points
  adminPerformanceFee: -1, //
  managerManagementFee: -1, //
  adminManagementFee: -1, //
};

export const VAULT_PARAMS: VaultParams = {
  config: VAULT_CONFIG,
  name: "",
  description: "",
};

export const ADMIN_FILE_PATH = "/path/to/admin.json";
export const MANAGER_FILE_PATH = "/path/to/manager.json";
export const USER_FILE_PATH = "/path/to/user.json";
export const ASSET_MINT_ADDRESS = "";
export const HELIUS_RPC_URL = "";

export const VAULT_ADDRESS = "";

// Eg. USDC is 6 DECIMALS while LP is ALWAYS 9 DECIMALS
export const DEPOSIT_AMOUNT_PER_STRATEGY = -1;
export const WITHDRAW_AMOUNT_PER_STRATEGY = -1;
export const DEPOSIT_AMOUNT = -1;
export const WITHDRAW_AMOUNT = -1;

// ACCOUNTS FOR SOLEND
export const SOLEND_PROGRAM_ID = "So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo";
export const SOLEND_COUNTER_PARTY_TA = "";
export const SOLEND_LENDING_MARKET = "";
export const SOLEND_RESERVE = "";
export const SOLEND_COLLATERAL_MINT = "";
export const SOLEND_PYTH_ORACLE = "";
export const SOLEND_SWITCHBOARD_ORACLE = "";

// ACCOUNTS FOR MARGINFI
export const MARGINFI_PROGRAM_ID =
  "MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA";
export const MARGINFI_BANK = "";
export const MARGINFI_GROUP = "";
export const MARGINFI_ACCOUNT = "";
export const MARGINFI_PYTH_ORACLE = "";

// ACCOUNTS FOR KLEND
export const KLEND_PROGRAM_ID = "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD";
export const KLEND_LENDING_MARKET = "";
export const KLEND_RESERVE = "";
export const KLEND_SCOPE_ORACLE = "";

// ACCOUNTS FOR DRIFT
export const DRIFT_PROGRAM_ID = "dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH";
export const DRIFT_STATE = "";
export const DRIFT_MARKET_INDEX = -1;
export const DRIFT_ORACLE = "";

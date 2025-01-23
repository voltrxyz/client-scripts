# Voltr Client Scripts

Scripts for interacting with Voltr vault protocol on Solana.

## Prerequisites

- Node.js v18+
- pnpm
- Solana keypairs for admin, manager, and user roles
- Helius RPC URL

## Installation

```bash
pnpm install
```

## Configuration

1. Create keypair JSON files for admin, manager, and user
2. Update `src/scripts/constants.ts`:

   ```typescript
   export const ADMIN_FILE_PATH = "/path/to/admin.json";
   export const MANAGER_FILE_PATH = "/path/to/manager.json";
   export const USER_FILE_PATH = "/path/to/user.json";
   export const HELIUS_RPC_URL = "your-helius-rpc-url";
   export const ASSET_MINT_ADDRESS = "your-asset-mint";
   ```

3. Set vault parameters in `constants.ts`:
   ```typescript
   export const VAULT_PARAMS = {
     config: {
       maxCap: new BN("amount"),
       startAtTs: new BN("timestamp"),
       managerPerformanceFee: fee,
       adminPerformanceFee: fee,
       managerManagementFee: fee,
       adminManagementFee: fee,
     },
     name: "vault-name",
     description: "vault-description",
   };
   ```

## Usage Flow

1. Initialize vault (admin):

   ```bash
   pnpm ts-node src/scripts/admin-init-vault.ts
   ```

2. Initialize strategies (admin):

   ```bash
   pnpm ts-node src/scripts/admin-init-strategies.ts
   ```

3. Initialize direct withdraw (admin):

   ```bash
   pnpm ts-node src/scripts/admin-init-direct-withdraw.ts
   ```

4. Deposit into vault (user):

   ```bash
   pnpm ts-node src/scripts/user-deposit-vault.ts
   ```

5. Manager operations:

   ```bash
   # Deposit into strategies
   pnpm ts-node src/scripts/manager-deposit-strategies.ts

   # Withdraw from strategies
   pnpm ts-node src/scripts/manager-withdraw-strategies.ts
   ```

6. User withdrawals:

   ```bash
   # Direct withdraw from strategies
   pnpm ts-node src/scripts/user-direct-withdraw-strategies.ts

   # Withdraw from vault
   pnpm ts-node src/scripts/user-withdraw-vault.ts
   ```

## Protocol Integration Details

Supports integrations with:

- Solend
- Marginfi
- Klend
- Drift

Each protocol requires specific accounts to be configured in `constants.ts`.

## Development

Add script:

```bash
pnpm add -D typescript ts-node @types/node
```

Add dependencies:

```bash
pnpm add @coral-xyz/anchor @solana/web3.js @solana/spl-token @voltr/vault-sdk
```

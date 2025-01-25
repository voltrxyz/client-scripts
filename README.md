# Voltr Client Scripts

A collection of scripts for interacting with the Voltr Vault protocol on Solana. These scripts handle vault initialization, strategy setup, deposits, and withdrawals (both from the vault and directly from strategies). The project supports integrations with **Solend**, **Marginfi**, **Klend**, and **Drift**.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
  - [Keypairs](#keypairs)
  - [Constants](#constants)
  - [Variables](#variables)
- [Usage Flow](#usage-flow)
  - [1. Initialize Vault (Admin)](#1-initialize-vault-admin)
  - [2. Initialize Strategies (Admin)](#2-initialize-strategies-admin)
  - [3. Initialize Direct Withdraw (Admin)](#3-initialize-direct-withdraw-admin)
  - [4. Deposit into Vault (User)](#4-deposit-into-vault-user)
  - [5. Manager Operations](#5-manager-operations)
    - [Deposit into Strategies](#deposit-into-strategies)
    - [Withdraw from Strategies](#withdraw-from-strategies)
  - [6. User Withdrawals](#6-user-withdrawals)
    - [Direct Withdraw from Strategies](#direct-withdraw-from-strategies)
    - [Withdraw from Vault](#withdraw-from-vault)
- [Script Reference](#script-reference)
- [Protocol Integration Details](#protocol-integration-details)
- [Development](#development)

---

## Prerequisites

1. **Node.js v18+**  
   Ensure that your Node.js environment is at least version 18 or higher.

2. **pnpm**  
   This project uses pnpm for package management. You can install it [here](https://pnpm.io/installation).

3. **Solana Keypairs**  
   You must have three keypair JSON files (each representing a Solana account) for the following roles:

   - **Admin**
   - **Manager**
   - **User**

4. **Helius RPC URL**  
   You must have a Helius RPC URL (or any Solana RPC endpoint) to connect to the Solana blockchain.

---

## Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/<your-org>/voltr-client-scripts.git
   cd voltr-client-scripts
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

---

## Configuration

### Keypairs

1. Create/Obtain three keypair files and store them somewhere on your local file system. For example:

   - `/path/to/admin.json`
   - `/path/to/manager.json`
   - `/path/to/user.json`

2. **Important**: For security, do not commit private key JSON files into version control. Keep them in a secure location.

### Constants

All constants for Solend, Marginfi, Klend, and Drift are stored in:

```bash
src/constants
├── solend.ts
├── marginfi.ts
├── klend.ts
├── drift.ts
└── index.ts
```

These files specify each protocol's relevant addresses on mainnet-beta (or whichever environment you are using). Adjust them only if you know you need a different cluster or custom addresses.

### Variables

The main user-facing configuration lies in:

```bash
src/variables.ts
```

Within this file, you must update:

- **`adminFilePath`** – points to the Admin's JSON keypair file.
- **`managerFilePath`** – points to the Manager's JSON keypair file.
- **`userFilePath`** – points to the User's JSON keypair file.
- **`heliusRpcUrl`** – your Helius RPC endpoint (or any Solana RPC).
- **`assetMintAddress`** – the mint address of the token asset used in the vault (e.g., a USDC mint).
- **`vaultAddress`** – after you initialize a vault, add the vault’s public key here so that other scripts know which vault to interact with.
- **`marginfiAccount`** – if you created a Marginfi strategy, copy the printed marginfi account’s address into this variable.

You will also find placeholders for deposit/withdraw amounts. Adjust these as needed, paying attention to token decimals. For example, 1 USDC with 6 decimals would be `1_000_000`.

---

## Usage Flow

All scripts are stored in the `src/scripts` directory. Below is the recommended step-by-step usage flow to stand up a new vault, set up strategies, and interact with them.

1. ### Initialize Vault (Admin)

   Creates and initializes a new vault with the specified configuration. Also adds an adaptor to let the vault interact with the strategies.

   ```bash
   pnpm ts-node src/scripts/admin-init-vault.ts
   ```

   - **Output**:
     - Transaction signature for the vault initialization.
     - The newly created Vault’s public key (copy this key and put it into `vaultAddress` in `variables.ts`).

2. ### Initialize Strategies (Admin)

   Sets up each strategy (Solend, Marginfi, Klend, Drift, etc.) for the newly created vault. If you want to skip any protocol, comment out or remove the relevant lines in the script.

   ```bash
   pnpm ts-node src/scripts/admin-init-strategies.ts
   ```

   - **Marginfi**:
     - After each Marginfi strategy initialization, the script logs the newly created Marginfi account. Copy that account address into `variables.ts` under `marginfiAccount`.
   - **Klend** / **Drift**: No extra manual updates needed, but confirm each transaction’s success.

3. ### Initialize Direct Withdraw (Admin)

   Enables "direct withdrawal" functionality for each strategy. This is optional but useful if you want users to withdraw strategy funds directly rather than waiting on the manager to withdraw them back to the vault.

   ```bash
   pnpm ts-node src/scripts/admin-init-direct-withdraw.ts
   ```

4. ### Deposit into Vault (User)

   The user deposits their tokens into the vault to receive LP tokens. Make sure you have set the `assetMintAddress` and enough tokens in your user wallet.

   ```bash
   pnpm ts-node src/scripts/user-deposit-vault.ts
   ```

5. ### Manager Operations

   Manager deposits/withdraws from each strategy on behalf of the vault. This is how yield is generated or rebalanced.

   #### Deposit into Strategies

   ```bash
   pnpm ts-node src/scripts/manager-deposit-strategies.ts
   ```

   #### Withdraw from Strategies

   ```bash
   pnpm ts-node src/scripts/manager-withdraw-strategies.ts
   ```

6. ### User Withdrawals

   #### Direct Withdraw from Strategies

   If direct-withdraw was initialized, users can withdraw strategy funds directly without waiting on the manager.

   ```bash
   pnpm ts-node src/scripts/user-direct-withdraw-strategies.ts
   ```

   #### Withdraw from Vault

   The user withdraws from the vault, burning their vault LP tokens in exchange for the underlying asset.

   ```bash
   pnpm ts-node src/scripts/user-withdraw-vault.ts
   ```

---

## Script Reference

Below is a summary of each script for convenience:

- **`admin-init-vault.ts`**  
  Initializes a new vault, specifying manager/admin keys and vault config.

- **`admint-update-vault.ts`**
  Updates the vault's config.

- **`admin-init-strategies.ts`**  
  Creates and initializes strategies across supported protocols.

- **`admin-init-direct-withdraw.ts`**  
  Enables direct withdraw for each protocol strategy.

- **`user-deposit-vault.ts`**  
  User deposits the vault’s asset to receive vault LP tokens.

- **`manager-deposit-strategies.ts`**  
  Manager deposits the vault’s funds into various strategies.

- **`manager-withdraw-strategies.ts`**  
  Manager withdraws strategy funds back to the vault.

- **`user-direct-withdraw-strategies.ts`**  
  User directly withdraws strategy funds (if configured).

- **`user-withdraw-vault.ts`**  
  User withdraws from the vault, swapping LP tokens back to the vault’s base asset.

- **`all-query-strategy-positions.ts`**
  Queries the positions of all strategies and prints them to the console.

---

## Protocol Integration Details

This project currently supports the following protocols:

| **Token** | **Solend**  | **Marginfi** | **Drift**   | **Klend**                                                      |
| --------- | ----------- | ------------ | ----------- | -------------------------------------------------------------- |
| **SOL**   | Main Market | Main Market  | Spot Market | Main Market <br> Jito Market                                   |
| **USDC**  | Main Market | Main Market  | Spot Market | Main Market <br> Alt Market <br> JLP Market                    |
| **USDT**  | Main Market | Main Market  | Spot Market | Main Market <br> JLP Market                                    |
| **PYUSD** | —           | Main Market  | Spot Market | Main Market <br> Alt Market <br> JLP Market <br> Ethena Market |
| **USDS**  | Main Market | Main Market  | Spot Market | Main Market                                                    |

1. **Solend**  
   Constants and addresses in `src/constants/solend.ts`.
2. **Marginfi**  
   Constants and addresses in `src/constants/marginfi.ts`.  
   Requires setting the `marginfiAccount` after initialization.
3. **Klend**  
   Constants and addresses in `src/constants/klend.ts`.  
   Relies on scope oracle addresses for interest calculations.
4. **Drift**  
   Constants and addresses in `src/constants/drift.ts`.  
   For spot market interactions, uses user stats and user accounts derived from seeds.

You can remove, add, or modify protocols in `src/constants/` if needed.

---

## Development

If you need to add or modify scripts, here are some helpful tips:

1. **Add TypeScript & Node deps**:

   ```bash
   pnpm add -D typescript ts-node @types/node
   ```

2. **Add required Solana & Vault dependencies**:

   ```bash
   pnpm add @coral-xyz/anchor @solana/web3.js @solana/spl-token @voltr/vault-sdk
   ```

3. **Project Structure**:

   ```
   src
   ├── constants
   │   ├── solend.ts
   │   ├── marginfi.ts
   │   ├── klend.ts
   │   ├── drift.ts
   │   └── index.ts
   ├── helper.ts
   ├── scripts
   │   ├── admin-init-vault.ts
   │   ├── admin-init-strategies.ts
   │   ├── admin-init-direct-withdraw.ts
   │   ├── manager-deposit-strategies.ts
   │   ├── manager-withdraw-strategies.ts
   │   ├── user-deposit-vault.ts
   │   ├── user-direct-withdraw-strategies.ts
   │   ├── user-withdraw-vault.ts
   └── variables.ts
   ```

   - **`helper.ts`** – Defines helper functions like `sendAndConfirmOptimisedTx` for sending high-compute transactions.
   - **`constants/`** – Protocol addresses and config constants.
   - **`scripts/`** – Top-level scripts to run from CLI (manager, admin, user flows).
   - **`variables.ts`** – Parameterization for key file paths, token amounts, vault addresses, etc.

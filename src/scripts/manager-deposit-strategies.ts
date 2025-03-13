import * as fs from "fs";
import {
  AddressLookupTableAccount,
  Connection,
  Keypair,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { sendAndConfirmOptimisedTx, setupTokenAccount } from "../utils/helper";
import { BN } from "@coral-xyz/anchor";
import {
  LENDING_ADAPTOR_PROGRAM_ID,
  SEEDS,
  VoltrClient,
} from "@voltr/vault-sdk";
import {
  assetMintAddress,
  depositAssetAmountPerStrategy,
  heliusRpcUrl,
  managerFilePath,
  marginfiAccount,
  vaultAddress,
  assetTokenProgram,
  outputMintAddress,
  outputTokenProgram,
  lookupTableAddress,
  useLookupTable,
} from "../variables";
import { PROTOCOL_CONSTANTS } from "../constants";
import { setupJupiterSwapForDepositStrategy } from "../utils/setup-jupiter-swap";

const payerKpFile = fs.readFileSync(managerFilePath, "utf-8");
const payerKpData = JSON.parse(payerKpFile);
const payerSecret = Uint8Array.from(payerKpData);
const payerKp = Keypair.fromSecretKey(payerSecret);
const payer = payerKp.publicKey;

const vault = new PublicKey(vaultAddress);
const vaultAssetMint = new PublicKey(assetMintAddress);
const vaultAssetTokenProgram = new PublicKey(assetTokenProgram);
const vaultOutputMint = new PublicKey(outputMintAddress);

const connection = new Connection(heliusRpcUrl);
const vc = new VoltrClient(connection);
const depositAmount = new BN(depositAssetAmountPerStrategy);

const depositSolendStrategy = async (
  protocolProgram: PublicKey,
  counterPartyTa: PublicKey,
  lendingMarket: PublicKey,
  reserve: PublicKey,
  collateralMint: PublicKey,
  pythOracle: PublicKey,
  switchboardOracle: PublicKey,
  lookupTableAddresses: string[] = []
) => {
  const [strategy] = PublicKey.findProgramAddressSync(
    [SEEDS.STRATEGY, counterPartyTa.toBuffer()],
    LENDING_ADAPTOR_PROGRAM_ID
  );

  const [lendingMarketAuthority] = PublicKey.findProgramAddressSync(
    [lendingMarket.toBytes()],
    protocolProgram
  );

  const { vaultStrategyAuth } = vc.findVaultStrategyAddresses(vault, strategy);

  let transactionIxs: TransactionInstruction[] = [];

  const vaultCollateralAta = await setupTokenAccount(
    connection,
    payer,
    collateralMint,
    vaultStrategyAuth,
    transactionIxs
  );

  const _vaultStrategyAssetAta = await setupTokenAccount(
    connection,
    payer,
    vaultAssetMint,
    vaultStrategyAuth,
    transactionIxs,
    vaultAssetTokenProgram
  );

  // Prepare the remaining accounts
  const remainingAccounts = [
    { pubkey: counterPartyTa, isSigner: false, isWritable: true },
    { pubkey: protocolProgram, isSigner: false, isWritable: false },
    { pubkey: vaultCollateralAta, isSigner: false, isWritable: true },
    { pubkey: reserve, isSigner: false, isWritable: true },
    { pubkey: collateralMint, isSigner: false, isWritable: true },
    { pubkey: lendingMarket, isSigner: false, isWritable: true },
    {
      pubkey: lendingMarketAuthority,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: pythOracle, isSigner: false, isWritable: false },
    { pubkey: switchboardOracle, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  let additionalArgs = Buffer.from([]); // No base additional args for Solend
  let addressLookupTableAccounts: AddressLookupTableAccount[] = [];

  if (outputMintAddress !== assetMintAddress) {
    const {
      additionalArgs: additionalArgsTemp,
      addressLookupTableAccounts: addressLookupTableAccountsTemp,
    } = await setupJupiterSwapForDepositStrategy(
      connection,
      depositAmount,
      payer,
      vaultStrategyAuth,
      additionalArgs,
      remainingAccounts,
      transactionIxs,
      lookupTableAddresses
    );
    additionalArgs = additionalArgsTemp;
    addressLookupTableAccounts = addressLookupTableAccountsTemp;
  }

  const createDepositStrategyIx = await vc.createDepositStrategyIx(
    {
      depositAmount,
      additionalArgs,
    },
    {
      manager: payer,
      vault,
      vaultAssetMint,
      assetTokenProgram: new PublicKey(assetTokenProgram),
      strategy,
      remainingAccounts,
    }
  );

  transactionIxs.push(createDepositStrategyIx);

  const txSig = await sendAndConfirmOptimisedTx(
    transactionIxs,
    heliusRpcUrl,
    payerKp,
    [],
    addressLookupTableAccounts
  );
  console.log("Solend strategy deposited with signature:", txSig);
};

const depositMarginfiStrategy = async (
  protocolProgram: PublicKey,
  bank: PublicKey,
  marginfiAccount: PublicKey,
  marginfiGroup: PublicKey,
  lookupTableAddresses: string[] = []
) => {
  const [counterPartyTa] = PublicKey.findProgramAddressSync(
    [Buffer.from("liquidity_vault"), bank.toBuffer()],
    protocolProgram
  );

  const [strategy] = PublicKey.findProgramAddressSync(
    [SEEDS.STRATEGY, counterPartyTa.toBuffer()],
    LENDING_ADAPTOR_PROGRAM_ID
  );

  const { vaultStrategyAuth } = vc.findVaultStrategyAddresses(vault, strategy);

  let transactionIxs: TransactionInstruction[] = [];

  const _vaultStrategyAssetAta = await setupTokenAccount(
    connection,
    payer,
    vaultAssetMint,
    vaultStrategyAuth,
    transactionIxs,
    vaultAssetTokenProgram
  );

  // Prepare the remaining accounts
  const remainingAccounts = [
    { pubkey: counterPartyTa, isSigner: false, isWritable: true },
    { pubkey: protocolProgram, isSigner: false, isWritable: false },
    { pubkey: marginfiGroup, isSigner: false, isWritable: true },
    { pubkey: marginfiAccount, isSigner: false, isWritable: true },
    { pubkey: bank, isSigner: false, isWritable: true },
  ];

  let additionalArgs = Buffer.from([]); // No base additional args for Marginfi
  let addressLookupTableAccounts: AddressLookupTableAccount[] = [];

  if (outputMintAddress !== assetMintAddress) {
    const {
      additionalArgs: additionalArgsTemp,
      addressLookupTableAccounts: addressLookupTableAccountsTemp,
    } = await setupJupiterSwapForDepositStrategy(
      connection,
      depositAmount,
      payer,
      vaultStrategyAuth,
      additionalArgs,
      remainingAccounts,
      transactionIxs,
      lookupTableAddresses
    );
    additionalArgs = additionalArgsTemp;
    addressLookupTableAccounts = addressLookupTableAccountsTemp;
  }

  const createDepositStrategyIx = await vc.createDepositStrategyIx(
    {
      depositAmount,
      additionalArgs,
    },
    {
      manager: payer,
      vault,
      vaultAssetMint,
      assetTokenProgram: new PublicKey(assetTokenProgram),
      strategy,
      remainingAccounts,
    }
  );

  transactionIxs.push(createDepositStrategyIx);

  const txSig = await sendAndConfirmOptimisedTx(
    transactionIxs,
    heliusRpcUrl,
    payerKp,
    [],
    addressLookupTableAccounts
  );
  console.log("Marginfi strategy deposited with signature:", txSig);
};

const depositKlendStrategy = async (
  protocolProgram: PublicKey,
  lendingMarket: PublicKey,
  reserve: PublicKey,
  scopePrices: PublicKey,
  lookupTableAddresses: string[] = []
) => {
  const [lendingMarketAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("lma"), lendingMarket.toBuffer()],
    protocolProgram
  );

  const [counterPartyTa] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("reserve_liq_supply"),
      lendingMarket.toBuffer(),
      vaultOutputMint.toBuffer(),
    ],
    protocolProgram
  );

  const [strategy] = PublicKey.findProgramAddressSync(
    [SEEDS.STRATEGY, counterPartyTa.toBuffer()],
    LENDING_ADAPTOR_PROGRAM_ID
  );

  const { vaultStrategyAuth } = vc.findVaultStrategyAddresses(vault, strategy);
  const [reserveCollateralMint] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("reserve_coll_mint"),
      lendingMarket.toBuffer(),
      vaultOutputMint.toBuffer(),
    ],
    protocolProgram
  );

  let transactionIxs: TransactionInstruction[] = [];

  const userDestinationCollateral = await setupTokenAccount(
    connection,
    payer,
    reserveCollateralMint,
    vaultStrategyAuth,
    transactionIxs
  );

  const _vaultStrategyAssetAta = await setupTokenAccount(
    connection,
    payer,
    vaultAssetMint,
    vaultStrategyAuth,
    transactionIxs,
    vaultAssetTokenProgram
  );

  // Prepare the remaining accounts
  const remainingAccounts = [
    { pubkey: counterPartyTa, isSigner: false, isWritable: true },
    { pubkey: protocolProgram, isSigner: false, isWritable: false },
    { pubkey: lendingMarket, isSigner: false, isWritable: false },
    { pubkey: lendingMarketAuthority, isSigner: false, isWritable: true },
    { pubkey: reserve, isSigner: false, isWritable: true },
    { pubkey: reserveCollateralMint, isSigner: false, isWritable: true },
    {
      pubkey: userDestinationCollateral,
      isSigner: false,
      isWritable: true,
    },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    {
      pubkey: SYSVAR_INSTRUCTIONS_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: scopePrices, isSigner: false, isWritable: false },
  ];

  let additionalArgs = Buffer.from([]); // No base additional args for Klend
  let addressLookupTableAccounts: AddressLookupTableAccount[] = [];

  if (outputMintAddress !== assetMintAddress) {
    const {
      additionalArgs: additionalArgsTemp,
      addressLookupTableAccounts: addressLookupTableAccountsTemp,
    } = await setupJupiterSwapForDepositStrategy(
      connection,
      depositAmount,
      payer,
      vaultStrategyAuth,
      additionalArgs,
      remainingAccounts,
      transactionIxs,
      lookupTableAddresses
    );
    additionalArgs = additionalArgsTemp;
    addressLookupTableAccounts = addressLookupTableAccountsTemp;
  }

  const createDepositStrategyIx = await vc.createDepositStrategyIx(
    {
      depositAmount,
      additionalArgs,
    },
    {
      manager: payer,
      vault,
      vaultAssetMint,
      assetTokenProgram: new PublicKey(assetTokenProgram),
      strategy,
      remainingAccounts,
    }
  );

  transactionIxs.push(createDepositStrategyIx);

  const txSig = await sendAndConfirmOptimisedTx(
    transactionIxs,
    heliusRpcUrl,
    payerKp,
    [],
    addressLookupTableAccounts
  );
  console.log("Klend strategy deposited with signature:", txSig);
};

const depositDriftStrategy = async (
  protocolProgram: PublicKey,
  state: PublicKey,
  marketIndex: BN,
  subAccountId: BN,
  oracle: PublicKey,
  lookupTableAddresses: string[] = []
) => {
  const [counterPartyTa] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("spot_market_vault"),
      marketIndex.toArrayLike(Buffer, "le", 2),
    ],
    protocolProgram
  );

  const [strategy] = PublicKey.findProgramAddressSync(
    [SEEDS.STRATEGY, counterPartyTa.toBuffer()],
    LENDING_ADAPTOR_PROGRAM_ID
  );

  const { vaultStrategyAuth } = vc.findVaultStrategyAddresses(vault, strategy);
  const [userStats] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_stats"), vaultStrategyAuth.toBuffer()],
    protocolProgram
  );

  const [user] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("user"),
      vaultStrategyAuth.toBuffer(),
      subAccountId.toArrayLike(Buffer, "le", 2),
    ],
    protocolProgram
  );
  const [spotMarket] = PublicKey.findProgramAddressSync(
    [Buffer.from("spot_market"), marketIndex.toArrayLike(Buffer, "le", 2)],
    protocolProgram
  );

  let transactionIxs: TransactionInstruction[] = [];

  const _vaultStrategyAssetAta = await setupTokenAccount(
    connection,
    payer,
    vaultAssetMint,
    vaultStrategyAuth,
    transactionIxs,
    vaultAssetTokenProgram
  );

  // Prepare the remaining accounts
  const remainingAccounts = [
    { pubkey: counterPartyTa, isSigner: false, isWritable: true },
    { pubkey: protocolProgram, isSigner: false, isWritable: false },
    { pubkey: state, isSigner: false, isWritable: false },
    { pubkey: user, isSigner: false, isWritable: true },
    { pubkey: userStats, isSigner: false, isWritable: true },
    { pubkey: oracle, isSigner: false, isWritable: false },
    { pubkey: spotMarket, isSigner: false, isWritable: true },
  ];

  let additionalArgs = Buffer.from([
    ...marketIndex.toArrayLike(Buffer, "le", 2),
  ]);
  let addressLookupTableAccounts: AddressLookupTableAccount[] = [];

  if (outputMintAddress !== assetMintAddress) {
    const {
      additionalArgs: additionalArgsTemp,
      addressLookupTableAccounts: addressLookupTableAccountsTemp,
    } = await setupJupiterSwapForDepositStrategy(
      connection,
      depositAmount,
      payer,
      vaultStrategyAuth,
      additionalArgs,
      remainingAccounts,
      transactionIxs,
      lookupTableAddresses
    );
    additionalArgs = additionalArgsTemp;
    addressLookupTableAccounts = addressLookupTableAccountsTemp;
  }

  const createDepositStrategyIx = await vc.createDepositStrategyIx(
    {
      depositAmount,
      additionalArgs,
    },
    {
      manager: payer,
      vault,
      vaultAssetMint,
      assetTokenProgram: new PublicKey(assetTokenProgram),
      strategy,
      remainingAccounts,
    }
  );

  transactionIxs.push(createDepositStrategyIx);

  const txSig = await sendAndConfirmOptimisedTx(
    transactionIxs,
    heliusRpcUrl,
    payerKp,
    [],
    addressLookupTableAccounts
  );
  console.log("Drift strategy deposited with signature:", txSig);
};

const main = async () => {
  await depositSolendStrategy(
    new PublicKey(PROTOCOL_CONSTANTS.SOLEND.PROGRAM_ID),
    new PublicKey(PROTOCOL_CONSTANTS.SOLEND.MAIN_MARKET.USDC.COUNTERPARTY_TA),
    new PublicKey(PROTOCOL_CONSTANTS.SOLEND.MAIN_MARKET.LENDING_MARKET),
    new PublicKey(PROTOCOL_CONSTANTS.SOLEND.MAIN_MARKET.USDC.RESERVE),
    new PublicKey(PROTOCOL_CONSTANTS.SOLEND.MAIN_MARKET.USDC.COLLATERAL_MINT),
    new PublicKey(PROTOCOL_CONSTANTS.SOLEND.MAIN_MARKET.USDC.PYTH_ORACLE),
    new PublicKey(
      PROTOCOL_CONSTANTS.SOLEND.MAIN_MARKET.USDC.SWITCHBOARD_ORACLE
    ),
    useLookupTable
      ? [
          ...PROTOCOL_CONSTANTS.SOLEND.LOOKUP_TABLE_ADDRESSES,
          lookupTableAddress,
        ]
      : [...PROTOCOL_CONSTANTS.SOLEND.LOOKUP_TABLE_ADDRESSES]
  );
  await depositMarginfiStrategy(
    new PublicKey(PROTOCOL_CONSTANTS.MARGINFI.PROGRAM_ID),
    new PublicKey(PROTOCOL_CONSTANTS.MARGINFI.MAIN_MARKET.USDC.BANK),
    new PublicKey(marginfiAccount),
    new PublicKey(PROTOCOL_CONSTANTS.MARGINFI.MAIN_MARKET.GROUP),
    useLookupTable
      ? [
          ...PROTOCOL_CONSTANTS.MARGINFI.LOOKUP_TABLE_ADDRESSES,
          lookupTableAddress,
        ]
      : [...PROTOCOL_CONSTANTS.MARGINFI.LOOKUP_TABLE_ADDRESSES]
  );
  await depositKlendStrategy(
    new PublicKey(PROTOCOL_CONSTANTS.KLEND.PROGRAM_ID),
    new PublicKey(PROTOCOL_CONSTANTS.KLEND.MAIN_MARKET.LENDING_MARKET),
    new PublicKey(PROTOCOL_CONSTANTS.KLEND.MAIN_MARKET.USDC.RESERVE),
    new PublicKey(PROTOCOL_CONSTANTS.KLEND.SCOPE_ORACLE),
    useLookupTable
      ? [...PROTOCOL_CONSTANTS.KLEND.LOOKUP_TABLE_ADDRESSES, lookupTableAddress]
      : [...PROTOCOL_CONSTANTS.KLEND.LOOKUP_TABLE_ADDRESSES]
  );
  await depositDriftStrategy(
    new PublicKey(PROTOCOL_CONSTANTS.DRIFT.PROGRAM_ID),
    new PublicKey(PROTOCOL_CONSTANTS.DRIFT.SPOT.STATE),
    new BN(PROTOCOL_CONSTANTS.DRIFT.SPOT.USDC.MARKET_INDEX),
    new BN(PROTOCOL_CONSTANTS.DRIFT.SUB_ACCOUNT_ID),
    new PublicKey(PROTOCOL_CONSTANTS.DRIFT.SPOT.USDC.ORACLE),
    useLookupTable
      ? [...PROTOCOL_CONSTANTS.DRIFT.LOOKUP_TABLE_ADDRESSES, lookupTableAddress]
      : [...PROTOCOL_CONSTANTS.DRIFT.LOOKUP_TABLE_ADDRESSES]
  );
};

main();

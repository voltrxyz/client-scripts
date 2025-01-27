import * as fs from "fs";
import {
  Connection,
  Keypair,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { sendAndConfirmOptimisedTx } from "../helper";
import { BN } from "@coral-xyz/anchor";
import {
  DEFAULT_ADAPTOR_PROGRAM_ID,
  SEEDS,
  VoltrClient,
} from "@voltr/vault-sdk";
import {
  managerFilePath,
  marginfiAccount,
  heliusRpcUrl,
  vaultAddress,
  withdrawAmountPerStrategy,
  assetMintAddress,
  assetTokenProgram,
} from "../variables";
import { PROTOCOL_CONSTANTS } from "../constants";

const payerKpFile = fs.readFileSync(managerFilePath, "utf-8");
const payerKpData = JSON.parse(payerKpFile);
const payerSecret = Uint8Array.from(payerKpData);
const payerKp = Keypair.fromSecretKey(payerSecret);
const payer = payerKp.publicKey;

const vault = new PublicKey(vaultAddress);
const vaultAssetMint = new PublicKey(assetMintAddress);

const connection = new Connection(heliusRpcUrl);
const vc = new VoltrClient(connection);
const withdrawAmount = new BN(withdrawAmountPerStrategy);

const withdrawSolendStrategy = async (
  protocolProgram: PublicKey,
  counterPartyTa: PublicKey,
  lendingMarket: PublicKey,
  reserve: PublicKey,
  collateralMint: PublicKey,
  pythOracle: PublicKey,
  switchboardOracle: PublicKey
) => {
  const [strategy] = PublicKey.findProgramAddressSync(
    [SEEDS.STRATEGY, counterPartyTa.toBuffer()],
    DEFAULT_ADAPTOR_PROGRAM_ID
  );

  const { vaultStrategyAuth } = vc.findVaultStrategyAddresses(vault, strategy);

  const vaultCollateralAta = getAssociatedTokenAddressSync(
    collateralMint,
    vaultStrategyAuth,
    true
  );

  const vaultCollateralAtaAccount = await connection.getAccountInfo(
    vaultCollateralAta
  );

  let transactionIxs: TransactionInstruction[] = [];
  if (!vaultCollateralAtaAccount) {
    const createVaultCollateralAtaIx = createAssociatedTokenAccountInstruction(
      payer,
      vaultCollateralAta,
      vaultStrategyAuth,
      collateralMint
    );
    transactionIxs.push(createVaultCollateralAtaIx);
  }

  const vaultStrategyAssetAta = getAssociatedTokenAddressSync(
    vaultAssetMint,
    vaultStrategyAuth,
    true
  );

  const vaultStrategyAssetAtaAccount = await connection.getAccountInfo(
    vaultStrategyAssetAta
  );

  if (!vaultStrategyAssetAtaAccount) {
    const createVaultStrategyAssetAtaIx =
      createAssociatedTokenAccountInstruction(
        payer,
        vaultStrategyAssetAta,
        vaultStrategyAuth,
        vaultAssetMint
      );
    transactionIxs.push(createVaultStrategyAssetAtaIx);
  }

  const counterPartyTaAuth = await getAccount(
    connection,
    counterPartyTa,
    "confirmed"
  ).then((account) => account.owner);

  const createWithdrawStrategyIx = await vc.createWithdrawStrategyIx(
    { withdrawAmount },
    {
      manager: payer,
      vault,
      vaultAssetMint,
      assetTokenProgram: new PublicKey(assetTokenProgram),
      strategy,
      remainingAccounts: [
        { pubkey: counterPartyTaAuth, isSigner: false, isWritable: true },
        { pubkey: counterPartyTa, isSigner: false, isWritable: true },
        { pubkey: protocolProgram, isSigner: false, isWritable: false },
        { pubkey: vaultCollateralAta, isSigner: false, isWritable: true },
        { pubkey: reserve, isSigner: false, isWritable: true },
        { pubkey: collateralMint, isSigner: false, isWritable: true },
        { pubkey: lendingMarket, isSigner: false, isWritable: true },
        { pubkey: pythOracle, isSigner: false, isWritable: false },
        { pubkey: switchboardOracle, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
    }
  );

  transactionIxs.push(createWithdrawStrategyIx);

  const txSig = await sendAndConfirmOptimisedTx(
    transactionIxs,
    heliusRpcUrl,
    payerKp
  );
  console.log("Solend strategy withdrawn with signature:", txSig);
};

const withdrawMarginfiStrategy = async (
  protocolProgram: PublicKey,
  bank: PublicKey,
  marginfiAccount: PublicKey,
  marginfiGroup: PublicKey,
  oracle: PublicKey
) => {
  const [counterPartyTa] = PublicKey.findProgramAddressSync(
    [Buffer.from("liquidity_vault"), bank.toBuffer()],
    protocolProgram
  );

  const [strategy] = PublicKey.findProgramAddressSync(
    [SEEDS.STRATEGY, counterPartyTa.toBuffer()],
    DEFAULT_ADAPTOR_PROGRAM_ID
  );

  const { vaultStrategyAuth } = vc.findVaultStrategyAddresses(vault, strategy);

  let transactionIxs: TransactionInstruction[] = [];

  const vaultStrategyAssetAta = getAssociatedTokenAddressSync(
    vaultAssetMint,
    vaultStrategyAuth,
    true
  );

  const vaultStrategyAssetAtaAccount = await connection.getAccountInfo(
    vaultStrategyAssetAta
  );

  if (!vaultStrategyAssetAtaAccount) {
    const createVaultStrategyAssetAtaIx =
      createAssociatedTokenAccountInstruction(
        payer,
        vaultStrategyAssetAta,
        vaultStrategyAuth,
        vaultAssetMint
      );
    transactionIxs.push(createVaultStrategyAssetAtaIx);
  }

  const counterPartyTaAuth = await getAccount(
    connection,
    counterPartyTa,
    "confirmed"
  ).then((account) => account.owner);

  const createWithdrawStrategyIx = await vc.createWithdrawStrategyIx(
    { withdrawAmount },
    {
      manager: payer,
      vault,
      vaultAssetMint,
      assetTokenProgram: new PublicKey(assetTokenProgram),
      strategy,
      remainingAccounts: [
        { pubkey: counterPartyTaAuth, isSigner: false, isWritable: true },
        { pubkey: counterPartyTa, isSigner: false, isWritable: true },
        { pubkey: protocolProgram, isSigner: false, isWritable: false },
        { pubkey: marginfiGroup, isSigner: false, isWritable: true },
        { pubkey: marginfiAccount, isSigner: false, isWritable: true },
        { pubkey: bank, isSigner: false, isWritable: true },
        { pubkey: oracle, isSigner: false, isWritable: false },
      ],
    }
  );

  transactionIxs.push(createWithdrawStrategyIx);

  const txSig = await sendAndConfirmOptimisedTx(
    transactionIxs,
    heliusRpcUrl,
    payerKp
  );
  console.log("Marginfi strategy withdrawn with signature:", txSig);
};

const withdrawKlendStrategy = async (
  protocolProgram: PublicKey,
  lendingMarket: PublicKey,
  reserve: PublicKey,
  scopePrices: PublicKey
) => {
  const [counterPartyTa] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("reserve_liq_supply"),
      lendingMarket.toBuffer(),
      vaultAssetMint.toBuffer(),
    ],
    protocolProgram
  );

  const [strategy] = PublicKey.findProgramAddressSync(
    [SEEDS.STRATEGY, counterPartyTa.toBuffer()],
    DEFAULT_ADAPTOR_PROGRAM_ID
  );

  const { vaultStrategyAuth } = vc.findVaultStrategyAddresses(vault, strategy);
  const [reserveCollateralMint] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("reserve_coll_mint"),
      lendingMarket.toBuffer(),
      vaultAssetMint.toBuffer(),
    ],
    protocolProgram
  );
  const userDestinationCollateral = getAssociatedTokenAddressSync(
    reserveCollateralMint,
    vaultStrategyAuth,
    true
  );

  const userDestinationCollateralAccount = await connection.getAccountInfo(
    userDestinationCollateral
  );
  let transactionIxs: TransactionInstruction[] = [];
  if (!userDestinationCollateralAccount) {
    const createUserDestinationCollateralIx =
      createAssociatedTokenAccountIdempotentInstruction(
        payer,
        userDestinationCollateral,
        vaultStrategyAuth,
        reserveCollateralMint
      );
    transactionIxs.push(createUserDestinationCollateralIx);
  }

  const vaultStrategyAssetAta = getAssociatedTokenAddressSync(
    vaultAssetMint,
    vaultStrategyAuth,
    true
  );

  const vaultStrategyAssetAtaAccount = await connection.getAccountInfo(
    vaultStrategyAssetAta
  );

  if (!vaultStrategyAssetAtaAccount) {
    const createVaultStrategyAssetAtaIx =
      createAssociatedTokenAccountInstruction(
        payer,
        vaultStrategyAssetAta,
        vaultStrategyAuth,
        vaultAssetMint
      );
    transactionIxs.push(createVaultStrategyAssetAtaIx);
  }

  const counterPartyTaAuth = await getAccount(
    connection,
    counterPartyTa,
    "confirmed"
  ).then((account) => account.owner);

  const createWithdrawStrategyIx = await vc.createWithdrawStrategyIx(
    { withdrawAmount },
    {
      manager: payer,
      vault,
      vaultAssetMint,
      assetTokenProgram: new PublicKey(assetTokenProgram),
      strategy,
      remainingAccounts: [
        { pubkey: counterPartyTaAuth, isSigner: false, isWritable: true },
        { pubkey: counterPartyTa, isSigner: false, isWritable: true },
        { pubkey: protocolProgram, isSigner: false, isWritable: false },
        { pubkey: lendingMarket, isSigner: false, isWritable: false },
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
      ],
    }
  );

  transactionIxs.push(createWithdrawStrategyIx);

  const txSig = await sendAndConfirmOptimisedTx(
    transactionIxs,
    heliusRpcUrl,
    payerKp
  );
  console.log("Klend strategy withdrawn with signature:", txSig);
};

const withdrawDriftStrategy = async (
  protocolProgram: PublicKey,
  state: PublicKey,
  marketIndex: BN,
  subAccountId: BN,
  oracle: PublicKey
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
    DEFAULT_ADAPTOR_PROGRAM_ID
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

  const vaultStrategyAssetAta = getAssociatedTokenAddressSync(
    vaultAssetMint,
    vaultStrategyAuth,
    true
  );

  const vaultStrategyAssetAtaAccount = await connection.getAccountInfo(
    vaultStrategyAssetAta
  );

  if (!vaultStrategyAssetAtaAccount) {
    const createVaultStrategyAssetAtaIx =
      createAssociatedTokenAccountInstruction(
        payer,
        vaultStrategyAssetAta,
        vaultStrategyAuth,
        vaultAssetMint
      );
    transactionIxs.push(createVaultStrategyAssetAtaIx);
  }

  const counterPartyTaAuth = await getAccount(
    connection,
    counterPartyTa,
    "confirmed"
  ).then((account) => account.owner);

  const createWithdrawStrategyIx = await vc.createWithdrawStrategyIx(
    {
      withdrawAmount,
      additionalArgs: Buffer.from([
        ...marketIndex.toArrayLike(Buffer, "le", 2),
      ]),
    },
    {
      manager: payer,
      vault,
      vaultAssetMint,
      assetTokenProgram: new PublicKey(assetTokenProgram),
      strategy,
      remainingAccounts: [
        { pubkey: counterPartyTaAuth, isSigner: false, isWritable: true },
        { pubkey: counterPartyTa, isSigner: false, isWritable: true },
        { pubkey: protocolProgram, isSigner: false, isWritable: false },
        { pubkey: state, isSigner: false, isWritable: false },
        { pubkey: user, isSigner: false, isWritable: true },
        { pubkey: userStats, isSigner: false, isWritable: true },
        { pubkey: oracle, isSigner: false, isWritable: false },
        { pubkey: spotMarket, isSigner: false, isWritable: true },
      ],
    }
  );

  transactionIxs.push(createWithdrawStrategyIx);

  const txSig = await sendAndConfirmOptimisedTx(
    transactionIxs,
    heliusRpcUrl,
    payerKp
  );
  console.log("Drift strategy withdrawn with signature:", txSig);
};

const main = async () => {
  await withdrawSolendStrategy(
    new PublicKey(PROTOCOL_CONSTANTS.SOLEND.PROGRAM_ID),
    new PublicKey(PROTOCOL_CONSTANTS.SOLEND.MAIN_MARKET.USDC.COUNTERPARTY_TA),
    new PublicKey(PROTOCOL_CONSTANTS.SOLEND.MAIN_MARKET.LENDING_MARKET),
    new PublicKey(PROTOCOL_CONSTANTS.SOLEND.MAIN_MARKET.USDC.RESERVE),
    new PublicKey(PROTOCOL_CONSTANTS.SOLEND.MAIN_MARKET.USDC.COLLATERAL_MINT),
    new PublicKey(PROTOCOL_CONSTANTS.SOLEND.MAIN_MARKET.USDC.PYTH_ORACLE),
    new PublicKey(PROTOCOL_CONSTANTS.SOLEND.MAIN_MARKET.USDC.SWITCHBOARD_ORACLE)
  );
  await withdrawMarginfiStrategy(
    new PublicKey(PROTOCOL_CONSTANTS.MARGINFI.PROGRAM_ID),
    new PublicKey(PROTOCOL_CONSTANTS.MARGINFI.MAIN_MARKET.USDC.BANK),
    new PublicKey(marginfiAccount),
    new PublicKey(PROTOCOL_CONSTANTS.MARGINFI.MAIN_MARKET.GROUP),
    new PublicKey(PROTOCOL_CONSTANTS.MARGINFI.MAIN_MARKET.USDC.ORACLE)
  );
  await withdrawKlendStrategy(
    new PublicKey(PROTOCOL_CONSTANTS.KLEND.PROGRAM_ID),
    new PublicKey(PROTOCOL_CONSTANTS.KLEND.MAIN_MARKET.LENDING_MARKET),
    new PublicKey(PROTOCOL_CONSTANTS.KLEND.MAIN_MARKET.USDC.RESERVE),
    new PublicKey(PROTOCOL_CONSTANTS.KLEND.SCOPE_ORACLE)
  );
  await withdrawDriftStrategy(
    new PublicKey(PROTOCOL_CONSTANTS.DRIFT.PROGRAM_ID),
    new PublicKey(PROTOCOL_CONSTANTS.DRIFT.SPOT.STATE),
    new BN(PROTOCOL_CONSTANTS.DRIFT.SPOT.USDC.MARKET_INDEX),
    new BN(PROTOCOL_CONSTANTS.DRIFT.SUB_ACCOUNT_ID),
    new PublicKey(PROTOCOL_CONSTANTS.DRIFT.SPOT.USDC.ORACLE)
  );
};

main();

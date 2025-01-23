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
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { sendAndConfirmOptimisedTx } from "./helper";
import { BN } from "@coral-xyz/anchor";
import {
  ASSET_MINT_ADDRESS,
  DEPOSIT_AMOUNT_PER_STRATEGY,
  DRIFT_MARKET_INDEX,
  DRIFT_ORACLE,
  DRIFT_PROGRAM_ID,
  DRIFT_STATE,
  HELIUS_RPC_URL,
  KLEND_LENDING_MARKET,
  KLEND_PROGRAM_ID,
  KLEND_RESERVE,
  KLEND_SCOPE_ORACLE,
  MARGINFI_ACCOUNT,
  MARGINFI_BANK,
  MARGINFI_GROUP,
  MARGINFI_PROGRAM_ID,
  SOLEND_COLLATERAL_MINT,
  SOLEND_COUNTER_PARTY_TA,
  SOLEND_LENDING_MARKET,
  SOLEND_PROGRAM_ID,
  SOLEND_PYTH_ORACLE,
  SOLEND_RESERVE,
  SOLEND_SWITCHBOARD_ORACLE,
  VAULT_ADDRESS,
  MANAGER_FILE_PATH,
} from "./constants";
import {
  DEFAULT_ADAPTOR_PROGRAM_ID,
  SEEDS,
  VoltrClient,
} from "@voltr/vault-sdk";

const payerKpFile = fs.readFileSync(MANAGER_FILE_PATH, "utf-8");
const payerKpData = JSON.parse(payerKpFile);
const payerSecret = Uint8Array.from(payerKpData);
const payerKp = Keypair.fromSecretKey(payerSecret);
const payer = payerKp.publicKey;

const vault = new PublicKey(VAULT_ADDRESS);
const vaultAssetMint = new PublicKey(ASSET_MINT_ADDRESS);

const connection = new Connection(HELIUS_RPC_URL);
const vc = new VoltrClient(connection);
const depositAmount = new BN(DEPOSIT_AMOUNT_PER_STRATEGY);

const depositSolendStrategy = async (
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

  const [lendingMarketAuthority] = PublicKey.findProgramAddressSync(
    [lendingMarket.toBytes()],
    protocolProgram
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

  const createDepositStrategyIx = await vc.createDepositStrategyIx(
    { depositAmount },
    {
      manager: payer,
      vault,
      vaultAssetMint,
      assetTokenProgram: TOKEN_PROGRAM_ID,
      strategy,
      remainingAccounts: [
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
      ],
    }
  );

  transactionIxs.push(createDepositStrategyIx);

  const txSig = await sendAndConfirmOptimisedTx(
    transactionIxs,
    HELIUS_RPC_URL,
    payerKp
  );
  console.log("Solend strategy deposited with signature:", txSig);
};

const depositMarginfiStrategy = async (
  protocolProgram: PublicKey,
  bank: PublicKey,
  marginfiAccount: PublicKey,
  marginfiGroup: PublicKey
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

  const createDepositStrategyIx = await vc.createDepositStrategyIx(
    { depositAmount },
    {
      manager: payer,
      vault,
      vaultAssetMint,
      assetTokenProgram: TOKEN_PROGRAM_ID,
      strategy,
      remainingAccounts: [
        { pubkey: counterPartyTa, isSigner: false, isWritable: true },
        { pubkey: protocolProgram, isSigner: false, isWritable: false },
        { pubkey: marginfiGroup, isSigner: false, isWritable: true },
        { pubkey: marginfiAccount, isSigner: false, isWritable: true },
        { pubkey: bank, isSigner: false, isWritable: true },
      ],
    }
  );

  transactionIxs.push(createDepositStrategyIx);

  const txSig = await sendAndConfirmOptimisedTx(
    transactionIxs,
    HELIUS_RPC_URL,
    payerKp
  );
  console.log("Marginfi strategy deposited with signature:", txSig);
};

const depositKlendStrategy = async (
  protocolProgram: PublicKey,
  lendingMarket: PublicKey,
  reserve: PublicKey,
  scopePrices: PublicKey
) => {
  const [lendingMarketAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("lma"), lendingMarket.toBuffer()],
    protocolProgram
  );

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

  const createDepositStrategyIx = await vc.createDepositStrategyIx(
    { depositAmount },
    {
      manager: payer,
      vault,
      vaultAssetMint,
      assetTokenProgram: TOKEN_PROGRAM_ID,
      strategy,
      remainingAccounts: [
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
      ],
    }
  );

  transactionIxs.push(createDepositStrategyIx);

  const txSig = await sendAndConfirmOptimisedTx(
    transactionIxs,
    HELIUS_RPC_URL,
    payerKp
  );
  console.log("Klend strategy deposited with signature:", txSig);
};

const depositDriftStrategy = async (
  protocolProgram: PublicKey,
  state: PublicKey,
  marketIndex: BN,
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
      marketIndex.toArrayLike(Buffer, "le", 2),
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

  const createDepositStrategyIx = await vc.createDepositStrategyIx(
    {
      depositAmount,
      additionalArgs: Buffer.from([
        ...marketIndex.toArrayLike(Buffer, "le", 2),
      ]),
    },
    {
      manager: payer,
      vault,
      vaultAssetMint,
      assetTokenProgram: TOKEN_PROGRAM_ID,
      strategy,
      remainingAccounts: [
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

  transactionIxs.push(createDepositStrategyIx);

  const txSig = await sendAndConfirmOptimisedTx(
    transactionIxs,
    HELIUS_RPC_URL,
    payerKp
  );
  console.log("Drift strategy deposited with signature:", txSig);
};

const main = async () => {
  await depositSolendStrategy(
    new PublicKey(SOLEND_PROGRAM_ID),
    new PublicKey(SOLEND_COUNTER_PARTY_TA),
    new PublicKey(SOLEND_LENDING_MARKET),
    new PublicKey(SOLEND_RESERVE),
    new PublicKey(SOLEND_COLLATERAL_MINT),
    new PublicKey(SOLEND_PYTH_ORACLE),
    new PublicKey(SOLEND_SWITCHBOARD_ORACLE)
  );
  await depositMarginfiStrategy(
    new PublicKey(MARGINFI_PROGRAM_ID),
    new PublicKey(MARGINFI_BANK),
    new PublicKey(MARGINFI_ACCOUNT),
    new PublicKey(MARGINFI_GROUP)
  );
  await depositKlendStrategy(
    new PublicKey(KLEND_PROGRAM_ID),
    new PublicKey(KLEND_LENDING_MARKET),
    new PublicKey(KLEND_RESERVE),
    new PublicKey(KLEND_SCOPE_ORACLE)
  );
  await depositDriftStrategy(
    new PublicKey(DRIFT_PROGRAM_ID),
    new PublicKey(DRIFT_STATE),
    new BN(DRIFT_MARKET_INDEX),
    new PublicKey(DRIFT_ORACLE)
  );
};

main();

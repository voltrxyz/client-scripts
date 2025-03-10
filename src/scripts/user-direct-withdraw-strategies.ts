// NOTE: THIS ASSUMES THE USER HAS REQUESTED A WITHDRAWAL, THROWS ERROR IF NOT
import * as fs from "fs";
import {
  Connection,
  Keypair,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  createCloseAccountInstruction,
  getAccount,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { sendAndConfirmOptimisedTx, setupTokenAccount } from "../utils/helper";
import { BN } from "@coral-xyz/anchor";
import {
  LENDING_ADAPTOR_PROGRAM_ID,
  SEEDS,
  VoltrClient,
} from "@voltr/vault-sdk";
import {
  assetMintAddress,
  assetTokenProgram,
  heliusRpcUrl,
  marginfiAccount,
  userFilePath,
  vaultAddress,
} from "../variables";
import { PROTOCOL_CONSTANTS } from "../constants";

const userKpFile = fs.readFileSync(userFilePath, "utf-8");
const userKpData = JSON.parse(userKpFile);
const userSecret = Uint8Array.from(userKpData);
const userKp = Keypair.fromSecretKey(userSecret);
const user = userKp.publicKey;

const vault = new PublicKey(vaultAddress);
const vaultAssetMint = new PublicKey(assetMintAddress);

const connection = new Connection(heliusRpcUrl);
const vc = new VoltrClient(connection);

const withdrawSolendStrategy = async (
  protocolProgram: PublicKey,
  counterPartyTa: PublicKey,
  lendingMarket: PublicKey,
  reserve: PublicKey,
  collateralMint: PublicKey,
  pythOracle: PublicKey,
  switchboardOracle: PublicKey
) => {
  let transactionIxs: TransactionInstruction[] = [];
  const userAssetAta = await setupTokenAccount(
    connection,
    user,
    vaultAssetMint,
    user,
    transactionIxs,
    assetTokenProgram
  );

  const [strategy] = PublicKey.findProgramAddressSync(
    [SEEDS.STRATEGY, counterPartyTa.toBuffer()],
    LENDING_ADAPTOR_PROGRAM_ID
  );

  const { vaultStrategyAuth } = vc.findVaultStrategyAddresses(vault, strategy);

  const vaultCollateralAta = await setupTokenAccount(
    connection,
    user,
    collateralMint,
    vaultStrategyAuth,
    transactionIxs
  );

  const _vaultStrategyAssetAta = await setupTokenAccount(
    connection,
    user,
    vaultAssetMint,
    vaultStrategyAuth,
    transactionIxs,
    assetTokenProgram
  );

  const counterPartyTaAuth = await getAccount(
    connection,
    counterPartyTa,
    "confirmed"
  ).then((account) => account.owner);

  const createWithdrawStrategyIx = await vc.createDirectWithdrawStrategyIx(
    {},
    {
      user,
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

  if (vaultAssetMint.equals(NATIVE_MINT)) {
    // Create close account instruction to convert wSOL back to SOL
    const closeWsolAccountIx = createCloseAccountInstruction(
      userAssetAta, // Account to close
      user, // Destination account (SOL will be sent here)
      user, // Authority
      [] // No multisig signers
    );
    transactionIxs.push(closeWsolAccountIx);
  }

  const txSig = await sendAndConfirmOptimisedTx(
    transactionIxs,
    heliusRpcUrl,
    userKp
  );
  console.log("Solend strategy direct withdrawn with signature:", txSig);
};

const withdrawMarginfiStrategy = async (
  protocolProgram: PublicKey,
  bank: PublicKey,
  marginfiAccount: PublicKey,
  marginfiGroup: PublicKey,
  oracle: PublicKey
) => {
  let transactionIxs: TransactionInstruction[] = [];
  const userAssetAta = await setupTokenAccount(
    connection,
    user,
    vaultAssetMint,
    user,
    transactionIxs,
    assetTokenProgram
  );

  const [counterPartyTa] = PublicKey.findProgramAddressSync(
    [Buffer.from("liquidity_vault"), bank.toBuffer()],
    protocolProgram
  );

  const [strategy] = PublicKey.findProgramAddressSync(
    [SEEDS.STRATEGY, counterPartyTa.toBuffer()],
    LENDING_ADAPTOR_PROGRAM_ID
  );

  const { vaultStrategyAuth } = vc.findVaultStrategyAddresses(vault, strategy);

  const _vaultStrategyAssetAta = await setupTokenAccount(
    connection,
    user,
    vaultAssetMint,
    vaultStrategyAuth,
    transactionIxs,
    assetTokenProgram
  );

  const counterPartyTaAuth = await getAccount(
    connection,
    counterPartyTa,
    "confirmed"
  ).then((account) => account.owner);

  const createWithdrawStrategyIx = await vc.createDirectWithdrawStrategyIx(
    {},
    {
      user,
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

  if (vaultAssetMint.equals(NATIVE_MINT)) {
    // Create close account instruction to convert wSOL back to SOL
    const closeWsolAccountIx = createCloseAccountInstruction(
      userAssetAta, // Account to close
      user, // Destination account (SOL will be sent here)
      user, // Authority
      [] // No multisig signers
    );
    transactionIxs.push(closeWsolAccountIx);
  }

  const txSig = await sendAndConfirmOptimisedTx(
    transactionIxs,
    heliusRpcUrl,
    userKp
  );
  console.log("Marginfi strategy direct withdrawn with signature:", txSig);
};

const withdrawKlendStrategy = async (
  protocolProgram: PublicKey,
  lendingMarket: PublicKey,
  reserve: PublicKey,
  scopePrices: PublicKey
) => {
  let transactionIxs: TransactionInstruction[] = [];
  const userAssetAta = await setupTokenAccount(
    connection,
    user,
    vaultAssetMint,
    user,
    transactionIxs,
    assetTokenProgram
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
    LENDING_ADAPTOR_PROGRAM_ID
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
  const userDestinationCollateral = await setupTokenAccount(
    connection,
    user,
    reserveCollateralMint,
    vaultStrategyAuth,
    transactionIxs
  );

  const _vaultStrategyAssetAta = await setupTokenAccount(
    connection,
    user,
    vaultAssetMint,
    vaultStrategyAuth,
    transactionIxs,
    assetTokenProgram
  );

  const counterPartyTaAuth = await getAccount(
    connection,
    counterPartyTa,
    "confirmed"
  ).then((account) => account.owner);

  const createWithdrawStrategyIx = await vc.createDirectWithdrawStrategyIx(
    {},
    {
      user,
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

  if (vaultAssetMint.equals(NATIVE_MINT)) {
    // Create close account instruction to convert wSOL back to SOL
    const closeWsolAccountIx = createCloseAccountInstruction(
      userAssetAta, // Account to close
      user, // Destination account (SOL will be sent here)
      user, // Authority
      [] // No multisig signers
    );
    transactionIxs.push(closeWsolAccountIx);
  }

  const txSig = await sendAndConfirmOptimisedTx(
    transactionIxs,
    heliusRpcUrl,
    userKp
  );
  console.log("Klend strategy direct withdrawn with signature:", txSig);
};

const withdrawDriftStrategy = async (
  protocolProgram: PublicKey,
  state: PublicKey,
  marketIndex: BN,
  subAccountId: BN,
  oracle: PublicKey
) => {
  let transactionIxs: TransactionInstruction[] = [];
  const userAssetAta = await setupTokenAccount(
    connection,
    user,
    vaultAssetMint,
    user,
    transactionIxs,
    assetTokenProgram
  );

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

  const [driftUser] = PublicKey.findProgramAddressSync(
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

  const _vaultStrategyAssetAta = await setupTokenAccount(
    connection,
    user,
    vaultAssetMint,
    vaultStrategyAuth,
    transactionIxs,
    assetTokenProgram
  );

  const counterPartyTaAuth = await getAccount(
    connection,
    counterPartyTa,
    "confirmed"
  ).then((account) => account.owner);

  const createWithdrawStrategyIx = await vc.createDirectWithdrawStrategyIx(
    {},
    {
      user,
      vault,
      vaultAssetMint,
      assetTokenProgram: new PublicKey(assetTokenProgram),
      strategy,
      remainingAccounts: [
        { pubkey: counterPartyTaAuth, isSigner: false, isWritable: true },
        { pubkey: counterPartyTa, isSigner: false, isWritable: true },
        { pubkey: protocolProgram, isSigner: false, isWritable: false },
        { pubkey: state, isSigner: false, isWritable: false },
        { pubkey: driftUser, isSigner: false, isWritable: true },
        { pubkey: userStats, isSigner: false, isWritable: true },
        { pubkey: oracle, isSigner: false, isWritable: false },
        { pubkey: spotMarket, isSigner: false, isWritable: true },
      ],
    }
  );

  transactionIxs.push(createWithdrawStrategyIx);

  if (vaultAssetMint.equals(NATIVE_MINT)) {
    // Create close account instruction to convert wSOL back to SOL
    const closeWsolAccountIx = createCloseAccountInstruction(
      userAssetAta, // Account to close
      user, // Destination account (SOL will be sent here)
      user, // Authority
      [] // No multisig signers
    );
    transactionIxs.push(closeWsolAccountIx);
  }

  const txSig = await sendAndConfirmOptimisedTx(
    transactionIxs,
    heliusRpcUrl,
    userKp
  );
  console.log("Drift strategy direct withdrawn with signature:", txSig);
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

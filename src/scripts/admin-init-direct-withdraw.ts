import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { sendAndConfirmOptimisedTx } from "./helper";
import { BN } from "@coral-xyz/anchor";
import * as fs from "fs";
import {
  DEFAULT_ADAPTOR_PROGRAM_ID,
  SEEDS,
  VoltrClient,
} from "@voltr/vault-sdk";
import {
  adminFilePath,
  assetMintAddress,
  heliusRpcUrl,
  vaultAddress,
} from "./variables";
import { PROTOCOL_CONSTANTS } from "../constants";

const payerKpFile = fs.readFileSync(adminFilePath, "utf-8");
const payerKpData = JSON.parse(payerKpFile);
const payerSecret = Uint8Array.from(payerKpData);
const payerKp = Keypair.fromSecretKey(payerSecret);
const payer = payerKp.publicKey;
const vault = new PublicKey(vaultAddress);
const vaultAssetMint = new PublicKey(assetMintAddress);

const connection = new Connection(heliusRpcUrl);
const vc = new VoltrClient(connection);

const initDirectWithdrawSolendStrategy = async (counterPartyTa: PublicKey) => {
  const [strategy] = PublicKey.findProgramAddressSync(
    [SEEDS.STRATEGY, counterPartyTa.toBuffer()],
    DEFAULT_ADAPTOR_PROGRAM_ID
  );

  const initializeDirectWithdrawStrategyIx =
    await vc.createInitializeDirectWithdrawStrategyIx(
      {},
      { payer, admin: payer, vault, strategy }
    );

  const txSig = await sendAndConfirmOptimisedTx(
    [initializeDirectWithdrawStrategyIx],
    heliusRpcUrl,
    payerKp
  );
  console.log(
    "Direct withdraw Solend strategy initialized with signature:",
    txSig
  );
};

const initDirectWithdrawMarginfiStrategy = async (
  protocolProgram: PublicKey,
  bank: PublicKey
) => {
  const [counterPartyTa] = PublicKey.findProgramAddressSync(
    [Buffer.from("liquidity_vault"), bank.toBuffer()],
    protocolProgram
  );
  const [strategy] = PublicKey.findProgramAddressSync(
    [SEEDS.STRATEGY, counterPartyTa.toBuffer()],
    DEFAULT_ADAPTOR_PROGRAM_ID
  );
  const initializeDirectWithdrawStrategyIx =
    await vc.createInitializeDirectWithdrawStrategyIx(
      {},
      { payer, admin: payer, vault, strategy }
    );

  const txSig = await sendAndConfirmOptimisedTx(
    [initializeDirectWithdrawStrategyIx],
    heliusRpcUrl,
    payerKp
  );
  console.log(
    "Direct withdraw Marginfi strategy initialized with signature:",
    txSig
  );
};

const initDirectWithdrawKlendStrategy = async (
  protocolProgram: PublicKey,
  lendingMarket: PublicKey
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

  const initializeDirectWithdrawStrategyIx =
    await vc.createInitializeDirectWithdrawStrategyIx(
      {},
      { payer, admin: payer, vault, strategy }
    );

  const txSig = await sendAndConfirmOptimisedTx(
    [initializeDirectWithdrawStrategyIx],
    heliusRpcUrl,
    payerKp
  );
  console.log(
    "Direct withdraw Klend strategy initialized with signature:",
    txSig
  );
};

const initDirectWithdrawDriftStrategy = async (
  protocolProgram: PublicKey,
  marketIndex: BN
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

  const initializeDirectWithdrawStrategyIx =
    await vc.createInitializeDirectWithdrawStrategyIx(
      {
        additionalArgs: Buffer.from([
          ...new BN(marketIndex).toArrayLike(Buffer, "le", 2),
        ]),
      },
      { payer, admin: payer, vault, strategy }
    );

  const txSig = await sendAndConfirmOptimisedTx(
    [initializeDirectWithdrawStrategyIx],
    heliusRpcUrl,
    payerKp
  );
  console.log(
    "Direct withdraw Drift strategy initialized with signature:",
    txSig
  );
};

const main = async () => {
  await initDirectWithdrawSolendStrategy(
    new PublicKey(PROTOCOL_CONSTANTS.SOLEND.MAIN_MARKET.USDC.COUNTERPARTY_TA)
  );
  await initDirectWithdrawMarginfiStrategy(
    new PublicKey(PROTOCOL_CONSTANTS.MARGINFI.PROGRAM_ID),
    new PublicKey(PROTOCOL_CONSTANTS.MARGINFI.MAIN_MARKET.USDC.BANK)
  );
  await initDirectWithdrawKlendStrategy(
    new PublicKey(PROTOCOL_CONSTANTS.KLEND.PROGRAM_ID),
    new PublicKey(PROTOCOL_CONSTANTS.KLEND.MAIN_MARKET.LENDING_MARKET)
  );
  await initDirectWithdrawDriftStrategy(
    new PublicKey(PROTOCOL_CONSTANTS.DRIFT.PROGRAM_ID),
    new BN(PROTOCOL_CONSTANTS.DRIFT.SPOT.USDC.MARKET_INDEX)
  );
};

main();

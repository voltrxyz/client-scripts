import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { sendAndConfirmOptimisedTx } from "./helper";
import { BN } from "@coral-xyz/anchor";
import * as fs from "fs";
import {
  ADMIN_FILE_PATH,
  ASSET_MINT_ADDRESS,
  DRIFT_PROGRAM_ID,
  HELIUS_RPC_URL,
  KLEND_LENDING_MARKET,
  KLEND_PROGRAM_ID,
  MARGINFI_BANK,
  MARGINFI_PROGRAM_ID,
  DRIFT_MARKET_INDEX,
  SOLEND_COUNTER_PARTY_TA,
  VAULT_ADDRESS,
} from "./constants";
import {
  DEFAULT_ADAPTOR_PROGRAM_ID,
  SEEDS,
  VoltrClient,
} from "@voltr/vault-sdk";

const payerKpFile = fs.readFileSync(ADMIN_FILE_PATH, "utf-8");
const payerKpData = JSON.parse(payerKpFile);
const payerSecret = Uint8Array.from(payerKpData);
const payerKp = Keypair.fromSecretKey(payerSecret);
const payer = payerKp.publicKey;
const vault = new PublicKey(VAULT_ADDRESS);
const vaultAssetMint = new PublicKey(ASSET_MINT_ADDRESS);

const connection = new Connection(HELIUS_RPC_URL);
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
    HELIUS_RPC_URL,
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
    HELIUS_RPC_URL,
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
    HELIUS_RPC_URL,
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
    HELIUS_RPC_URL,
    payerKp
  );
  console.log(
    "Direct withdraw Drift strategy initialized with signature:",
    txSig
  );
};

const main = async () => {
  await initDirectWithdrawSolendStrategy(
    new PublicKey(SOLEND_COUNTER_PARTY_TA)
  );
  await initDirectWithdrawMarginfiStrategy(
    new PublicKey(MARGINFI_PROGRAM_ID),
    new PublicKey(MARGINFI_BANK)
  );
  await initDirectWithdrawKlendStrategy(
    new PublicKey(KLEND_PROGRAM_ID),
    new PublicKey(KLEND_LENDING_MARKET)
  );
  await initDirectWithdrawDriftStrategy(
    new PublicKey(DRIFT_PROGRAM_ID),
    new BN(DRIFT_MARKET_INDEX)
  );
};

main();

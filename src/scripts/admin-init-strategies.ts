import {
  AddressLookupTableProgram,
  Connection,
  Keypair,
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { createWithSeedSync } from "@coral-xyz/anchor/dist/cjs/utils/pubkey";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { sendAndConfirmOptimisedTx } from "./helper";
import { BN } from "@coral-xyz/anchor";
import * as fs from "fs";
import {
  ADMIN_FILE_PATH,
  ASSET_MINT_ADDRESS,
  DRIFT_PROGRAM_ID,
  DRIFT_STATE,
  HELIUS_RPC_URL,
  KLEND_LENDING_MARKET,
  KLEND_PROGRAM_ID,
  MARGINFI_BANK,
  MARGINFI_GROUP,
  MARGINFI_PROGRAM_ID,
  DRIFT_MARKET_INDEX,
  SOLEND_COUNTER_PARTY_TA,
  SOLEND_LENDING_MARKET,
  SOLEND_PROGRAM_ID,
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

const initSolendStrategy = async (
  protocolProgram: PublicKey,
  counterPartyTa: PublicKey,
  lendingMarket: PublicKey
) => {
  const [strategy] = PublicKey.findProgramAddressSync(
    [SEEDS.STRATEGY, counterPartyTa.toBuffer()],
    DEFAULT_ADAPTOR_PROGRAM_ID
  );

  const { vaultStrategyAuth } = vc.findVaultStrategyAddresses(vault, strategy);

  const obligation = createWithSeedSync(
    vaultStrategyAuth,
    lendingMarket.toBase58().slice(0, 32),
    protocolProgram
  );

  const createInitializeStrategyIx = await vc.createInitializeStrategyIx(
    {},
    {
      payer,
      vault,
      manager: payer,
      strategy,
      remainingAccounts: [
        { pubkey: protocolProgram, isSigner: false, isWritable: false },
        { pubkey: obligation, isSigner: false, isWritable: true },
        { pubkey: lendingMarket, isSigner: false, isWritable: true },
        { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        {
          pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
          isSigner: false,
          isWritable: false,
        },
      ],
    }
  );

  const txSig = await sendAndConfirmOptimisedTx(
    [createInitializeStrategyIx],
    HELIUS_RPC_URL,
    payerKp
  );
  console.log("Solend strategy initialized with signature:", txSig);
};

const initMarginfiStrategy = async (
  protocolProgram: PublicKey,
  bank: PublicKey,
  group: PublicKey
) => {
  const [counterPartyTa] = PublicKey.findProgramAddressSync(
    [Buffer.from("liquidity_vault"), bank.toBuffer()],
    protocolProgram
  );

  const [strategy] = PublicKey.findProgramAddressSync(
    [SEEDS.STRATEGY, counterPartyTa.toBuffer()],
    DEFAULT_ADAPTOR_PROGRAM_ID
  );

  const marginfiAccountKp = Keypair.generate();
  const marginfiAccount = marginfiAccountKp.publicKey;

  const createInitializeStrategyIx = await vc.createInitializeStrategyIx(
    {},
    {
      payer,
      vault,
      manager: payer,
      strategy,
      remainingAccounts: [
        { pubkey: protocolProgram, isSigner: false, isWritable: false },
        { pubkey: group, isSigner: false, isWritable: false },
        { pubkey: marginfiAccount, isSigner: true, isWritable: true },
      ],
    }
  );

  const txSig = await sendAndConfirmOptimisedTx(
    [createInitializeStrategyIx],
    HELIUS_RPC_URL,
    payerKp,
    [marginfiAccountKp]
  );
  console.log("Marginfi strategy initialized with signature:", txSig);
  console.log("Marginfi account:", marginfiAccount.toBase58());
};

const initKlendStrategy = async (
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

  const { vaultStrategyAuth } = vc.findVaultStrategyAddresses(vault, strategy);

  const [userMetadata] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_meta"), vaultStrategyAuth.toBuffer()],
    protocolProgram
  );

  const [_lookupTableIxs, lookupTableAddress] =
    AddressLookupTableProgram.createLookupTable({
      authority: vaultStrategyAuth,
      payer: payer,
      recentSlot: await connection.getSlot("confirmed"),
    });

  const createInitializeStrategyIx = await vc.createInitializeStrategyIx(
    {},
    {
      payer,
      vault,
      manager: payer,
      strategy,
      remainingAccounts: [
        { pubkey: protocolProgram, isSigner: false, isWritable: false },
        { pubkey: userMetadata, isSigner: false, isWritable: true },
        { pubkey: lookupTableAddress, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      ],
    }
  );

  const txSig = await sendAndConfirmOptimisedTx(
    [createInitializeStrategyIx],
    HELIUS_RPC_URL,
    payerKp
  );
  console.log("Klend strategy initialized with signature:", txSig);
};

const initDriftStrategy = async (
  protocolProgram: PublicKey,
  state: PublicKey,
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

  const createInitializeStrategyIx = await vc.createInitializeStrategyIx(
    {},
    {
      payer,
      vault,
      manager: payer,
      strategy,
      remainingAccounts: [
        { pubkey: protocolProgram, isSigner: false, isWritable: false },
        { pubkey: userStats, isSigner: false, isWritable: true },
        { pubkey: state, isSigner: false, isWritable: true },
        { pubkey: user, isSigner: false, isWritable: true },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      ],
    }
  );

  const txSig = await sendAndConfirmOptimisedTx(
    [createInitializeStrategyIx],
    HELIUS_RPC_URL,
    payerKp
  );
  console.log("Drift strategy initialized with signature:", txSig);
};

const main = async () => {
  await initSolendStrategy(
    new PublicKey(SOLEND_PROGRAM_ID),
    new PublicKey(SOLEND_COUNTER_PARTY_TA),
    new PublicKey(SOLEND_LENDING_MARKET)
  );
  await initMarginfiStrategy(
    new PublicKey(MARGINFI_PROGRAM_ID),
    new PublicKey(MARGINFI_BANK),
    new PublicKey(MARGINFI_GROUP)
  );
  await initKlendStrategy(
    new PublicKey(KLEND_PROGRAM_ID),
    new PublicKey(KLEND_LENDING_MARKET)
  );
  await initDriftStrategy(
    new PublicKey(DRIFT_PROGRAM_ID),
    new PublicKey(DRIFT_STATE),
    new BN(DRIFT_MARKET_INDEX)
  );
};

main();

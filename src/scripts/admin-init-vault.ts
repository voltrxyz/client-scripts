import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import * as fs from "fs";
import {
  sendAndConfirmOptimisedTx,
  setupAddressLookupTable,
} from "../utils/helper";
import { VoltrClient } from "@voltr/vault-sdk";
import {
  adminFilePath,
  assetMintAddress,
  heliusRpcUrl,
  managerFilePath,
  useLookupTable,
  vaultAddress,
  vaultParams,
} from "../variables";

const payerKpFile = fs.readFileSync(adminFilePath, "utf-8");
const payerKpData = JSON.parse(payerKpFile);
const payerSecret = Uint8Array.from(payerKpData);
const payerKp = Keypair.fromSecretKey(payerSecret);
const payer = payerKp.publicKey;

const managerKpFile = fs.readFileSync(managerFilePath, "utf-8");
const managerKpData = JSON.parse(managerKpFile);
const managerSecret = Uint8Array.from(managerKpData);
const managerKp = Keypair.fromSecretKey(managerSecret);
const manager = managerKp.publicKey;

const vaultKp = Keypair.generate();
const vault = vaultKp.publicKey;
const vaultAssetMint = new PublicKey(assetMintAddress);

const connection = new Connection(heliusRpcUrl);
const vc = new VoltrClient(connection);

const initVaultAndAddAdaptorHandler = async () => {
  const createInitializeVaultIx = await vc.createInitializeVaultIx(
    vaultParams,
    {
      vault,
      vaultAssetMint,
      admin: payer,
      manager,
      payer,
    }
  );
  const createAddAdaptorIx = await vc.createAddAdaptorIx({
    vault,
    admin: payer,
    payer,
  });

  const transactionIxs: TransactionInstruction[] = [];

  transactionIxs.push(createInitializeVaultIx);
  transactionIxs.push(createAddAdaptorIx);
  const lut = useLookupTable? await setupAddressLookupTable(
    connection,
    payer,
    payer,
    [
      ...new Set([
        ...createInitializeVaultIx.keys.map((k) => k.pubkey.toBase58()),
        ...createAddAdaptorIx.keys.map((k) => k.pubkey.toBase58()),
      ]),
    ],
        transactionIxs
      )
    : null;


  const txSig = await sendAndConfirmOptimisedTx(
    transactionIxs,
    heliusRpcUrl,
    payerKp,
    [vaultKp]
  );

  await connection.confirmTransaction(txSig, "finalized");
  console.log(`Vault initialized and adaptor added with signature: ${txSig}`);
  console.log(`Update addresses into variables.ts`);
  console.log("Vault:", vault.toBase58());
  if (lut) console.log("Lookup Table", lut.toBase58());
};

const main = async () => {
  await initVaultAndAddAdaptorHandler();
};

main();

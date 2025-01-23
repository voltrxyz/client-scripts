import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import { sendAndConfirmOptimisedTx } from "./helper";
import {
  ADMIN_FILE_PATH,
  ASSET_MINT_ADDRESS,
  HELIUS_RPC_URL,
  MANAGER_FILE_PATH,
  VAULT_PARAMS,
} from "./constants";
import { VoltrClient } from "@voltr/vault-sdk";

const payerKpFile = fs.readFileSync(ADMIN_FILE_PATH, "utf-8");
const payerKpData = JSON.parse(payerKpFile);
const payerSecret = Uint8Array.from(payerKpData);
const payerKp = Keypair.fromSecretKey(payerSecret);
const payer = payerKp.publicKey;

const managerKpFile = fs.readFileSync(MANAGER_FILE_PATH, "utf-8");
const managerKpData = JSON.parse(managerKpFile);
const managerSecret = Uint8Array.from(managerKpData);
const managerKp = Keypair.fromSecretKey(managerSecret);
const manager = managerKp.publicKey;

const vaultKp = Keypair.generate();
const vault = vaultKp.publicKey;
const vaultAssetMint = new PublicKey(ASSET_MINT_ADDRESS);

const connection = new Connection(HELIUS_RPC_URL);
const vc = new VoltrClient(connection);

const initVaultHandler = async () => {
  const createInitializeVaultIx = await vc.createInitializeVaultIx(
    VAULT_PARAMS,
    {
      vault: vaultKp,
      vaultAssetMint,
      admin: payer,
      manager,
      payer,
    }
  );

  const txSig = await sendAndConfirmOptimisedTx(
    [createInitializeVaultIx],
    HELIUS_RPC_URL,
    payerKp,
    [vaultKp]
  );
  console.log(`Vault initialized with signature: ${txSig}`);
  console.log("Vault:", vault.toBase58());
};

const addAdaptorHandler = async () => {
  const createAddAdaptorIx = await vc.createAddAdaptorIx({
    vault,
    admin: payer,
    payer,
  });
  const txSig = await sendAndConfirmOptimisedTx(
    [createAddAdaptorIx],
    HELIUS_RPC_URL,
    payerKp
  );
  console.log(`Adaptor added with signature: ${txSig}`);
};

const main = async () => {
  await initVaultHandler();
  await addAdaptorHandler();
};

main();

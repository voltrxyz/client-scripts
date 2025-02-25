import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import { sendAndConfirmOptimisedTx } from "../utils/helper";
import { VoltrClient } from "@voltr/vault-sdk";
import {
  adminFilePath,
  heliusRpcUrl,
  vaultAddress,
  vaultConfig,
} from "../variables";

const adminKpFile = fs.readFileSync(adminFilePath, "utf-8");
const adminKpData = JSON.parse(adminKpFile);
const adminSecret = Uint8Array.from(adminKpData);
const adminKp = Keypair.fromSecretKey(adminSecret);
const admin = adminKp.publicKey;

const vault = new PublicKey(vaultAddress);

const connection = new Connection(heliusRpcUrl);
const vc = new VoltrClient(connection);

const updateVaultHandler = async () => {
  const createUpdateVaultIx = await vc.createUpdateVaultIx(vaultConfig, {
    vault,
    admin,
  });

  const txSig = await sendAndConfirmOptimisedTx(
    [createUpdateVaultIx],
    heliusRpcUrl,
    adminKp
  );

  console.log(`Vault updated with signature: ${txSig}`);
};

const main = async () => {
  await updateVaultHandler();
};

main();

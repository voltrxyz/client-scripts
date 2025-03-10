import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import { sendAndConfirmOptimisedTx } from "../utils/helper";
import { VoltrClient } from "@voltr/vault-sdk";
import {
  adminFilePath,
  assetMintAddress,
  heliusRpcUrl,
  managerFilePath,
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
      vault: vaultKp,
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

  const txSig = await sendAndConfirmOptimisedTx(
    [createInitializeVaultIx, createAddAdaptorIx],
    heliusRpcUrl,
    payerKp,
    [vaultKp]
  );

  await connection.confirmTransaction(txSig, "finalized");
  console.log(`Vault initialized and adaptor added with signature: ${txSig}`);
  console.log("Vault:", vault.toBase58());
};

const main = async () => {
  await initVaultAndAddAdaptorHandler();
};

main();

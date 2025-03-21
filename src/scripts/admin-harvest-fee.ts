import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import * as fs from "fs";
import { sendAndConfirmOptimisedTx, setupTokenAccount } from "../utils/helper";
import {
  adminFilePath,
  heliusRpcUrl,
  managerFilePath,
  vaultAddress,
} from "../variables";
import { VoltrClient } from "@voltr/vault-sdk";
import { PROTOCOL_ADMIN } from "../constants/global";

const adminKpFile = fs.readFileSync(adminFilePath, "utf-8");
const adminKpData = JSON.parse(adminKpFile);
const adminSecret = Uint8Array.from(adminKpData);
const adminKp = Keypair.fromSecretKey(adminSecret);
const admin = adminKp.publicKey;

const managerKpFile = fs.readFileSync(managerFilePath, "utf-8");
const managerKpData = JSON.parse(managerKpFile);
const managerSecret = Uint8Array.from(managerKpData);
const managerKp = Keypair.fromSecretKey(managerSecret);
const manager = managerKp.publicKey;

const protocolAdmin = new PublicKey(PROTOCOL_ADMIN);

const vault = new PublicKey(vaultAddress);

const connection = new Connection(heliusRpcUrl);
const vc = new VoltrClient(connection);

const harvestFeeHandler = async () => {
  let transactionIxs: TransactionInstruction[] = [];
  const lpMint = vc.findVaultLpMint(vault);

  await setupTokenAccount(connection, admin, lpMint, admin, transactionIxs);

  await setupTokenAccount(connection, admin, lpMint, manager, transactionIxs);

  await setupTokenAccount(
    connection,
    admin,
    lpMint,
    protocolAdmin,
    transactionIxs
  );

  const harvestFeeIx = await vc.createHarvestFeeIx({
    harvester: admin,
    vaultManager: manager,
    vaultAdmin: admin,
    protocolAdmin,
    vault,
  });

  transactionIxs.push(harvestFeeIx);

  const txSig = await sendAndConfirmOptimisedTx(
    transactionIxs,
    heliusRpcUrl,
    adminKp
  );

  console.log(`Harvested fee with signature: ${txSig}`);
};

const main = async () => {
  await harvestFeeHandler();
};

main();

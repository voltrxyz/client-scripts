// NOTE: THIS ASSUMES THE USER HAS REQUESTED A WITHDRAWAL, THROWS ERROR IF NOT
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import * as fs from "fs";
import { sendAndConfirmOptimisedTx } from "../utils/helper";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
} from "@solana/spl-token";
import { VoltrClient } from "@voltr/vault-sdk";
import {
  userFilePath,
  vaultAddress,
  assetMintAddress,
  heliusRpcUrl,
  assetTokenProgram,
} from "../variables";

const userKpFile = fs.readFileSync(userFilePath, "utf-8");
const userKpData = JSON.parse(userKpFile);
const userSecret = Uint8Array.from(userKpData);
const userKp = Keypair.fromSecretKey(userSecret);
const user = userKp.publicKey;

const vault = new PublicKey(vaultAddress);
const vaultAssetMint = new PublicKey(assetMintAddress);

const connection = new Connection(heliusRpcUrl);
const vc = new VoltrClient(connection);

const withdrawVaultHandler = async () => {
  let ixs: TransactionInstruction[] = [];
  const userAssetAta = getAssociatedTokenAddressSync(vaultAssetMint, user);
  const createUserAssetAtaIx =
    createAssociatedTokenAccountIdempotentInstruction(
      user,
      userAssetAta,
      user,
      vaultAssetMint
    );
  ixs.push(createUserAssetAtaIx);

  const withdrawVaultIx = await vc.createWithdrawVaultIx({
    vault,
    userTransferAuthority: user,
    vaultAssetMint,
    assetTokenProgram: new PublicKey(assetTokenProgram),
  });
  ixs.push(withdrawVaultIx);

  if (vaultAssetMint.equals(NATIVE_MINT)) {
    // Create close account instruction to convert wSOL back to SOL
    const closeWsolAccountIx = createCloseAccountInstruction(
      userAssetAta, // Account to close
      user, // Destination account (SOL will be sent here)
      user, // Authority
      [] // No multisig signers
    );
    ixs.push(closeWsolAccountIx);
  }

  const txSig = await sendAndConfirmOptimisedTx(ixs, heliusRpcUrl, userKp);
  console.log("Withdraw Vault Tx Sig: ", txSig);
};

withdrawVaultHandler();

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import * as fs from "fs";
import { BN } from "@coral-xyz/anchor";
import { sendAndConfirmOptimisedTx } from "../helper";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
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
  depositAmountVault,
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
const depositAmount = new BN(depositAmountVault);

const depositVaultHandler = async () => {
  let ixs: TransactionInstruction[] = [];
  if (vaultAssetMint.equals(NATIVE_MINT)) {
    // Find the WSOL Associated Token Account (ATA)
    const userWsolAta = getAssociatedTokenAddressSync(NATIVE_MINT, user);
    // Create WSOL ATA instruction
    const createWsolAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      user,
      userWsolAta,
      user,
      NATIVE_MINT
    );

    // Transfer SOL to WSOL ATA instruction
    const transferSolToWsolIx = SystemProgram.transfer({
      fromPubkey: user,
      toPubkey: userWsolAta,
      lamports: depositAmount.toNumber(),
    });

    // Sync native (convert SOL to WSOL) instruction
    const syncNativeIx = createSyncNativeInstruction(userWsolAta);

    ixs.push(createWsolAtaIx, transferSolToWsolIx, syncNativeIx);
  }

  const { vaultLpMint } = vc.findVaultAddresses(vault);
  const userLpAta = getAssociatedTokenAddressSync(vaultLpMint, user);
  const createUserLpAtaIx = createAssociatedTokenAccountIdempotentInstruction(
    user,
    userLpAta,
    user,
    vaultLpMint
  );
  ixs.push(createUserLpAtaIx);

  const depositVaultIx = await vc.createDepositVaultIx(depositAmount, {
    vault,
    userAuthority: user,
    vaultAssetMint,
    assetTokenProgram: new PublicKey(assetTokenProgram),
  });
  ixs.push(depositVaultIx);

  const txSig = await sendAndConfirmOptimisedTx(ixs, heliusRpcUrl, userKp);
  console.log("Deposit Vault Tx Sig: ", txSig);
};

depositVaultHandler();

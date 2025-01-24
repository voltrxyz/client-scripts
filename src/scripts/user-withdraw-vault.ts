import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import { BN } from "@coral-xyz/anchor";
import { sendAndConfirmOptimisedTx } from "./helper";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { VoltrClient } from "@voltr/vault-sdk";
import {
  userFilePath,
  vaultAddress,
  assetMintAddress,
  withdrawAmountPerStrategy,
  heliusRpcUrl,
} from "./variables";

const userKpFile = fs.readFileSync(userFilePath, "utf-8");
const userKpData = JSON.parse(userKpFile);
const userSecret = Uint8Array.from(userKpData);
const userKp = Keypair.fromSecretKey(userSecret);
const user = userKp.publicKey;

const vault = new PublicKey(vaultAddress);
const vaultAssetMint = new PublicKey(assetMintAddress);

const connection = new Connection(heliusRpcUrl);
const vc = new VoltrClient(connection);
const withdrawAmount = new BN(withdrawAmountPerStrategy);

const withdrawVaultHandler = async () => {
  const userAssetAta = getAssociatedTokenAddressSync(vaultAssetMint, user);
  const createUserAssetAtaIx =
    createAssociatedTokenAccountIdempotentInstruction(
      user,
      userAssetAta,
      user,
      vaultAssetMint
    );
  const withdrawVaultIx = await vc.createWithdrawIx(withdrawAmount, {
    vault,
    userAuthority: user,
    vaultAssetMint,
    assetTokenProgram: TOKEN_PROGRAM_ID,
  });

  const txSig = await sendAndConfirmOptimisedTx(
    [createUserAssetAtaIx, withdrawVaultIx],
    heliusRpcUrl,
    userKp
  );
  console.log("Withdraw Vault Tx Sig: ", txSig);
};

withdrawVaultHandler();

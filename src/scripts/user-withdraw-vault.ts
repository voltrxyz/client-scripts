import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import { BN } from "@coral-xyz/anchor";
import { sendAndConfirmOptimisedTx } from "./helper";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  ASSET_MINT_ADDRESS,
  HELIUS_RPC_URL,
  USER_FILE_PATH,
  VAULT_ADDRESS,
  WITHDRAW_AMOUNT,
} from "./constants";
import { VoltrClient } from "@voltr/vault-sdk";

const userKpFile = fs.readFileSync(USER_FILE_PATH, "utf-8");
const userKpData = JSON.parse(userKpFile);
const userSecret = Uint8Array.from(userKpData);
const userKp = Keypair.fromSecretKey(userSecret);
const user = userKp.publicKey;

const vault = new PublicKey(VAULT_ADDRESS);
const vaultAssetMint = new PublicKey(ASSET_MINT_ADDRESS);

const connection = new Connection(HELIUS_RPC_URL);
const vc = new VoltrClient(connection);
const withdrawAmount = new BN(WITHDRAW_AMOUNT);

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
    HELIUS_RPC_URL,
    userKp
  );
  console.log("Withdraw Vault Tx Sig: ", txSig);
};

withdrawVaultHandler();

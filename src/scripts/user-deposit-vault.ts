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
  DEPOSIT_AMOUNT,
  HELIUS_RPC_URL,
  USER_FILE_PATH,
  VAULT_ADDRESS,
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
const depositAmount = new BN(DEPOSIT_AMOUNT);

const depositVaultHandler = async () => {
  const { vaultLpMint } = vc.findVaultAddresses(vault);
  const userLpAta = getAssociatedTokenAddressSync(vaultLpMint, user);
  const createUserLpAtaIx = createAssociatedTokenAccountIdempotentInstruction(
    user,
    userLpAta,
    user,
    vaultLpMint
  );
  const depositVaultIx = await vc.createDepositIx(depositAmount, {
    vault,
    userAuthority: user,
    vaultAssetMint,
    assetTokenProgram: TOKEN_PROGRAM_ID,
  });

  const txSig = await sendAndConfirmOptimisedTx(
    [createUserLpAtaIx, depositVaultIx],
    HELIUS_RPC_URL,
    userKp
  );
  console.log("Deposit Vault Tx Sig: ", txSig);
};

depositVaultHandler();

import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import * as fs from "fs";
import { BN } from "@coral-xyz/anchor";
import { sendAndConfirmOptimisedTx } from "../helper";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  getAssociatedTokenAddressSync,
  getMint,
  NATIVE_MINT,
} from "@solana/spl-token";
import { REDEMPTION_FEE_PERCENTAGE_BPS, VoltrClient } from "@voltr/vault-sdk";
import {
  userFilePath,
  vaultAddress,
  assetMintAddress,
  heliusRpcUrl,
  assetTokenProgram,
  withdrawLpAmountVault,
  withdrawAssetAmountVault,
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
const withdrawLpAmount = new BN(withdrawLpAmountVault);
const withdrawAssetAmount = new BN(withdrawAssetAmountVault);

const withdrawVaultHandler = async (
  withdrawAmount: BN,
  isAmountInLp: boolean,
  isWithdrawAll: boolean
) => {
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

  const withdrawVaultIx = await vc.createWithdrawVaultIx(
    { amount: withdrawAmount, isAmountInLp, isWithdrawAll },
    {
      vault,
      userAuthority: user,
      vaultAssetMint,
      assetTokenProgram: new PublicKey(assetTokenProgram),
    }
  );
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

const withdrawVaultInLpAmountHandler = async (withdrawLpAmount: BN) => {
  await withdrawVaultHandler(withdrawLpAmount, true, false);
};

const withdrawVaultInAssetAmountHandler = async (withdrawAssetAmount: BN) => {
  await withdrawVaultHandler(withdrawAssetAmount, false, false);
};

const withdrawVaultAllHandler = async () => {
  // withdrawAmount can be any amount
  // isAmountInLp can be true or false
  await withdrawVaultHandler(new BN(0), false, true);
};

withdrawVaultInLpAmountHandler(withdrawLpAmount);
withdrawVaultInAssetAmountHandler(withdrawAssetAmount);
withdrawVaultAllHandler();

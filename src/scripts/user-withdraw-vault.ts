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

const withdrawVaultHandler = async (withdrawLpAmount: BN) => {
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

  const withdrawVaultIx = await vc.createWithdrawVaultIx(withdrawLpAmount, {
    vault,
    userAuthority: user,
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

const withdrawVaultInLpAmountHandler = async (withdrawLpAmount: BN) => {
  await withdrawVaultHandler(withdrawLpAmount);
};

const calculateLpForWithdraw = async (desiredAssetAmount: BN): Promise<BN> => {
  // Fetch vault data and LP supply info.
  const vaultAccount = await vc.fetchVaultAccount(vault);
  const totalValue = vaultAccount.asset.totalValue;

  const lpMint = vc.findVaultLpMint(vault);
  const lp = await getMint(connection, lpMint);
  const lpSupply = new BN(lp.supply.toString());

  // Validate inputs.
  if (lpSupply.lte(new BN(0))) throw new Error("Invalid LP supply");
  if (totalValue.lte(new BN(0))) throw new Error("Invalid total assets");

  // Reverse engineer the LP tokens required to withdraw the desired asset amount.
  //
  // Original calculation:
  //   withdrawnAsset = ((lpAmount * totalValue) / lpSupply) * ((10000 - feeBps) / 10000)
  const feeFactor = new BN(10000 - REDEMPTION_FEE_PERCENTAGE_BPS);
  const numerator = desiredAssetAmount.mul(lpSupply).mul(new BN(10000));
  const denominator = totalValue.mul(feeFactor);

  // Perform division and round up if there is a remainder.
  let lpNeeded = numerator.div(denominator);
  if (!numerator.mod(denominator).eq(new BN(0))) {
    lpNeeded = lpNeeded.add(new BN(1));
  }

  return lpNeeded;
};

const withdrawVaultInAssetAmountHandler = async (withdrawAssetAmount: BN) => {
  const lpAmount = await calculateLpForWithdraw(withdrawAssetAmount);
  await withdrawVaultHandler(lpAmount);
};

withdrawVaultInLpAmountHandler(withdrawLpAmount);
withdrawVaultInAssetAmountHandler(withdrawAssetAmount);

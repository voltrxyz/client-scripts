// NOTE: THIS ONLY WORKS IF AND ONLY IF WITHDAWAL WAITING PERIOD IS 0
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import * as fs from "fs";
import { BN } from "@coral-xyz/anchor";
import { sendAndConfirmOptimisedTx, setupTokenAccount } from "../utils/helper";
import { createCloseAccountInstruction, NATIVE_MINT } from "@solana/spl-token";
import { RequestWithdrawVaultArgs, VoltrClient } from "@voltr/vault-sdk";
import {
  userFilePath,
  vaultAddress,
  heliusRpcUrl,
  withdrawLpAmountVault,
  withdrawAssetAmountVault,
  assetMintAddress,
  assetTokenProgram,
} from "../variables";

const userKpFile = fs.readFileSync(userFilePath, "utf-8");
const userKpData = JSON.parse(userKpFile);
const userSecret = Uint8Array.from(userKpData);
const userKp = Keypair.fromSecretKey(userSecret);
const user = userKp.publicKey;

const vault = new PublicKey(vaultAddress);
const vaultAssetMint = new PublicKey(assetMintAddress);
const vaultAssetTokenProgram = new PublicKey(assetTokenProgram);

const connection = new Connection(heliusRpcUrl);
const vc = new VoltrClient(connection);
const withdrawLpAmount = new BN(withdrawLpAmountVault);
const withdrawAssetAmount = new BN(withdrawAssetAmountVault);

const createrequestWithdrawVaultIxs = async (
  withdrawAmount: BN,
  isAmountInLp: boolean,
  isWithdrawAll: boolean
) => {
  const vaultLpMint = vc.findVaultLpMint(vault);
  const requestWithdrawVaultReceipt = vc.findRequestWithdrawVaultReceipt(
    vault,
    user
  );
  let ixs: TransactionInstruction[] = [];
  const _requestWithdrawLpAta = await setupTokenAccount(
    connection,
    user,
    vaultLpMint,
    requestWithdrawVaultReceipt,
    ixs
  );

  const requestWithdrawVaultArgs: RequestWithdrawVaultArgs = {
    amount: withdrawAmount,
    isAmountInLp,
    isWithdrawAll,
  };

  const requestWithdrawVaultIx = await vc.createRequestWithdrawVaultIx(
    requestWithdrawVaultArgs,
    {
      payer: user,
      userTransferAuthority: user,
      vault,
    }
  );
  ixs.push(requestWithdrawVaultIx);

  return ixs;
};

const createWithdrawVaultIxs = async () => {
  let ixs: TransactionInstruction[] = [];
  const userAssetAta = await setupTokenAccount(
    connection,
    user,
    vaultAssetMint,
    user,
    ixs,
    vaultAssetTokenProgram
  );

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

  return ixs;
};

const requestWithdrawVaultInLpAmountHandler = async (withdrawLpAmount: BN) => {
  const requestWithdrawVaultIxs = await createrequestWithdrawVaultIxs(
    withdrawLpAmount,
    true,
    false
  );
  const withdrawVaultIxs = await createWithdrawVaultIxs();
  const requestAndWithdrawVaultIxs = [
    ...requestWithdrawVaultIxs,
    ...withdrawVaultIxs,
  ];

  const txSig = await sendAndConfirmOptimisedTx(
    requestAndWithdrawVaultIxs,
    heliusRpcUrl,
    userKp
  );
  console.log("Request and Withdraw Vault In Lp Amount Tx Sig: ", txSig);
};

const requestWithdrawVaultInAssetAmountHandler = async (
  withdrawAssetAmount: BN
) => {
  const requestWithdrawVaultIxs = await createrequestWithdrawVaultIxs(
    withdrawAssetAmount,
    false,
    false
  );
  const withdrawVaultIxs = await createWithdrawVaultIxs();
  const requestAndWithdrawVaultIxs = [
    ...requestWithdrawVaultIxs,
    ...withdrawVaultIxs,
  ];

  const txSig = await sendAndConfirmOptimisedTx(
    requestAndWithdrawVaultIxs,
    heliusRpcUrl,
    userKp
  );
  console.log("Request and Withdraw Vault In Asset Amount Tx Sig: ", txSig);
};
const requestWithdrawVaultAllHandler = async () => {
  // withdrawAmount can be any amount
  // isAmountInLp can be true or false
  const requestWithdrawVaultIxs = await createrequestWithdrawVaultIxs(
    new BN(0),
    false,
    true
  );
  const withdrawVaultIxs = await createWithdrawVaultIxs();
  const requestAndWithdrawVaultIxs = [
    ...requestWithdrawVaultIxs,
    ...withdrawVaultIxs,
  ];

  const txSig = await sendAndConfirmOptimisedTx(
    requestAndWithdrawVaultIxs,
    heliusRpcUrl,
    userKp
  );
  console.log("Request and Withdraw Vault All Tx Sig: ", txSig);
};

// NOTE: YOU CANNOT RUN 3 ALL HANDLERS AT THE SAME TIME, WILL FAIL
// MAKE SURE THAT THE RECEIPT HAS BEEN CLAIMED OR CANCELLED BEFORE RUNNING THE NEXT HANDLER
requestWithdrawVaultInLpAmountHandler(withdrawLpAmount);
requestWithdrawVaultInAssetAmountHandler(withdrawAssetAmount);
requestWithdrawVaultAllHandler();

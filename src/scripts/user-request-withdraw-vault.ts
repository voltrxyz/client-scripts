// NOTE: ONLY ONE REQUEST WITHDRAWAL CAN BE MADE AT A TIME, WILL FAIL IF ANOTHER REQUEST WITHDRAWAL IS PENDING/NOT CLAIMED
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import * as fs from "fs";
import { BN } from "@coral-xyz/anchor";
import { sendAndConfirmOptimisedTx, setupTokenAccount } from "../utils/helper";
import { RequestWithdrawVaultArgs, VoltrClient } from "@voltr/vault-sdk";
import {
  userFilePath,
  vaultAddress,
  heliusRpcUrl,
  withdrawLpAmountVault,
  withdrawAssetAmountVault,
} from "../variables";

const userKpFile = fs.readFileSync(userFilePath, "utf-8");
const userKpData = JSON.parse(userKpFile);
const userSecret = Uint8Array.from(userKpData);
const userKp = Keypair.fromSecretKey(userSecret);
const user = userKp.publicKey;

const vault = new PublicKey(vaultAddress);

const connection = new Connection(heliusRpcUrl);
const vc = new VoltrClient(connection);
const withdrawLpAmount = new BN(withdrawLpAmountVault);
const withdrawAssetAmount = new BN(withdrawAssetAmountVault);

const requestWithdrawVaultHandler = async (
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

  const txSig = await sendAndConfirmOptimisedTx(ixs, heliusRpcUrl, userKp);
  console.log("Request Withdraw Vault Tx Sig: ", txSig);
};

const requestWithdrawVaultInLpAmountHandler = async (withdrawLpAmount: BN) => {
  await requestWithdrawVaultHandler(withdrawLpAmount, true, false);
};

const requestWithdrawVaultInAssetAmountHandler = async (
  withdrawAssetAmount: BN
) => {
  await requestWithdrawVaultHandler(withdrawAssetAmount, false, false);
};

const requestWithdrawVaultAllHandler = async () => {
  // withdrawAmount can be any amount
  // isAmountInLp can be true or false
  await requestWithdrawVaultHandler(new BN(0), false, true);
};

// NOTE: YOU CANNOT RUN 3 ALL HANDLERS AT THE SAME TIME, WILL FAIL
// MAKE SURE THAT THE RECEIPT HAS BEEN CLAIMED OR CANCELLED BEFORE RUNNING THE NEXT HANDLER
requestWithdrawVaultInLpAmountHandler(withdrawLpAmount);
requestWithdrawVaultInAssetAmountHandler(withdrawAssetAmount);
requestWithdrawVaultAllHandler();

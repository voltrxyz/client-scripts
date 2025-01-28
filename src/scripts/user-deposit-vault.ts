import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import { BN } from "@coral-xyz/anchor";
import { sendAndConfirmOptimisedTx } from "../helper";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
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
  const { vaultLpMint } = vc.findVaultAddresses(vault);
  const userLpAta = getAssociatedTokenAddressSync(vaultLpMint, user);
  const createUserLpAtaIx = createAssociatedTokenAccountIdempotentInstruction(
    user,
    userLpAta,
    user,
    vaultLpMint
  );
  const depositVaultIx = await vc.createDepositVaultIx(depositAmount, {
    vault,
    userAuthority: user,
    vaultAssetMint,
    assetTokenProgram: new PublicKey(assetTokenProgram),
  });

  const txSig = await sendAndConfirmOptimisedTx(
    [createUserLpAtaIx, depositVaultIx],
    heliusRpcUrl,
    userKp
  );
  console.log("Deposit Vault Tx Sig: ", txSig);
};

depositVaultHandler();

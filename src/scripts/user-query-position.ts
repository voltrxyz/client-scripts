import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import {
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token";
import { VoltrClient } from "@voltr/vault-sdk";
import { userFilePath, vaultAddress, heliusRpcUrl } from "../variables";
import { BN } from "@coral-xyz/anchor";

const userKpFile = fs.readFileSync(userFilePath, "utf-8");
const userKpData = JSON.parse(userKpFile);
const userSecret = Uint8Array.from(userKpData);
const userKp = Keypair.fromSecretKey(userSecret);
const user = userKp.publicKey;

const vault = new PublicKey(vaultAddress);

const connection = new Connection(heliusRpcUrl);
const vc = new VoltrClient(connection);

const getUserPosition = async () => {
  const { vaultLpMint } = vc.findVaultAddresses(vault);
  const userLpAta = getAssociatedTokenAddressSync(vaultLpMint, user);
  const userLpAtaAccount = await getAccount(connection, userLpAta);
  const userLpAmount = userLpAtaAccount.amount;

  console.log("User Lp Amount: ", userLpAmount.toString());
  const vaultLpMintAccount = await getMint(connection, vaultLpMint);
  const totalLpSupply = vaultLpMintAccount.supply;
  const vaultAccount = await vc.fetchVaultAccount(vault);
  const vaultAssetTotalValue = vaultAccount.asset.totalValue;
  const userLpShareRatioNumber = Number(userLpAmount) / Number(totalLpSupply);
  const userAssetAmount =
    vaultAssetTotalValue.toNumber() * userLpShareRatioNumber;

  console.log(
    "User Asset Amount (Before Redemption Fee & Degradation): ",
    userAssetAmount.toString()
  );

  const userAssetAmountAfterWithdrawalFee = await vc.calculateAssetsForWithdraw(
    vault,
    new BN(userLpAmount.toString())
  );

  console.log(
    "User Asset Amount (After Redemption Fee & Degradation): ",
    userAssetAmountAfterWithdrawalFee.toString()
  );
};

getUserPosition();

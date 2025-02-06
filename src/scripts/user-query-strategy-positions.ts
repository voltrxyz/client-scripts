import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import {
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token";
import { VoltrClient } from "@voltr/vault-sdk";
import { userFilePath, vaultAddress, heliusRpcUrl } from "../variables";
import {
  getKlendStrategyPosition,
  getDriftStrategyPosition,
  getMarginfiStrategyPosition,
  getSolendStrategyPosition,
} from "./all-query-strategy-positions";
import { BN } from "@coral-xyz/anchor";
import { PROTOCOL_CONSTANTS } from "../constants";

const userKpFile = fs.readFileSync(userFilePath, "utf-8");
const userKpData = JSON.parse(userKpFile);
const userSecret = Uint8Array.from(userKpData);
const userKp = Keypair.fromSecretKey(userSecret);
const user = userKp.publicKey;

const vault = new PublicKey(vaultAddress);

const connection = new Connection(heliusRpcUrl);
const vc = new VoltrClient(connection);

const getUserLpShareRatio = async () => {
  const { vaultLpMint } = vc.findVaultAddresses(vault);
  const vaultLpMintAccount = await getMint(connection, vaultLpMint);
  const totalLpSupply = vaultLpMintAccount.supply;
  const userLpAta = getAssociatedTokenAddressSync(vaultLpMint, user);
  const userLpAtaAccount = await getAccount(connection, userLpAta);
  const userLpAmount = userLpAtaAccount.amount;
  const userLpShareRatio = userLpAmount / totalLpSupply;
  const userLpShareRatioNumber = Number(userLpShareRatio);

  const [
    allSolendStrategyPosition,
    allMarginfiStrategyPosition,
    allKlendStrategyPosition,
    allDriftStrategyPosition,
  ]: BN[] = await Promise.all([
    getSolendStrategyPosition(
      new PublicKey(PROTOCOL_CONSTANTS.SOLEND.MAIN_MARKET.USDC.COUNTERPARTY_TA)
    ),
    getMarginfiStrategyPosition(
      new PublicKey(PROTOCOL_CONSTANTS.MARGINFI.PROGRAM_ID),
      new PublicKey(PROTOCOL_CONSTANTS.MARGINFI.MAIN_MARKET.USDC.BANK)
    ),
    getKlendStrategyPosition(
      new PublicKey(PROTOCOL_CONSTANTS.KLEND.PROGRAM_ID),
      new PublicKey(PROTOCOL_CONSTANTS.KLEND.MAIN_MARKET.LENDING_MARKET)
    ),
    getDriftStrategyPosition(
      new PublicKey(PROTOCOL_CONSTANTS.DRIFT.PROGRAM_ID),
      new BN(PROTOCOL_CONSTANTS.DRIFT.SPOT.USDC.MARKET_INDEX)
    ),
  ]);

  const vaultAccount = await vc.fetchVaultAccount(vault);
  const vaultTotalValue = vaultAccount.asset.totalValue;
  const vaultIdleValue = vaultTotalValue.sub(
    allSolendStrategyPosition
      .add(allMarginfiStrategyPosition)
      .add(allKlendStrategyPosition)
      .add(allDriftStrategyPosition)
  );

  const userIdlePosition = vaultIdleValue.mul(userLpShareRatioNumber);
  const userSolendStrategyPosition = allSolendStrategyPosition.mul(
    userLpShareRatioNumber
  );
  const userMarginfiStrategyPosition = allMarginfiStrategyPosition.mul(
    userLpShareRatioNumber
  );
  const userKlendStrategyPosition = allKlendStrategyPosition.mul(
    userLpShareRatioNumber
  );
  const userDriftStrategyPosition = allDriftStrategyPosition.mul(
    userLpShareRatioNumber
  );

  console.log("userIdlePosition: ", userIdlePosition.toString());
  console.log(
    "userSolendStrategyPosition: ",
    userSolendStrategyPosition.toString()
  );
  console.log(
    "userMarginfiStrategyPosition: ",
    userMarginfiStrategyPosition.toString()
  );
  console.log(
    "userKlendStrategyPosition: ",
    userKlendStrategyPosition.toString()
  );
  console.log(
    "userDriftStrategyPosition: ",
    userDriftStrategyPosition.toString()
  );
};

getUserLpShareRatio();

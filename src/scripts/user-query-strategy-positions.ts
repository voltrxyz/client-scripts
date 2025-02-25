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
import { PROTOCOL_CONSTANTS } from "../constants";
import {
  getDriftStrategyPosition,
  getKlendStrategyPosition,
  getMarginfiStrategyPosition,
  getSolendStrategyPosition,
  getVaultIdlePosition,
} from "../utils/get-strategy-position-value";

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
  const userLpShareRatioNumber = Number(userLpAmount) / Number(totalLpSupply);

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

  const vaultIdleValue = await getVaultIdlePosition(
    allSolendStrategyPosition
      .add(allMarginfiStrategyPosition)
      .add(allKlendStrategyPosition)
      .add(allDriftStrategyPosition)
  );

  const userIdlePosition = Math.floor(
    Number(vaultIdleValue) * userLpShareRatioNumber
  );
  const userSolendStrategyPosition = Math.floor(
    Number(allSolendStrategyPosition) * userLpShareRatioNumber
  );
  const userMarginfiStrategyPosition = Math.floor(
    Number(allMarginfiStrategyPosition) * userLpShareRatioNumber
  );
  const userKlendStrategyPosition = Math.floor(
    Number(allKlendStrategyPosition) * userLpShareRatioNumber
  );
  const userDriftStrategyPosition = Math.floor(
    Number(allDriftStrategyPosition) * userLpShareRatioNumber
  );

  console.log("USER POSITIONS--------------------------------");

  console.log("Idle position value: ", userIdlePosition.toString());
  console.log("Solend position value: ", userSolendStrategyPosition.toString());
  console.log(
    "Marginfi position value: ",
    userMarginfiStrategyPosition.toString()
  );
  console.log("Klend position value: ", userKlendStrategyPosition.toString());
  console.log("Drift position value: ", userDriftStrategyPosition.toString());
};

getUserLpShareRatio();

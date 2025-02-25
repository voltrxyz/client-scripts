import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { PROTOCOL_CONSTANTS } from "../constants";
import {
  getDriftStrategyPosition,
  getKlendStrategyPosition,
  getMarginfiStrategyPosition,
  getSolendStrategyPosition,
  getVaultIdlePosition,
} from "../utils/get-strategy-position-value";

const main = async () => {
  const [
    solendStrategyPosition,
    marginfiStrategyPosition,
    klendStrategyPosition,
    driftStrategyPosition,
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

  console.log("VAULT TOTAL POSITIONS--------------------------------");

  const vaultIdleValue = await getVaultIdlePosition(
    solendStrategyPosition
      .add(marginfiStrategyPosition)
      .add(klendStrategyPosition)
      .add(driftStrategyPosition)
  );

  console.log("Idle position value: ", vaultIdleValue.toString());
  console.log("Solend position value: ", solendStrategyPosition.toString());
  console.log("Marginfi position value: ", marginfiStrategyPosition.toString());
  console.log("Klend position value: ", klendStrategyPosition.toString());
  console.log("Drift position value: ", driftStrategyPosition.toString());
};

main();

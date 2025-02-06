import { Connection, PublicKey } from "@solana/web3.js";
import {
  DEFAULT_ADAPTOR_PROGRAM_ID,
  SEEDS,
  VoltrClient,
} from "@voltr/vault-sdk";
import { assetMintAddress, heliusRpcUrl, vaultAddress } from "../variables";
import { BN } from "@coral-xyz/anchor";
import { PROTOCOL_CONSTANTS } from "../constants";

const vault = new PublicKey(vaultAddress);
const vaultAssetMint = new PublicKey(assetMintAddress);

const connection = new Connection(heliusRpcUrl);
const vc = new VoltrClient(connection);

const findAndFetchStrategyPosition = async (
  vault: PublicKey,
  strategy: PublicKey
) => {
  const strategyInitReceipt = vc.findStrategyInitReceipt(vault, strategy);
  const strategyAccount = await vc.fetchStrategyInitReceiptAccount(
    strategyInitReceipt
  );

  return strategyAccount.positionValue;
};

export const getSolendStrategyPosition = async (counterPartyTa: PublicKey) => {
  const [strategy] = PublicKey.findProgramAddressSync(
    [SEEDS.STRATEGY, counterPartyTa.toBuffer()],
    DEFAULT_ADAPTOR_PROGRAM_ID
  );

  return findAndFetchStrategyPosition(vault, strategy);
};

export const getMarginfiStrategyPosition = async (
  protocolProgram: PublicKey,
  bank: PublicKey
) => {
  const [counterPartyTa] = PublicKey.findProgramAddressSync(
    [Buffer.from("liquidity_vault"), bank.toBuffer()],
    protocolProgram
  );

  const [strategy] = PublicKey.findProgramAddressSync(
    [SEEDS.STRATEGY, counterPartyTa.toBuffer()],
    DEFAULT_ADAPTOR_PROGRAM_ID
  );

  return findAndFetchStrategyPosition(vault, strategy);
};

export const getKlendStrategyPosition = async (
  protocolProgram: PublicKey,
  lendingMarket: PublicKey
) => {
  const [counterPartyTa] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("reserve_liq_supply"),
      lendingMarket.toBuffer(),
      vaultAssetMint.toBuffer(),
    ],
    protocolProgram
  );

  const [strategy] = PublicKey.findProgramAddressSync(
    [SEEDS.STRATEGY, counterPartyTa.toBuffer()],
    DEFAULT_ADAPTOR_PROGRAM_ID
  );

  return findAndFetchStrategyPosition(vault, strategy);
};

export const getDriftStrategyPosition = async (
  protocolProgram: PublicKey,
  marketIndex: BN
) => {
  const [counterPartyTa] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("spot_market_vault"),
      marketIndex.toArrayLike(Buffer, "le", 2),
    ],
    protocolProgram
  );

  const [strategy] = PublicKey.findProgramAddressSync(
    [SEEDS.STRATEGY, counterPartyTa.toBuffer()],
    DEFAULT_ADAPTOR_PROGRAM_ID
  );

  return findAndFetchStrategyPosition(vault, strategy);
};

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

  const vaultAccount = await vc.fetchVaultAccount(vault);
  const vaultTotalValue = vaultAccount.asset.totalValue;

  console.log(
    "vaultTotalValue including idle tokens: ",
    vaultTotalValue.toString()
  );
  console.log("solendStrategyPosition: ", solendStrategyPosition.toString());
  console.log(
    "marginfiStrategyPosition: ",
    marginfiStrategyPosition.toString()
  );
  console.log("klendStrategyPosition: ", klendStrategyPosition.toString());
  console.log("driftStrategyPosition: ", driftStrategyPosition.toString());
};

main();

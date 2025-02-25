import { Connection, PublicKey } from "@solana/web3.js";
import {
  LENDING_ADAPTOR_PROGRAM_ID,
  SEEDS,
  VoltrClient,
} from "@voltr/vault-sdk";
import { BN } from "@coral-xyz/anchor";
import { assetMintAddress, heliusRpcUrl, vaultAddress } from "../variables";

const connection = new Connection(heliusRpcUrl);
const vc = new VoltrClient(connection);
const vaultAssetMint = new PublicKey(assetMintAddress);
const vault = new PublicKey(vaultAddress);

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
    LENDING_ADAPTOR_PROGRAM_ID
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
    LENDING_ADAPTOR_PROGRAM_ID
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
    LENDING_ADAPTOR_PROGRAM_ID
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
    LENDING_ADAPTOR_PROGRAM_ID
  );

  return findAndFetchStrategyPosition(vault, strategy);
};

export const getVaultIdlePosition = async (summedPositionValues: BN) => {
  const vaultAccount = await vc.fetchVaultAccount(vault);
  const vaultTotalValue = vaultAccount.asset.totalValue;
  const vaultIdleValue = vaultTotalValue.sub(summedPositionValues);
  return vaultIdleValue;
};

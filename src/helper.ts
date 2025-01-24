import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  sendAndConfirmTransaction,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

export const sendAndConfirmOptimisedTx = async (
  instructions: TransactionInstruction[],
  heliusRpcUrl: string,
  payerKp: Keypair,
  signers: Keypair[] = []
) => {
  const connection = new Connection(heliusRpcUrl);
  const testInstructions = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
    ...instructions,
  ];

  const testTransaction = new VersionedTransaction(
    new TransactionMessage({
      instructions: testInstructions,
      payerKey: payerKp.publicKey,
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    }).compileToV0Message()
  );

  const rpcResponse = await connection.simulateTransaction(testTransaction, {
    replaceRecentBlockhash: true,
    sigVerify: false,
  });

  const requiredCUs = rpcResponse.value.unitsConsumed;

  if (!requiredCUs) {
    throw new Error("Failed to get required CUs");
  }

  const optimalCUs = requiredCUs * 1.1;

  const computeUnitIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: optimalCUs,
  });

  instructions.push(computeUnitIx);

  const transaction = new Transaction();
  transaction.add(...instructions);

  transaction.recentBlockhash = (
    await connection.getLatestBlockhash()
  ).blockhash;

  transaction.feePayer = payerKp.publicKey;
  transaction.sign(payerKp, ...signers);
  const response = await fetch(heliusRpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "1",
      method: "getPriorityFeeEstimate",
      params: [
        {
          transaction: bs58.encode(transaction.serialize()), // Pass the serialized transaction in Base58
          options: { priorityLevel: "High" },
        },
      ],
    }),
  });
  const data = await response.json();
  const feeEstimate = data.result;

  if (!feeEstimate) {
    throw new Error("Failed to get fee estimate");
  }

  const computePriceIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: feeEstimate.priorityFeeEstimate,
  });
  transaction.add(computePriceIx);

  const txSig = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payerKp, ...signers],
    {
      skipPreflight: false,
      preflightCommitment: "confirmed",
      maxRetries: 5,
    }
  );

  return txSig;
};

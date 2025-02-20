import { toast } from "sonner";
import { getClient, formatXRPAmount, formatXRPLDate, hexToAscii } from "./utils";
import type { 
  Transaction, 
  TransactionDetail,
  XRPLTransaction,
  TransactionMetadata,
  AccountTxResponse,
  AccountTxTransaction 
} from "./types";

export const fetchTransactionDetails = async (hash: string): Promise<TransactionDetail | null> => {
  let client = null;
  try {
    client = await getClient();
    console.log("Fetching transaction details for hash:", hash);
    
    const response = await client.request({
      command: "tx",
      transaction: hash,
      binary: false
    });

    if (!response.result) {
      console.warn("No transaction details found");
      return null;
    }

    console.log("Raw transaction details:", response.result);
    
    const txInfo = response.result;
    // Use tx_json if available; otherwise use the top-level object.
    const txJson = txInfo.tx_json || txInfo;
    console.log("Using transaction data:", txJson);
    
    const memoData = txJson.Memos?.[0]?.Memo?.MemoData;
    const memo = memoData ? hexToAscii(memoData) : undefined;

    const amount = txInfo.meta?.delivered_amount || txJson.Amount || txJson.DeliverMax;
    const feeRaw = txJson.Fee || txJson.fee || "0";

    const fromValue = txJson.Account || txJson.account || "Unknown";
    const destinationValue = txJson.Destination || txJson.destination;
    const typeValue = txJson.TransactionType || txJson.transaction_type;

    const destination = destinationValue || (typeValue === "OfferCreate" ? "XRPL DEX" : "Unknown");
    const finalType = typeValue || "Unknown";

    const transactionDetail: TransactionDetail = {
      hash: txInfo.hash,
      type: finalType,
      date: txJson.date ? formatXRPLDate(txJson.date) : txInfo.close_time_iso || "Unknown",
      amount: formatXRPAmount(amount),
      fee: formatXRPAmount(feeRaw),
      status: txInfo.meta.TransactionResult,
      sourceTag: txJson.SourceTag?.toString(),
      from: fromValue,
      to: destination,
      memo,
      isBitbob: (txJson.SourceTag === 29202152 || txJson.SourceTag === "29202152" || (memo && memo.startsWith("BitBob"))),
      sequence: txJson.Sequence,
      flags: Number(txJson.Flags),
      lastLedgerSequence: txJson.LastLedgerSequence,
      ticketSequence: txJson.TicketSequence,
      memos: txJson.Memos?.map((memoObj: any) =>
        memoObj.Memo?.MemoData ? hexToAscii(memoObj.Memo.MemoData) : ""
      ).filter(Boolean) ?? [],
      raw: txInfo
    };

    // Cache the account from the transaction or fallback to a demo address.
    const lastAddress = fromValue !== "Unknown" ? fromValue : "rHNTXD6a7VfFzQK9bNMkX4kYD8nLjhgb32";
    sessionStorage.setItem(`tx_${hash}`, JSON.stringify(transactionDetail));
    sessionStorage.setItem("last_accessed_address", lastAddress);

    console.log("Processed transaction detail:", transactionDetail);
    return transactionDetail;
  } catch (error) {
    console.error("Error fetching transaction details:", error);
    toast.error("Failed to fetch transaction details");
    return null;
  } finally {
    if (client) {
      await client.disconnect();
    }
  }
};



const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchTransactions = async (address: string): Promise<Transaction[]> => {
  let client = null;
  try {
    client = await getClient();
    console.log(`[XRPL] Fetching transactions for address:`, address);

    await delay(1500);
    
    const response = await client.request({
      command: "account_tx",
      account: address,
      binary: false,
      ledger_index_min: -1,
      ledger_index_max: -1,
      limit: 200,
      forward: false
    });

    // Store raw response for debugging
    (window as any).__xrpl_debug_response = response;
    
    console.log("[XRPL] Raw response:", response);

    if (!response.result?.transactions?.length) {
      console.warn("[XRPL] No transactions found in response");
      return [];
    }

    const transactions = response.result.transactions
    .map(tx => {
      const txData = tx.tx_json;
      const meta = tx.meta;
      const closeTimeIso = tx.close_time_iso;
      const hash = tx.hash;
      
      if (!txData || !meta || !hash) {
        console.warn("[XRPL] Invalid transaction data:", tx);
        return null;
      }
      
      // Debug logging: inspect txData and meta for Payment transactions
      console.log("Mapping transaction:", { hash, txData, meta });
      
      // Check both upper and lower-case keys
      const accountField = txData.Account || txData.account || "Unknown";
      const destinationField = txData.Destination || txData.destination; 
      const transactionType = txData.TransactionType || txData.transaction_type;
    
      // For 'to', if destinationField is not found, and if it's an OfferCreate, set to "XRPL DEX", else "Unknown"
      const destination = destinationField ? destinationField : (transactionType === "OfferCreate" ? "XRPL DEX" : "Unknown");
    
      let amount = "0";
      if (meta.delivered_amount) {
        amount = meta.delivered_amount;
      } else if (txData.DeliverMax) {
        amount = txData.DeliverMax;
      } else if (typeof txData.Amount === "string") {
        amount = txData.Amount;
      } else if (txData.Amount?.value) {
        amount = txData.Amount.value;
      }
    
      // Fallback for fee: check both uppercase and lowercase keys
      const feeRaw = txData.Fee || txData.fee || meta.Fee || "0";
    
      let isBitbob = false;
      let memo = "";
    
      if (txData.SourceTag === 29202152 || txData.SourceTag === "29202152") {
        isBitbob = true;
      }
    
      if (txData.Memos?.length > 0) {
        const memoData = txData.Memos[0]?.Memo?.MemoData;
        if (memoData) {
          memo = hexToAscii(memoData);
          if (memo.startsWith("BitBob")) {
            isBitbob = true;
          }
        }
      }
    
      // Use ISO timestamp if available; otherwise fallback to UNIX timestamp from txData.date
      const timestamp = closeTimeIso ? new Date(closeTimeIso).getTime() / 1000 : txData.date;
    
      return {
        hash: hash,
        type: transactionType || "Unknown",
        date: formatXRPLDate(timestamp),
        amount: formatXRPAmount(amount),
        fee: formatXRPAmount(feeRaw),
        status: meta.TransactionResult,
        sourceTag: txData.SourceTag?.toString(),
        from: accountField,
        to: destination,
        memo: memo || undefined,
        isBitbob
      } as Transaction;
    })
    .filter((tx): tx is Transaction => {
      const isValid = Boolean(tx?.hash && tx?.from && tx?.status);
      if (!isValid) {
        console.warn("[XRPL] Filtered out invalid transaction:", tx);
      }
      return isValid;
    });
  
  

    console.log(`[XRPL] Successfully processed ${transactions.length} transactions`);
    return transactions;

  } catch (error) {
    console.error("[XRPL] Error fetching transactions:", error);
    toast.error("Failed to fetch transactions");
    return [];
  } finally {
    if (client) {
      await client.disconnect();
      console.log("[XRPL] Client disconnected");
    }
  }
};

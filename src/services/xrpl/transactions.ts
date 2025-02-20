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
    const memoData = txInfo.Memos?.[0]?.Memo?.MemoData;
    const memo = memoData ? hexToAscii(memoData) : undefined;

    const amount = txInfo.meta?.delivered_amount || txInfo.Amount || txInfo.DeliverMax;
    // Fallback for fee: if Fee is not present, use a default or "0"
    const feeRaw = txInfo.Fee || "0";

    const transactionDetail: TransactionDetail = {
      hash: txInfo.hash,
      type: txInfo.TransactionType || txInfo.transaction_type || "Unknown",
      date: txInfo.date ? formatXRPLDate(txInfo.date) : txInfo.close_time_iso || "Unknown",
      amount: formatXRPAmount(amount),
      fee: formatXRPAmount(feeRaw),
      status: txInfo.meta.TransactionResult,
      sourceTag: txInfo.SourceTag?.toString(),
      from: txInfo.Account || txInfo.account || "Unknown",
      to: txInfo.Destination || txInfo.destination || ( (txInfo.TransactionType || txInfo.transaction_type) === "OfferCreate" ? "XRPL DEX" : "Unknown" ),
      memo,
      isBitbob: (txInfo.SourceTag === 29202152 || txInfo.SourceTag === "29202152" || (memo && memo.startsWith("BitBob"))),
      sequence: txInfo.Sequence,
      flags: Number(txInfo.Flags),
      lastLedgerSequence: txInfo.LastLedgerSequence,
      ticketSequence: txInfo.TicketSequence,
      memos: txInfo.Memos?.map((memoObj: any) =>
      memoObj.Memo?.MemoData ? hexToAscii(memoObj.Memo.MemoData) : ""
    ).filter(Boolean) ?? [],
    raw: txInfo
    };

    // Cache transaction details and last accessed address
    sessionStorage.setItem(`tx_${hash}`, JSON.stringify(transactionDetail));
    sessionStorage.setItem("last_accessed_address", txInfo.Account);

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
      
      // Use fallback to lower-case keys if uppercase not found.
      let accountField = txData.Account || txData.account;
      let destinationField = txData.Destination || txData.destination;
      let transactionType = txData.TransactionType || txData.transaction_type;
  
      // Fallback: if destination or type are missing, try to get them from meta
      if (!destinationField && meta && meta.Destination) {
        destinationField = meta.Destination;
      }
      if (!transactionType && meta && meta.TransactionType) {
        transactionType = meta.TransactionType;
      }
  
      const destination = destinationField || (transactionType === "OfferCreate" ? "XRPL DEX" : "Unknown");
  
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
  
      // Fallback for fee: check both uppercase and lowercase
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
  
      // Use ISO timestamp if available, otherwise fallback to UNIX timestamp
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

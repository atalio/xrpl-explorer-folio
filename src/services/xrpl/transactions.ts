
import { toast } from "sonner";
import { getClient, formatXRPAmount, formatXRPLDate, hexToAscii } from './utils';
import type { 
  Transaction, 
  TransactionDetail,
  XRPLTransaction,
  TransactionMetadata,
  AccountTxResponse,
  AccountTxTransaction 
} from './types';

export const fetchTransactionDetails = async (hash: string): Promise<TransactionDetail | null> => {
  let client = null;
  try {
    client = await getClient();
    console.log('Fetching transaction details for hash:', hash);
    
    const response = await client.request({
      command: "tx",
      transaction: hash,
      binary: false
    });

    if (!response.result) {
      console.warn('No transaction details found');
      return null;
    }

    console.log('Raw transaction details:', response.result);
    
    const txInfo = response.result;
    const memoData = txInfo.Memos?.[0]?.Memo?.MemoData;
    const memo = memoData ? hexToAscii(memoData) : undefined;

    const transactionDetail: TransactionDetail = {
      hash: txInfo.hash as string,
      type: txInfo.TransactionType as string,
      date: formatXRPLDate(txInfo.date as number),
      amount: formatXRPAmount(txInfo.Amount),
      fee: formatXRPAmount(txInfo.Fee),
      status: txInfo.meta.TransactionResult as string,
      sourceTag: txInfo.SourceTag?.toString(),
      from: txInfo.Account as string,
      to: txInfo.Destination as string,
      memo,
      isBitbob: memo?.startsWith('BitBob') ?? false,
      sequence: txInfo.Sequence as number,
      flags: Number(txInfo.Flags),
      lastLedgerSequence: txInfo.LastLedgerSequence,
      ticketSequence: txInfo.TicketSequence,
      memos: txInfo.Memos?.map((memoObj: any) => 
        memoObj.Memo?.MemoData ? hexToAscii(memoObj.Memo.MemoData) : ''
      ).filter(Boolean) ?? [],
      raw: txInfo
    };

    console.log('Processed transaction detail:', transactionDetail);
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

export const fetchTransactions = async (address: string): Promise<Transaction[]> => {
  let client = null;
  let transactions: Transaction[] = [];

  try {
    client = await getClient();
    console.log(`[XRPL] Connected and fetching transactions for address:`, address);
    
    const response = await client.request({
      command: "account_tx",
      account: address,
      ledger_index_min: -1,
      ledger_index_max: -1,
      binary: false,
      limit: 100,
      forward: false
    }) as AccountTxResponse;

    console.log('[XRPL] Raw response:', response);

    if (!response.result) {
      console.warn('[XRPL] No result in response');
      return [];
    }

    if (!response.result.transactions) {
      console.warn('[XRPL] No transactions in result');
      return [];
    }

    if (!Array.isArray(response.result.transactions)) {
      console.warn('[XRPL] Transactions is not an array:', typeof response.result.transactions);
      return [];
    }

    console.log(`[XRPL] Found ${response.result.transactions.length} raw transactions`);

    const validTxs = response.result.transactions.filter((tx) => {
      if (!tx.tx || !tx.meta) {
        console.warn('[XRPL] Invalid transaction structure:', tx);
        return false;
      }
      return true;
    });

    console.log(`[XRPL] After structure validation: ${validTxs.length} transactions`);

    transactions = validTxs.map(tx => {
      console.log('[XRPL] Processing transaction:', tx.tx);
      const txData = tx.tx as unknown as Record<string, any>;
      const meta = tx.meta as TransactionMetadata;

      // Process amount
      let amountStr = '0';
      if (txData.Amount) {
        console.log('[XRPL] Processing amount:', txData.Amount);
        const amount = txData.Amount;
        if (typeof amount === 'string') {
          amountStr = amount;
        } else if (amount && typeof amount === 'object' && 'value' in amount) {
          amountStr = amount.value;
        }
      }

      // Process memo and BitBob status
      let memo: string | undefined;
      let isBitbob = false;
      
      if (txData.Memos && Array.isArray(txData.Memos) && txData.Memos.length > 0) {
        console.log('[XRPL] Processing memos:', txData.Memos);
        const memoData = txData.Memos[0]?.Memo?.MemoData;
        if (memoData && typeof memoData === 'string') {
          memo = hexToAscii(memoData);
          console.log('[XRPL] Decoded memo:', memo);
          isBitbob = memo.startsWith('BitBob');
        }
      }

      // Check BitBob source tag
      if (txData.SourceTag === "29202152") {
        console.log('[XRPL] BitBob source tag detected');
        isBitbob = true;
      }

      const hash = txData.hash?.toString();
      const type = txData.TransactionType?.toString();
      const date = txData.date ? formatXRPLDate(Number(txData.date)) : undefined;
      const fee = txData.Fee ? formatXRPAmount(txData.Fee) : '0 XRP';
      const status = meta.TransactionResult;
      const sourceTag = txData.SourceTag?.toString();
      const from = txData.Account?.toString();
      const to = txData.Destination?.toString();

      console.log('[XRPL] Extracted transaction fields:', {
        hash,
        type,
        date,
        amount: amountStr,
        fee,
        status,
        sourceTag,
        from,
        to,
        memo,
        isBitbob
      });

      const parsedTx: Transaction = {
        hash: hash || 'Unknown',
        type: type || 'Unknown',
        date: date || 'Unknown',
        amount: formatXRPAmount(amountStr),
        fee,
        status: status || 'unknown',
        sourceTag,
        from: from || 'Unknown',
        to: to || 'Unknown',
        memo,
        isBitbob
      };

      return parsedTx;
    });

    const validTransactions = transactions.filter(tx => {
      const isValid = tx.hash !== 'Unknown' && 
                     tx.from !== 'Unknown' && 
                     tx.status !== 'unknown';
      
      if (!isValid) {
        console.warn('[XRPL] Filtering out invalid transaction:', tx);
      }
      return isValid;
    });

    console.log(`[XRPL] Final valid transactions count: ${validTransactions.length}`);
    console.log('[XRPL] Final transactions:', validTransactions);

    if (validTransactions.length === 0) {
      console.warn('[XRPL] No valid transactions found after processing');
      toast.error("No valid transactions found");
    }
    
    return validTransactions;

  } catch (error) {
    console.error("[XRPL] Error fetching transactions:", error);
    toast.error("Failed to fetch transactions");
    return [];
  } finally {
    if (client) {
      await client.disconnect();
      console.log('[XRPL] Client disconnected');
    }
  }
};

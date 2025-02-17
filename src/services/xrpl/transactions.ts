
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
  try {
    client = await getClient();
    console.log(`[XRPL] Fetching transactions for address:`, address);
    
    // Request transactions with specific parameters
    const response = await client.request({
      command: "account_tx",
      account: address,
      binary: false,
      limit: 200,
      forward: false,
      ledger_index_min: -1,
      ledger_index_max: -1
    });

    console.log('[XRPL] Raw response:', response);

    if (!response.result?.transactions) {
      console.warn('[XRPL] No transactions found in response');
      return [];
    }

    // Map and process transactions
    const transactions = response.result.transactions
      .map(tx => {
        if (!tx.tx || !tx.meta) {
          console.warn('[XRPL] Invalid transaction structure:', tx);
          return null;
        }

        const txData = tx.tx;
        const meta = tx.meta;

        // Process amount with proper error handling
        let amount = '0';
        try {
          if (typeof txData.Amount === 'string') {
            amount = txData.Amount;
          } else if (txData.Amount?.value) {
            amount = txData.Amount.value;
          }
        } catch (error) {
          console.error('[XRPL] Error processing amount:', error);
        }

        // Process memo and BitBob detection
        let memo = '';
        let isBitbob = false;

        try {
          if (Array.isArray(txData.Memos) && txData.Memos.length > 0) {
            const memoData = txData.Memos[0]?.Memo?.MemoData;
            if (memoData) {
              memo = hexToAscii(memoData);
              isBitbob = memo.startsWith('BitBob');
            }
          }

          // Check for BitBob source tag (both string and number formats)
          const sourceTag = txData.SourceTag;
          if (sourceTag === "29202152" || sourceTag === 29202152) {
            isBitbob = true;
          }
        } catch (error) {
          console.error('[XRPL] Error processing memo:', error);
        }

        // Create transaction object with mandatory fields
        if (!txData.hash || !txData.Account || !meta.TransactionResult) {
          console.warn('[XRPL] Missing required fields:', { 
            hash: txData.hash, 
            account: txData.Account, 
            result: meta.TransactionResult 
          });
          return null;
        }

        const transaction: Transaction = {
          hash: txData.hash,
          type: txData.TransactionType || 'Unknown',
          date: formatXRPLDate(txData.date),
          amount: formatXRPAmount(amount),
          fee: formatXRPAmount(txData.Fee),
          status: meta.TransactionResult,
          sourceTag: txData.SourceTag?.toString(),
          from: txData.Account,
          to: txData.Destination,
          memo: memo || undefined,
          isBitbob
        };

        console.log('[XRPL] Processed transaction:', transaction);
        return transaction;
      })
      .filter((tx): tx is Transaction => {
        if (!tx) {
          return false;
        }
        const isValid = Boolean(tx.hash && tx.from && tx.status);
        if (!isValid) {
          console.warn('[XRPL] Filtered out invalid transaction:', tx);
        }
        return isValid;
      });

    console.log(`[XRPL] Successfully processed ${transactions.length} transactions`);
    
    if (transactions.length === 0) {
      console.warn('[XRPL] No valid transactions found after processing');
      toast.error("No transactions found for this address");
    }
    
    return transactions;

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


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
    
    const response = await client.request({
      command: "account_tx",
      account: address,
      binary: false,
      limit: 200,
      forward: false
    });

    console.log('[XRPL] Raw response:', response);

    if (!response.result?.transactions) {
      console.warn('[XRPL] No transactions found in response');
      return [];
    }

    const transactions = response.result.transactions
      .map(tx => {
        console.log('[XRPL] Processing transaction:', tx);
        
        // Extract tx and meta data
        const txData = tx.tx || tx;
        const meta = tx.meta || { TransactionResult: 'unknown' };

        if (!txData) {
          console.warn('[XRPL] Missing transaction data');
          return null;
        }

        // Process amount with proper error handling
        let amount = '0';
        try {
          if (txData.Amount) {
            if (typeof txData.Amount === 'string') {
              amount = txData.Amount;
            } else if (typeof txData.Amount === 'object' && 'value' in txData.Amount) {
              amount = txData.Amount.value;
            }
          } else if (txData.TakerGets) {
            // Handle OfferCreate transactions
            amount = typeof txData.TakerGets === 'string' ? txData.TakerGets : txData.TakerGets.value;
          }
        } catch (error) {
          console.error('[XRPL] Error processing amount:', error);
        }

        // Process destination/recipient
        let destination = txData.Destination;
        if (!destination && txData.TransactionType === 'OfferCreate') {
          destination = 'XRPL DEX';
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

          // Check for BitBob source tag
          const sourceTag = txData.SourceTag;
          if (sourceTag === "29202152" || sourceTag === 29202152) {
            isBitbob = true;
          }
        } catch (error) {
          console.error('[XRPL] Error processing memo:', error);
        }

        // Validate required fields
        if (!txData.hash || !txData.Account) {
          console.warn('[XRPL] Missing required fields:', txData);
          return null;
        }

        const transaction: Transaction = {
          hash: txData.hash,
          type: txData.TransactionType || 'Unknown',
          date: txData.date ? formatXRPLDate(txData.date) : 'Unknown',
          amount: formatXRPAmount(amount),
          fee: formatXRPAmount(txData.Fee || '0'),
          status: meta.TransactionResult || 'unknown',
          sourceTag: txData.SourceTag?.toString(),
          from: txData.Account,
          to: destination || 'Unknown',
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
        const isValid = Boolean(tx.hash && tx.from);
        if (!isValid) {
          console.warn('[XRPL] Filtered out invalid transaction:', tx);
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
      console.log('[XRPL] Client disconnected');
    }
  }
};

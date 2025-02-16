
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
      memos: [txInfo.Memos || []].map((memoObj: any) => 
        memoObj.Memo?.MemoData ? hexToAscii(memoObj.Memo.MemoData) : ''
      ).filter(Boolean),
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
  let succeeded = false;

  try {
    client = await getClient();
    console.log(`Connected for fetching transactions for ${address}`);
    
    const response = await client.request({
      command: "account_tx",
      account: address,
      ledger_index_min: -1,
      ledger_index_max: -1,
      binary: false,
      limit: 30,
      forward: false
    }) as AccountTxResponse;

    if (!response.result?.transactions || !Array.isArray(response.result.transactions)) {
      console.warn('No transactions found or invalid response format');
      return [];
    }

    console.log('Raw transactions:', response.result.transactions);

    transactions = response.result.transactions
      .filter((tx): tx is AccountTxTransaction => {
        if (!tx.tx || !tx.meta) {
          console.warn('Skipping invalid transaction:', tx);
          return false;
        }
        return true;
      })
      .map(tx => {
        const txData = tx.tx;
        const meta = tx.meta as TransactionMetadata;

        let amountStr = '0';
        if ('Amount' in txData) {
          const amount = txData.Amount;
          if (typeof amount === 'string') {
            amountStr = amount;
          } else if (amount && typeof amount === 'object' && 'value' in amount) {
            amountStr = amount.value;
          }
        }

        let memo: string | undefined;
        let isBitbob = false;
        
        if ('Memos' in txData && Array.isArray(txData.Memos) && txData.Memos.length > 0) {
          const memoData = txData.Memos[0]?.Memo?.MemoData;
          if (memoData && typeof memoData === 'string') {
            memo = hexToAscii(memoData);
            isBitbob = memo.startsWith('BitBob');
          }
        }

        // Access properties safely with type guards
        const hashValue = 'hash' in txData && typeof txData.hash === 'string' ? txData.hash : 'Unknown';
        const typeValue = 'TransactionType' in txData && typeof txData.TransactionType === 'string' ? txData.TransactionType : 'Unknown';
        const dateValue = 'date' in txData && typeof txData.date === 'number' ? formatXRPLDate(txData.date) : 'Unknown';

        const parsedTx: Transaction = {
          hash: hashValue,
          type: typeValue,
          date: dateValue,
          amount: formatXRPAmount(amountStr),
          fee: ('Fee' in txData && txData.Fee) ? formatXRPAmount(txData.Fee) : '0 XRP',
          status: (meta && 'TransactionResult' in meta) ? meta.TransactionResult : 'unknown',
          sourceTag: ('SourceTag' in txData) ? txData.SourceTag?.toString() : undefined,
          from: ('Account' in txData && typeof txData.Account === 'string') ? txData.Account : 'Unknown',
          to: ('Destination' in txData && typeof txData.Destination === 'string') ? txData.Destination : 'Unknown',
          memo,
          isBitbob
        };

        console.log('Processed transaction:', parsedTx);
        return parsedTx;
      })
      .filter(tx => {
        const isValid = tx.hash !== 'Unknown' && 
                       tx.from !== 'Unknown' && 
                       tx.status !== 'unknown';
        if (!isValid) {
          console.warn('Filtering out invalid transaction:', tx);
        }
        return isValid;
      });

    succeeded = transactions.length > 0;
    console.log(`Processed ${transactions.length} total transactions`);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    toast.error("Failed to fetch transactions");
  } finally {
    if (client) {
      await client.disconnect();
    }
  }

  if (!succeeded) {
    toast.error("Failed to fetch transactions");
    return [];
  }

  return transactions;
};

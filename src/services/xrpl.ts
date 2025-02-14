
import { Client, isValidClassicAddress } from 'xrpl';
import { toast } from "sonner";
import type { Transaction as XrplTransaction } from 'xrpl';

export interface Transaction {
  hash: string;
  type: string;
  date: string;
  amount: string;
  fee: string;
  status: string;
  sourceTag?: string;
  from: string;
  to: string;
}

export interface TransactionDetail extends Transaction {
  sequence: number;
  memos?: string[];
  flags: number;
  lastLedgerSequence?: number;
  ticketSequence?: number;
  raw: any;
}

// Primary and backup servers
const XRPL_SERVERS = [
  "wss://xrplcluster.com",
  "wss://s1.ripple.com",
  "wss://s2.ripple.com"
];

export const validateXRPLAddress = (address: string): boolean => {
  return isValidClassicAddress(address);
};

const getClient = async (): Promise<Client> => {
  for (const server of XRPL_SERVERS) {
    try {
      const client = new Client(server);
      await client.connect();
      console.log(`Connected to ${server}`);
      return client;
    } catch (error) {
      console.error(`Failed to connect to ${server}:`, error);
      continue;
    }
  }
  throw new Error("Could not connect to any XRPL server");
};

// Helper function to format XRP amount
const formatXRPAmount = (amount: string | number | undefined): string => {
  if (!amount) return '0.000000 XRP';
  const amountInDrops = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `${(amountInDrops / 1_000_000).toFixed(6)} XRP`;
};

// Helper function to format date
const formatXRPLDate = (rippleEpochDate: number | undefined): string => {
  if (!rippleEpochDate) return 'Unknown';
  try {
    // XRPL epoch starts at January 1, 2000 (946684800 seconds after Unix epoch)
    const unixTimestamp = (rippleEpochDate + 946684800) * 1000;
    return new Date(unixTimestamp).toLocaleString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

export const fetchTransactionDetails = async (hash: string): Promise<TransactionDetail | null> => {
  let client: Client | null = null;
  try {
    client = await getClient();
    const tx = await client.request({
      command: "tx",
      transaction: hash,
      binary: false
    });

    if (tx.result) {
      const txData = tx.result;
      console.log('Transaction details:', txData);

      const transactionDetail: TransactionDetail = {
        hash: txData.hash || hash,
        type: txData.TransactionType || 'Unknown',
        date: formatXRPLDate(txData.date),
        amount: formatXRPAmount(txData.Amount),
        fee: formatXRPAmount(txData.Fee),
        status: txData.meta?.TransactionResult || 'unknown',
        sourceTag: txData.SourceTag?.toString(),
        from: txData.Account || 'Unknown',
        to: txData.Destination || 'Unknown',
        sequence: txData.Sequence || 0,
        flags: txData.Flags || 0,
        lastLedgerSequence: txData.LastLedgerSequence,
        ticketSequence: txData.TicketSequence,
        memos: txData.Memos?.map((memo: any) => 
          memo.Memo?.MemoData ? 
            Buffer.from(memo.Memo.MemoData, 'hex').toString('utf8') 
          : ''
        ).filter(Boolean) || [],
        raw: txData
      };

      console.log('Processed transaction detail:', transactionDetail);
      return transactionDetail;
    }
    return null;
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
  let client: Client | null = null;
  try {
    client = await getClient();
    console.log(`Fetching transactions for address: ${address}`);
    
    const response = await client.request({
      command: "account_tx",
      account: address,
      ledger_index_min: -1,
      ledger_index_max: -1,
      binary: false,
      limit: 30,
      forward: false
    });

    if (!response.result?.transactions) {
      console.warn('No transactions found or invalid response');
      return [];
    }

    console.log('Raw transactions:', response.result.transactions);

    const transactions = response.result.transactions.map((tx: any) => {
      const transaction = tx.tx || {};
      const meta = tx.meta || {};

      // Handle different amount formats
      let amount = '0';
      if (transaction.Amount) {
        if (typeof transaction.Amount === 'object' && transaction.Amount.value) {
          amount = transaction.Amount.value;
        } else {
          amount = transaction.Amount.toString();
        }
      }

      const parsedTx: Transaction = {
        hash: transaction.hash || 'Unknown',
        type: transaction.TransactionType || 'Unknown',
        date: formatXRPLDate(transaction.date),
        amount: formatXRPAmount(amount),
        fee: formatXRPAmount(transaction.Fee),
        status: meta.TransactionResult || 'unknown',
        sourceTag: transaction.SourceTag?.toString(),
        from: transaction.Account || 'Unknown',
        to: transaction.Destination || 'Unknown'
      };

      console.log('Processed transaction:', parsedTx);
      return parsedTx;
    });

    console.log(`Processed ${transactions.length} transactions`);
    return transactions;
  } catch (error) {
    console.error("Error fetching transactions:", error);
    toast.error("Failed to fetch transactions");
    return [];
  } finally {
    if (client) {
      await client.disconnect();
    }
  }
};

export const fetchBalance = async (address: string): Promise<string> => {
  let client: Client | null = null;
  try {
    client = await getClient();
    console.log(`Fetching balance for address: ${address}`);

    const response = await client.request({
      command: "account_info",
      account: address,
      ledger_index: "validated"
    });

    if (response.result?.account_data) {
      const balanceInDrops = response.result.account_data.Balance;
      const formattedBalance = formatXRPAmount(balanceInDrops);
      console.log(`Balance for ${address}:`, formattedBalance);
      return formattedBalance;
    }

    console.warn('No balance data found');
    return '0.000000 XRP';
  } catch (error) {
    console.error("Error fetching balance:", error);
    toast.error("Failed to fetch balance");
    return '0.000000 XRP';
  } finally {
    if (client) {
      await client.disconnect();
    }
  }
};

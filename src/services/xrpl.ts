
import { Client, isValidClassicAddress } from 'xrpl';
import { toast } from "sonner";
import type { 
  Transaction as XRPLTransaction,
  TxResponse,
  AccountTxResponse,
  AccountInfoResponse,
  Payment
} from 'xrpl';

interface XRPLTransactionResponse {
  tx: {
    Account: string;
    Amount: string | { value: string };
    Destination?: string;
    Fee: string;
    Flags: number;
    LastLedgerSequence?: number;
    Sequence: number;
    SigningPubKey: string;
    SourceTag?: number;
    TransactionType: string;
    TxnSignature: string;
    hash: string;
    date: number;
  };
  meta: {
    TransactionIndex: number;
    TransactionResult: string;
    delivered_amount?: string;
  };
  validated: boolean;
}

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
const formatXRPAmount = (amount: string | number | { value: string } | undefined): string => {
  if (!amount) return '0.000000 XRP';
  
  let amountValue: number;
  if (typeof amount === 'object' && 'value' in amount) {
    amountValue = parseFloat(amount.value);
  } else {
    amountValue = typeof amount === 'string' ? parseFloat(amount) : amount;
  }
  
  return `${(amountValue / 1_000_000).toFixed(6)} XRP`;
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
    const response = await client.request({
      command: "tx",
      transaction: hash,
      binary: false
    }) as TxResponse;

    if (!response.result) {
      console.warn('No transaction details found');
      return null;
    }

    console.log('Raw transaction details:', response.result);
    
    const txInfo = response.result;
    const transactionDetail: TransactionDetail = {
      hash: txInfo.hash,
      type: (txInfo as any).TransactionType || 'Unknown',
      date: formatXRPLDate(txInfo.date),
      amount: formatXRPAmount((txInfo as any).Amount),
      fee: formatXRPAmount((txInfo as any).Fee),
      status: (txInfo.meta as any)?.TransactionResult || 'unknown',
      sourceTag: (txInfo as any).SourceTag?.toString(),
      from: (txInfo as any).Account || 'Unknown',
      to: (txInfo as any).Destination || 'Unknown',
      sequence: (txInfo as any).Sequence || 0,
      flags: Number((txInfo as any).Flags) || 0,
      lastLedgerSequence: (txInfo as any).LastLedgerSequence,
      ticketSequence: (txInfo as any).TicketSequence,
      memos: ((txInfo as any).Memos || []).map((memo: any) => 
        memo.Memo?.MemoData ? 
          Buffer.from(memo.Memo.MemoData, 'hex').toString('utf8') 
        : ''
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
    }) as AccountTxResponse;

    if (!response.result?.transactions) {
      console.warn('No transactions found or invalid response');
      return [];
    }

    console.log('Raw transactions:', response.result.transactions);

    const transactions = response.result.transactions
      .filter((tx): tx is XRPLTransactionResponse => Boolean(tx.tx && tx.meta))
      .map(tx => {
        const { tx: transaction, meta } = tx;

        // Handle different amount formats
        let amount = transaction.Amount;
        if (amount) {
          if (typeof amount === 'object' && 'value' in amount) {
            amount = amount.value;
          }
        }

        const parsedTx: Transaction = {
          hash: transaction.hash,
          type: transaction.TransactionType,
          date: formatXRPLDate(transaction.date),
          amount: formatXRPAmount(amount),
          fee: formatXRPAmount(transaction.Fee),
          status: meta.TransactionResult || 'unknown',
          sourceTag: transaction.SourceTag?.toString(),
          from: transaction.Account,
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
    }) as AccountInfoResponse;

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

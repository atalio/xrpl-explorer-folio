
import { Client, validate } from 'xrpl';
import { toast } from "sonner";

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

const XRPL_SERVERS = [
  "wss://xrplcluster.com",
  "wss://s1.ripple.com",
  "wss://s2.ripple.com"
];

export const validateXRPLAddress = (address: string): boolean => {
  return validate.isValidClassicAddress(address);
};

const getClient = async (): Promise<Client> => {
  for (const server of XRPL_SERVERS) {
    try {
      const client = new Client(server);
      await client.connect();
      return client;
    } catch (error) {
      console.error(`Failed to connect to ${server}:`, error);
      continue;
    }
  }
  throw new Error("Could not connect to any XRPL server");
};

export const fetchTransactionDetails = async (hash: string): Promise<TransactionDetail | null> => {
  let client: Client | null = null;
  try {
    client = await getClient();
    const tx = await client.request({
      command: "tx",
      transaction: hash
    });

    if (tx.result) {
      const txData = tx.result;
      const amountInDrops = parseFloat(txData.Amount?.toString() || '0');
      const amountInXRP = amountInDrops / 1_000_000;

      return {
        hash: txData.hash || hash,
        type: txData.TransactionType || 'Unknown',
        date: new Date(((txData.date || 0) + 946684800) * 1000).toLocaleString(),
        amount: `${amountInXRP.toFixed(6)} XRP`,
        fee: (parseInt(txData.Fee?.toString() || '0') / 1_000_000).toFixed(6),
        status: txData.meta?.TransactionResult || 'unknown',
        sourceTag: txData.SourceTag?.toString(),
        from: txData.Account || 'Unknown',
        to: txData.Destination || 'Unknown',
        sequence: txData.Sequence || 0,
        flags: txData.Flags || 0,
        lastLedgerSequence: txData.LastLedgerSequence,
        ticketSequence: txData.TicketSequence,
        memos: txData.Memos?.map((memo: any) => memo.Memo.MemoData) || [],
        raw: txData
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching transaction details:", error);
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
    const response = await client.request({
      command: "account_tx",
      account: address,
      ledger_index_min: -1,
      ledger_index_max: -1,
      binary: false,
      limit: 30,
      forward: false
    });

    if (response.result && response.result.transactions) {
      return response.result.transactions.map((tx: any) => {
        const transaction = tx.tx || {};
        const meta = tx.meta || {};
        const amountInDrops = parseFloat(transaction.Amount?.toString() || '0');
        const amountInXRP = amountInDrops / 1_000_000;

        return {
          hash: transaction.hash || 'Unknown',
          type: transaction.TransactionType || 'Unknown',
          date: new Date(((transaction.date || 0) + 946684800) * 1000).toLocaleString(),
          amount: `${amountInXRP.toFixed(6)} XRP`,
          fee: (parseInt(transaction.Fee?.toString() || '0') / 1_000_000).toFixed(6),
          status: meta.TransactionResult || 'unknown',
          sourceTag: transaction.SourceTag?.toString(),
          from: transaction.Account || 'Unknown',
          to: transaction.Destination || 'Unknown'
        };
      });
    }
    return [];
  } catch (error) {
    console.error("Error fetching transactions:", error);
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
    const response = await client.request({
      command: "account_info",
      account: address,
      ledger_index: "validated"
    });

    if (response.result && response.result.account_data) {
      const balanceInDrops = parseInt(response.result.account_data.Balance || '0');
      return (balanceInDrops / 1_000_000).toFixed(6);
    }
    return '0';
  } catch (error) {
    console.error("Error fetching balance:", error);
    return '0';
  } finally {
    if (client) {
      await client.disconnect();
    }
  }
};

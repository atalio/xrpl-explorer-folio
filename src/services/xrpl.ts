
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

// Update endpoints to use CORS-friendly ones
const XRPL_ENDPOINTS = [
  "https://xrplcluster.com/",
  "https://xrpl.ws/",
  "https://testnet.xrpl-labs.com/",
  "https://xrpl.link/"
];

export const validateXRPLAddress = (address: string): boolean => {
  return address.startsWith('r') && address.length >= 25 && address.length <= 35;
};

const fetchFromEndpoint = async (endpoint: string, address: string): Promise<any> => {
  try {
    const params = {
      method: "account_tx",
      params: [{
        account: address,
        ledger_index_min: -1,
        ledger_index_max: -1,
        binary: false,
        limit: 30,
        forward: false
      }]
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.result && data.result.status === "error") {
      throw new Error(data.result.error_message || "Unknown error");
    }

    return data;
  } catch (error) {
    console.error(`Error fetching from ${endpoint}:`, error);
    throw error;
  }
};

export const fetchTransactionDetails = async (hash: string): Promise<TransactionDetail | null> => {
  let lastError = null;

  for (const endpoint of XRPL_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: "tx",
          params: [{ transaction: hash }]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.result && data.result) {
        const tx = data.result;
        const amountInDrops = parseFloat(tx.Amount || '0');
        const amountInXRP = amountInDrops / 1_000_000;

        return {
          hash: tx.hash || hash,
          type: tx.TransactionType || 'Unknown',
          date: new Date(((tx.date || 0) + 946684800) * 1000).toLocaleString(),
          amount: `${amountInXRP.toFixed(6)} XRP`,
          fee: (parseInt(tx.Fee || '0') / 1_000_000).toFixed(6),
          status: tx.meta?.TransactionResult || 'unknown',
          sourceTag: tx.SourceTag?.toString(),
          from: tx.Account || 'Unknown',
          to: tx.Destination || 'Unknown',
          sequence: tx.Sequence || 0,
          flags: tx.Flags || 0,
          lastLedgerSequence: tx.LastLedgerSequence,
          ticketSequence: tx.TicketSequence,
          memos: tx.Memos?.map((memo: any) => memo.Memo.MemoData) || [],
          raw: tx
        };
      }
    } catch (error) {
      console.error(`Error fetching from ${endpoint}:`, error);
      lastError = error;
      continue;
    }
  }

  toast.error("Failed to fetch transaction details from all endpoints");
  console.error("All endpoints failed:", lastError);
  return null;
};

export const fetchTransactions = async (address: string): Promise<Transaction[]> => {
  let lastError = null;

  for (const endpoint of XRPL_ENDPOINTS) {
    try {
      console.log(`Attempting to fetch from ${endpoint}`);
      const data = await fetchFromEndpoint(endpoint, address);
      
      if (!data.result || !data.result.transactions) {
        console.warn(`Invalid response from ${endpoint}`);
        continue;
      }

      return data.result.transactions.map((tx: any) => {
        const transaction = tx.tx || {};
        const meta = tx.meta || {};
        const amountInDrops = parseFloat(transaction.Amount || '0');
        const amountInXRP = amountInDrops / 1_000_000;

        return {
          hash: transaction.hash || 'Unknown',
          type: transaction.TransactionType || 'Unknown',
          date: new Date(((transaction.date || 0) + 946684800) * 1000).toLocaleString(),
          amount: `${amountInXRP.toFixed(6)} XRP`,
          fee: (parseInt(transaction.Fee || '0') / 1_000_000).toFixed(6),
          status: meta.TransactionResult || 'unknown',
          sourceTag: transaction.SourceTag?.toString(),
          from: transaction.Account || 'Unknown',
          to: transaction.Destination || 'Unknown'
        };
      });
    } catch (error) {
      console.error(`Error fetching from ${endpoint}:`, error);
      lastError = error;
      continue;
    }
  }

  toast.error("Failed to fetch transactions from all endpoints");
  console.error("All endpoints failed:", lastError);
  return [];
};

export const fetchBalance = async (address: string): Promise<string> => {
  let lastError = null;

  for (const endpoint of XRPL_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: "account_info",
          params: [{
            account: address,
            strict: true,
            ledger_index: "current",
            queue: true
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.result && data.result.account_data) {
        const balanceInDrops = parseInt(data.result.account_data.Balance || '0');
        return (balanceInDrops / 1_000_000).toFixed(6);
      }
    } catch (error) {
      console.error(`Error fetching balance from ${endpoint}:`, error);
      lastError = error;
      continue;
    }
  }

  toast.error("Failed to fetch balance from all endpoints");
  console.error("All balance endpoints failed:", lastError);
  return '0';
};

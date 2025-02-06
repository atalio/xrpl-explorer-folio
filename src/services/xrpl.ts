import { toast } from "sonner";

export interface Transaction {
  hash: string;
  type: string;
  date: string;
  amount: string;
  fee: string;
  status: string;
}

// Define endpoints for XRPL data
const XRPL_ENDPOINTS = [
  "https://s1.ripple.com:51234/",           // Main Ripple server
  "https://s2.ripple.com:51234/",           // Ripple backup server
  "https://xrplcluster.com/",               // XRPL Cluster
  "https://xrpl.ws/",                       // XRPL WebSocket Project
  "https://testnet.xrpl-labs.com/",         // XRPL Labs Testnet
  "https://xrpl.link/"                      // Community Node
];

export const validateXRPLAddress = (address: string): boolean => {
  return address.startsWith('r') && address.length >= 25 && address.length <= 35;
};

const fetchFromEndpoint = async (endpoint: string, address: string): Promise<any> => {
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
    throw new Error(`Failed to fetch from ${endpoint}`);
  }

  return response.json();
};

export const fetchTransactions = async (address: string): Promise<Transaction[]> => {
  let lastError = null;

  // Try each endpoint until one succeeds
  for (const endpoint of XRPL_ENDPOINTS) {
    try {
      console.log(`Attempting to fetch from ${endpoint}`);
      const data = await fetchFromEndpoint(endpoint, address);
      
      if (!data.result || !data.result.transactions) {
        console.warn(`Invalid response from ${endpoint}`);
        continue;
      }

      return data.result.transactions.map((tx: any) => {
        const transaction = tx.tx;
        const meta = tx.meta;
        const amountInDrops = parseFloat(transaction.Amount || '0');
        const amountInXRP = amountInDrops / 1_000_000;

        return {
          hash: transaction.hash,
          type: transaction.TransactionType || 'Unknown',
          date: new Date(((transaction.date || 0) + 946684800) * 1000).toLocaleString(),
          amount: `${amountInXRP.toFixed(6)} XRP`,
          fee: (parseInt(transaction.Fee || '0') / 1_000_000).toFixed(6),
          status: meta?.TransactionResult || 'unknown'
        };
      });
    } catch (error) {
      console.error(`Error fetching from ${endpoint}:`, error);
      lastError = error;
      continue;
    }
  }

  // If we get here, all endpoints failed
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
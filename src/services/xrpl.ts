
import { Client, isValidClassicAddress } from 'xrpl';
import { toast } from "sonner";
import type { 
  Transaction as XRPLTransaction,
  TxResponse,
  AccountTxResponse,
  AccountTxTransaction,
  AccountInfoResponse,
  Payment,
  TransactionMetadata
} from 'xrpl';

interface XRPLTransactionMeta {
  TransactionResult: string;
  AffectedNodes: Array<{
    ModifiedNode?: {
      FinalFields: {
        Balance: string;
        Flags: number;
        OwnerCount: number;
        Sequence: number;
      };
    };
  }>;
}

interface XRPLTxResponse {
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
    ledger_index: number;
    Memos?: Array<{
      Memo: {
        MemoData?: string;
        MemoType?: string;
        MemoFormat?: string;
      };
    }>;
  };
  meta: XRPLTransactionMeta;
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
  memo?: string;
  isBitbob: boolean;
}

export interface TransactionDetail extends Transaction {
  sequence: number;
  memos?: string[];
  flags: number;
  lastLedgerSequence?: number;
  ticketSequence?: number;
  raw: any;
}

export interface BalanceDetails {
  total: string;
  available: string;
  reserve: string;
}

// Primary and backup servers with randomization
const XRPL_SERVERS = [
  "wss://xrplcluster.com",
  "wss://s1.ripple.com",
  "wss://s2.ripple.com",
  "wss://rippleitin.com",
  "wss://xrpl.ws"
];

export const validateXRPLAddress = (address: string): boolean => {
  return isValidClassicAddress(address);
};

const getRandomServer = () => {
  const index = Math.floor(Math.random() * XRPL_SERVERS.length);
  return XRPL_SERVERS[index];
};

const getClient = async (): Promise<Client> => {
  const shuffledServers = [...XRPL_SERVERS].sort(() => Math.random() - 0.5);
  
  for (const server of shuffledServers) {
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

const formatXRPLDate = (rippleEpochDate: number | undefined): string => {
  if (!rippleEpochDate) return 'Unknown';
  try {
    const unixTimestamp = (rippleEpochDate + 946684800) * 1000;
    return new Date(unixTimestamp).toLocaleString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

const hexToAscii = (hex: string): string => {
  let ascii = '';
  for (let i = 0; i < hex.length; i += 2) {
    ascii += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return ascii;
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
    const memoData = (txInfo as any).Memos?.[0]?.Memo?.MemoData;
    const memo = memoData ? hexToAscii(memoData) : undefined;

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
      memo,
      isBitbob: memo?.startsWith('BitBob') ?? false,
      sequence: (txInfo as any).Sequence || 0,
      flags: Number((txInfo as any).Flags) || 0,
      lastLedgerSequence: (txInfo as any).LastLedgerSequence,
      ticketSequence: (txInfo as any).TicketSequence,
      memos: [(txInfo as any).Memos || []].map((memoObj: any) => 
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
      .filter((tx): tx is AccountTxTransaction => Boolean(tx.tx && tx.meta))
      .map(tx => {
        const txData = tx.tx as any;
        const meta = tx.meta as XRPLTransactionMeta;

        let amount = txData.Amount;
        if (amount) {
          if (typeof amount === 'object' && 'value' in amount) {
            amount = amount.value;
          }
        }

        const memoData = txData.Memos?.[0]?.Memo?.MemoData;
        const memo = memoData ? hexToAscii(memoData) : undefined;

        const parsedTx: Transaction = {
          hash: txData.hash,
          type: txData.TransactionType || 'Unknown',
          date: formatXRPLDate(txData.date),
          amount: formatXRPAmount(amount),
          fee: formatXRPAmount(txData.Fee),
          status: meta.TransactionResult || 'unknown',
          sourceTag: txData.SourceTag?.toString(),
          from: txData.Account || 'Unknown',
          to: txData.Destination || 'Unknown',
          memo,
          isBitbob: memo?.startsWith('BitBob') ?? false
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

export const fetchBalance = async (address: string): Promise<BalanceDetails> => {
  let client: Client | null = null;
  try {
    client = await getClient();
    console.log(`Fetching balance for address: ${address}`);

    const response = await client.request({
      command: "account_info",
      account: address,
      ledger_index: "validated"
    }) as AccountInfoResponse;

    if (!response.result?.account_data) {
      console.warn('No balance data found');
      return {
        total: '0.000000 XRP',
        available: '0.000000 XRP',
        reserve: '0.000000 XRP'
      };
    }

    const accountData = response.result.account_data;
    const ownerCount = Number(accountData.OwnerCount || 0);
    const baseReserve = 10; // Base reserve in XRP
    const ownerReserve = 2; // Owner reserve in XRP per owned object
    
    const totalBalance = Number(accountData.Balance) / 1_000_000;
    const reserveRequirement = baseReserve + (ownerCount * ownerReserve);
    const availableBalance = Math.max(0, totalBalance - reserveRequirement);

    const balanceDetails: BalanceDetails = {
      total: `${totalBalance.toFixed(6)} XRP`,
      available: `${availableBalance.toFixed(6)} XRP`,
      reserve: `${reserveRequirement.toFixed(6)} XRP`
    };

    console.log(`Balance details for ${address}:`, balanceDetails);
    return balanceDetails;
  } catch (error) {
    console.error("Error fetching balance:", error);
    toast.error("Failed to fetch balance");
    return {
      total: '0.000000 XRP',
      available: '0.000000 XRP',
      reserve: '0.000000 XRP'
    };
  } finally {
    if (client) {
      await client.disconnect();
    }
  }
};

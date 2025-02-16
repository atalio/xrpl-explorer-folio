
import type { 
  Transaction as XRPLTransaction,
  AccountTxResponse,
  AccountTxTransaction,
  AccountInfoResponse,
  Payment,
  TransactionMetadata
} from 'xrpl';

export interface XRPLTransactionMeta {
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

export type { 
  XRPLTransaction,
  AccountTxResponse,
  AccountTxTransaction,
  AccountInfoResponse,
  Payment,
  TransactionMetadata
};

import { toast } from "sonner";

export interface Transaction {
  hash: string;
  type: string;
  date: string;
  amount: string;
  fee: string;
  status: string;
}

export const validateXRPLAddress = (address: string): boolean => {
  // Basic validation - should be enhanced
  return address.startsWith('r') && address.length >= 25 && address.length <= 35;
};

export const fetchTransactions = async (address: string): Promise<Transaction[]> => {
  try {
    const response = await fetch(`https://api.xrplf.org/v1/accounts/${address}/transactions`);
    if (!response.ok) throw new Error('Failed to fetch transactions');
    const data = await response.json();
    
    return data.transactions.map((tx: any) => ({
      hash: tx.hash,
      type: tx.type,
      date: new Date(tx.date).toLocaleString(),
      amount: tx.amount || '0',
      fee: tx.fee || '0',
      status: tx.status || 'unknown'
    }));
  } catch (error) {
    toast.error("Failed to fetch transactions");
    return [];
  }
};

export const fetchBalance = async (address: string): Promise<string> => {
  try {
    const response = await fetch(`https://api.xrplf.org/v1/accounts/${address}`);
    if (!response.ok) throw new Error('Failed to fetch balance');
    const data = await response.json();
    return data.balance || '0';
  } catch (error) {
    toast.error("Failed to fetch balance");
    return '0';
  }
};
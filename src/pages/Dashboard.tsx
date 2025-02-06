import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchTransactions, fetchBalance, type Transaction } from "../services/xrpl";
import { toast } from "sonner";

const Dashboard = () => {
  const { address } = useParams<{ address: string }>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState<string>("0");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!address) return;
      setLoading(true);
      try {
        const [txs, bal] = await Promise.all([
          fetchTransactions(address),
          fetchBalance(address)
        ]);
        setTransactions(txs);
        setBalance(bal);
      } catch (error) {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [address]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h1 className="text-2xl font-bold text-secondary mb-4">Account Overview</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-gray-600">Address</p>
              <p className="font-mono text-sm break-all">{address}</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-gray-600">Balance</p>
              <p className="font-bold text-xl">{balance} XRP</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-secondary mb-6">Recent Transactions</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Type</th>
                  <th className="text-left p-4">Hash</th>
                  <th className="text-left p-4">Date</th>
                  <th className="text-left p-4">Amount</th>
                  <th className="text-left p-4">Fee</th>
                  <th className="text-left p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.hash} className="border-b hover:bg-gray-50">
                    <td className="p-4">{tx.type}</td>
                    <td className="p-4 font-mono text-sm">{tx.hash.substring(0, 8)}...</td>
                    <td className="p-4">{tx.date}</td>
                    <td className="p-4">{tx.amount} XRP</td>
                    <td className="p-4">{tx.fee}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        tx.status === 'success' ? 'bg-green-100 text-green-800' : 
                        tx.status === 'failed' ? 'bg-red-100 text-red-800' : 
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchTransactionDetails, type TransactionDetail } from "../services/xrpl";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { toast } from "sonner";

const Transaction = () => {
  const { hash } = useParams<{ hash: string }>();
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTransaction = async () => {
      if (!hash) {
        setError("No transaction hash provided");
        setLoading(false);
        return;
      }

      try {
        console.log('Loading transaction details for hash:', hash);
        const tx = await fetchTransactionDetails(hash);
        
        if (!tx) {
          setError("Transaction not found");
          toast.error("Transaction not found");
        } else {
          setTransaction(tx);
          console.log('Transaction loaded successfully:', tx);
        }
      } catch (error) {
        console.error("Error loading transaction:", error);
        setError("Failed to load transaction details");
        toast.error("Failed to load transaction details");
      } finally {
        setLoading(false);
      }
    };

    loadTransaction();
  }, [hash]);

  const getMoneyFlowIndicator = (tx: TransactionDetail, address: string) => {
    const isOutgoing = tx.from.toLowerCase() === address.toLowerCase();
    return (
      <div className={`flex items-center gap-1 ${
        isOutgoing ? 'text-[#ea384c]' : 'text-[#1EAEDB]'
      }`}>
        {isOutgoing ? (
          <>
            <span className="text-lg">↓</span>
            <span>Sent</span>
          </>
        ) : (
          <>
            <span className="text-lg">↑</span>
            <span>Received</span>
          </>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">
            {error || "Transaction not found"}
          </h1>
          <p className="mt-2 text-gray-600">
            The transaction you're looking for doesn't exist or couldn't be loaded.
          </p>
          <Link 
            to="/"
            className="mt-4 inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <Link to="/" className="text-primary hover:text-primary/90">Home</Link>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <Link to={`/dashboard/${transaction.from}`} className="text-primary hover:text-primary/90">Dashboard</Link>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <span>Transaction</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h1 className="text-2xl font-bold text-secondary mb-6">Transaction Details</h1>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 bg-primary/5 rounded-lg">
                <h3 className="font-medium text-gray-600 mb-2">Transaction Hash</h3>
                <p className="font-mono text-sm break-all">{transaction.hash}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-primary/5 rounded-lg">
                  <h3 className="font-medium text-gray-600 mb-2">From</h3>
                  <Link 
                    to={`/dashboard/${transaction.from}`}
                    className="font-mono text-sm text-primary hover:underline break-all"
                  >
                    {transaction.from}
                  </Link>
                </div>

                <div className="p-4 bg-primary/5 rounded-lg">
                  <h3 className="font-medium text-gray-600 mb-2">To</h3>
                  <Link 
                    to={`/dashboard/${transaction.to}`}
                    className="font-mono text-sm text-primary hover:underline break-all"
                  >
                    {transaction.to}
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-primary/5 rounded-lg">
                  <h3 className="font-medium text-gray-600 mb-2">Amount</h3>
                  <div className="flex items-center gap-2">
                    <p className="font-bold">{transaction.amount}</p>
                    {getMoneyFlowIndicator(transaction, transaction.from)}
                  </div>
                </div>

                <div className="p-4 bg-primary/5 rounded-lg">
                  <h3 className="font-medium text-gray-600 mb-2">Fee</h3>
                  <p>{transaction.fee}</p>
                </div>

                <div className="p-4 bg-primary/5 rounded-lg">
                  <h3 className="font-medium text-gray-600 mb-2">Status</h3>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    transaction.status === 'tesSUCCESS' ? 'bg-green-100 text-green-800' : 
                    transaction.status === 'failed' ? 'bg-red-100 text-red-800' : 
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {transaction.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-primary/5 rounded-lg">
                  <h3 className="font-medium text-gray-600 mb-2">Type</h3>
                  <p className="flex items-center gap-2">
                    {transaction.type}
                    {(transaction.sourceTag === "29202152" || transaction.isBitbob) && (
                      <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                        BitBob
                      </span>
                    )}
                  </p>
                </div>

                <div className="p-4 bg-primary/5 rounded-lg">
                  <h3 className="font-medium text-gray-600 mb-2">Date</h3>
                  <p>{transaction.date}</p>
                </div>
              </div>

              {transaction.memos && transaction.memos.length > 0 && (
                <div className="p-4 bg-primary/5 rounded-lg">
                  <h3 className="font-medium text-gray-600 mb-2">Memos</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {transaction.memos.map((memo, index) => (
                      <li key={index} className="text-sm">{memo}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transaction;

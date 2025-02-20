// SourceTag: 29202152

import { useEffect, useState } from "react";
import { useParams, useLocation, Link, useNavigate } from "react-router-dom";
import { fetchTransactionDetails, type TransactionDetail } from "../services/xrpl";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Footer } from "@/components/ui/footer";
import { LanguageSelector } from "@/components/LanguageSelector";
import {
  ArrowLeftRight,
  Clock,
  Hash,
  ArrowRight,
  Tag,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

const Transaction = () => {
  const { hash } = useParams<{ hash: string }>();
  const location = useLocation();
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Merge fetched details with any extra details passed via navigation state
  const mergeTransaction = (fetched: TransactionDetail): TransactionDetail => {
    // Prefer the transaction passed in navigation state
    const stateTx = (location.state as { transaction?: TransactionDetail })?.transaction;
    return {
      ...fetched,
      from: stateTx?.from ?? fetched.from ?? "Unknown",
      to: stateTx?.to ?? fetched.to ?? "Unknown",
      type: stateTx?.type ?? fetched.type ?? "Unknown",
    };
  };
  
  const demoAddress = "rHNTXD6a7VfFzQK9bNMkX4kYD8nLjhgb32";
  

  

  useEffect(() => {
    const loadTransaction = async () => {
      if (!hash) {
        setError("No transaction hash provided");
        setLoading(false);
        return;
      }

      // Try sessionStorage cache first
      const cached = sessionStorage.getItem(`tx_${hash}`);
      if (cached) {
        const txData = JSON.parse(cached);
        setTransaction(mergeTransaction(txData));
        setLoading(false);
        return;
      }

      try {
        console.log("Loading transaction details for hash:", hash);
        const tx = await fetchTransactionDetails(hash);
        if (!tx) {
          setError("Transaction not found");
          toast.error("Transaction not found");
        } else {
          setTransaction(mergeTransaction(tx));
          console.log("Transaction loaded successfully:", tx);
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
  }, [hash, location.state]);


  const getDashboardAddress = () => {
    if (transaction && transaction.from && transaction.from !== "Unknown") return transaction.from;
    const last = sessionStorage.getItem("last_accessed_address");
    return (last && last !== "Unknown") ? last : demoAddress;
  };

  const handleDashboardClick = () => {
    const dashboardAddress = getDashboardAddress();
    if (!dashboardAddress) {
      toast.error("No valid address to navigate to the dashboard");
      return;
    }
    if (transaction) {
      sessionStorage.setItem(`tx_${transaction.hash}`, JSON.stringify(transaction));
      sessionStorage.setItem("last_accessed_address", dashboardAddress);
    }
    navigate(`/dashboard/${dashboardAddress}`);
  };

  const getStatusIcon = (status: string) => {
    if (status === "tesSUCCESS") return <CheckCircle className="text-green-500" />;
    if (status === "failed") return <XCircle className="text-red-500" />;
    return <AlertCircle className="text-yellow-500" />;
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
            {t("common.returnHome")}
          </Link>
        </div>
      </div>
    );
  }
  {process.env.NODE_ENV === 'development' && (
    <pre className="mt-4 p-2 bg-gray-200 text-xs">
      {JSON.stringify(transaction, null, 2)}
    </pre>
  )}
  // Use merged transaction details
  const { from, to, type } = transaction;
  const fee = transaction.fee === "0.000000 XRP" ? "0.000012 XRP" : transaction.fee;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <Link to="/" className="text-primary hover:text-primary/90">
                  {t("nav.home")}
                </Link>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <button onClick={handleDashboardClick} className="text-primary hover:text-primary/90">
                  {t("nav.dashboard")}
                </button>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <span>{t("nav.transaction")}</span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <LanguageSelector />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h1 className="text-2xl font-bold text-secondary mb-6 flex items-center gap-2">
            <Hash className="h-6 w-6" />
            {t("transaction.details")}
          </h1>

          <div className="space-y-6">
            <div className="p-4 bg-primary/5 rounded-lg">
              <h3 className="font-medium text-gray-600 mb-2 flex items-center gap-2">
                <Hash className="h-4 w-4" />
                {t("transaction.hash")}
              </h3>
              <p className="font-mono text-sm break-all">{transaction.hash}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-primary/5 rounded-lg">
                <h3 className="font-medium text-gray-600 mb-2 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  {t("transaction.from")}
                </h3>
                <Link
                  to={`/dashboard/${from}`}
                  className="font-mono text-sm text-primary hover:underline break-all"
                >
                  {from}
                </Link>
              </div>

              <div className="p-4 bg-primary/5 rounded-lg">
                <h3 className="font-medium text-gray-600 mb-2 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  {t("transaction.to")}
                </h3>
                <Link
                  to={`/dashboard/${to}`}
                  className="font-mono text-sm text-primary hover:underline break-all"
                >
                  {to}
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-primary/5 rounded-lg">
                <h3 className="font-medium text-gray-600 mb-2 flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4" />
                  {t("transaction.amount")}
                </h3>
                <p className="font-bold">{transaction.amount}</p>
              </div>

              <div className="p-4 bg-primary/5 rounded-lg">
                <h3 className="font-medium text-gray-600 mb-2 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  {t("transaction.fee")}
                </h3>
                <p>{fee}</p>
              </div>

              <div className="p-4 bg-primary/5 rounded-lg">
                <h3 className="font-medium text-gray-600 mb-2 flex items-center gap-2">
                  {getStatusIcon(transaction.status)}
                  {t("transaction.status")}
                </h3>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  transaction.status === "tesSUCCESS" ? "bg-green-100 text-green-800" : 
                  transaction.status === "failed" ? "bg-red-100 text-red-800" : 
                  "bg-gray-100 text-gray-800"
                }`}>
                  {transaction.status}
                </span>
              </div>
            </div>

            {transaction.memo && (
              <div className="p-4 bg-primary/5 rounded-lg">
                <h3 className="font-medium text-gray-600 mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t("transaction.memo")}
                </h3>
                <p className="text-sm">{transaction.memo}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-primary/5 rounded-lg">
                <h3 className="font-medium text-gray-600 mb-2 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  {t("transaction.type")}
                </h3>
                <p className="flex items-center gap-2">
                  {type}
                  {transaction.isBitbob && (
                    <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                      {t("common.bitbob")}
                    </span>
                  )}
                </p>
              </div>

              <div className="p-4 bg-primary/5 rounded-lg">
                <h3 className="font-medium text-gray-600 mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t("transaction.date")}
                </h3>
                <p>{transaction.date}</p>
              </div>
            </div>
          </div>
        </div>
       <Footer />
     </div>
    </div>
  );
};

export default Transaction;

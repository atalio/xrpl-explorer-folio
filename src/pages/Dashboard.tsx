import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  fetchTransactions,
  fetchBalance,
  type Transaction,
  type BalanceDetails,
  validateXRPLAddress
} from "../services/xrpl";
import { toast } from "sonner";
import QRCodeStyling from "qr-code-styling";
import { Footer } from "@/components/ui/footer";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Wallet,
  Search,
  QrCode,
  ArrowLeftRight,
  Hash,
  Code,
  Copy
} from "lucide-react";

const VanityQRCode = ({ data }: { data: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!data || !ref.current) return;
    const qrCode = new QRCodeStyling({
      width: 120, // 60% of original 200px
      height: 120,
      data: data,
      margin: 2,
      dotsOptions: {
        type: "rounded",
        color: "#1A1F2C",
      },
      backgroundOptions: {
        color: "#FFFFFF",
      },
      imageOptions: {
        crossOrigin: "anonymous",
        margin: 6,
        imageSize: 0.6,
        hideBackgroundDots: true,
      },
      image: "/favicon.ico",
    });
    ref.current.innerHTML = "";
    qrCode.append(ref.current);
  }, [data]);
  return <div ref={ref} />;
};

const Dashboard = () => {
  const { address } = useParams<{ address: string }>();
  // Define effectiveAddress: use demo address if none provided or "default"
const demoAddress = "rHNTXD6a7VfFzQK9bNMkX4kYD8nLjhgb32";
// const getDashboardAddress = () => {
//   if (transaction && transaction.from && transaction.from !== "Unknown") return transaction.from;
//   const last = sessionStorage.getItem("last_accessed_address");
//   return (last && last !== "Unknown") ? last : demoAddress;
// };

  const effectiveAddress = !address || address === "default" ? demoAddress : address;
  
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rawResponse, setRawResponse] = useState<string>("");
  const [balance, setBalance] = useState<BalanceDetails>({
    total: "0.000000 XRP",
    available: "0.000000 XRP",
    reserve: "0.000000 XRP"
  });
  const [loading, setLoading] = useState(true);
  const [searchAddress, setSearchAddress] = useState("");
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const navigate = useNavigate();

  const addLog = (message: string) => {
    console.log(message);
    setDebugLogs(prev => [...prev, message]);
  };

  useEffect(() => {
    const loadData = async () => {
      addLog(`Starting loadData. Address: ${effectiveAddress}`);
      if (!effectiveAddress) {
        addLog("No address provided, skipping data load.");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        addLog("Fetching transactions and balance.");
        const [txs, bal] = await Promise.all([
          fetchTransactions(effectiveAddress),
          fetchBalance(effectiveAddress)
        ]);
        addLog(`Fetched transactions: ${txs.length}, balance: ${bal.total}`);
        const consoleOutput = (window as any).__xrpl_debug_response;
        if (consoleOutput) {
          setRawResponse(JSON.stringify(consoleOutput, null, 2));
          addLog("Raw response logged.");
        }
        setTransactions(txs);
        setBalance(bal);
        addLog("Vanity QR code will be rendered using qr-code-styling.");
      } catch (error) {
        addLog("Error loading data: " + error);
        console.error("[Dashboard] Error loading data:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
        addLog("Finished loadData.");
      }
    };
    loadData();
  }, [effectiveAddress]);

  const handleSearch = () => {
    addLog("Search button pressed.");
    if (!searchAddress) {
      toast.error("Please enter an XRPL address");
      addLog("Search aborted: No address provided.");
      return;
    }
    if (!validateXRPLAddress(searchAddress)) {
      toast.error("Invalid XRPL address format");
      addLog("Search aborted: Invalid XRPL address.");
      return;
    }
    addLog("Navigating to dashboard for address: " + searchAddress);
    navigate(`/dashboard/${searchAddress}`);
  };

  const handleAddressClick = (clickedAddress: string) => {
    addLog("Address clicked: " + clickedAddress);
    navigate(`/dashboard/${clickedAddress}`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const getMoneyFlowIndicator = (tx: Transaction, currentAddress?: string) => {
    if (!currentAddress || !tx.from) return null;
    const isOutgoing = tx.from.toLowerCase() === currentAddress.toLowerCase();
    return (
      <div className={`flex items-center gap-1 ${isOutgoing ? "text-[#ea384c]" : "text-[#1EAEDB]"}`}>
        {isOutgoing ? (
          <>
            <span className="text-xs">↓ Sent</span>
            <span className="font-bold">{tx.amount}</span>
          </>
        ) : (
          <>
            <span className="text-xs">↑ Received</span>
            <span className="font-bold">{tx.amount}</span>
          </>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4">Loading data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
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
                <span>{t("nav.dashboard")}</span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <LanguageSelector />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h1 className="text-2xl font-bold text-secondary mb-4 flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            {t("dashboard.title")}
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-primary/10 rounded-lg flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  <span>{t("dashboard.address")}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(effectiveAddress)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="font-mono text-sm break-all">{effectiveAddress || "Example: rHNTXD6a7VfFzQK9bNMkX4kYD8nLjhgb32"}</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4" />
                {t("dashboard.totalBalance")}
              </p>
              <p className="font-bold text-xl">{balance.total}</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4" />
                {t("dashboard.availableBalance")}
              </p>
              <p className="font-bold text-xl">{balance.available}</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg flex justify-center items-center">
              <div style={{ textAlign: "center" }}>
                <QrCode style={{ height: 20, width: 20, color: "#1A1F2C" }} />
                {effectiveAddress ? (
                  <>
                    <VanityQRCode data={effectiveAddress} />
                    <p className="font-mono text-xs break-all">{effectiveAddress || "Example: rHNTXD6a7VfFzQK9bNMkX4kYD8nLjhgb32"}
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(effectiveAddress)}>
                  <Copy className="h-4 w-4" />
                </Button>
                    </p>
                  </>
                  
                ) : (
                  <p className="text-sm text-gray-500">No XRPL address provided</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 mb-6">
            <div className="flex gap-2">
              <Input
                placeholder="Enter XRPL address"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                className="font-mono"
                onKeyPress={(e) => { if (e.key === "Enter") handleSearch(); }}
              />
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                {t("dashboard.search")}
              </Button>
            </div>
            <p className="font-mono text-xs break-all">
              Example: rHNTXD6a7VfFzQK9bNMkX4kYD8nLjhgb32
            </p>
            </div>
          <Collapsible className="mb-4">
            <CollapsibleTrigger className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
              <Code className="h-4 w-4" />
              <span>{t("dashboard.rawData")}</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold mb-2">Raw XRPL Response:</h3>
                <pre className="text-xs overflow-x-auto">
                  {rawResponse || "No response data available"}
                </pre>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Optionally display debug logs */}
          {showLogs && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg text-xs overflow-x-auto max-h-64">
              <h4 className="font-bold mb-2">Debug Logs:</h4>
              {debugLogs.map((log, index) => (
                <p key={index}>{log}</p>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-secondary mb-6">
            {t("dashboard.recentTransactions")}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">{t("transaction.type")}</th>
                  <th className="text-left p-4">{t("transaction.hash")}</th>
                  <th className="text-left p-4">{t("transaction.from")}</th>
                  <th className="text-left p-4">{t("transaction.to")}</th>
                  <th className="text-left p-4">{t("transaction.date")}</th>
                  <th className="text-left p-4">{t("transaction.flow")}</th>
                  <th className="text-left p-4">{t("transaction.fee")}</th>
                  <th className="text-left p-4">{t("transaction.status")}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      {t("dashboard.noTransactions")}
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.hash} className="border-b hover:bg-gray-50">
                      <td className="p-4 flex items-center gap-2">
                        {tx.type}
                        {tx.isBitbob && (
                          <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                            BitBob
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                      <Link 
                      to={`/transaction/${tx.hash}`}
                      state={{ transaction: tx }}
                      className="font-mono text-sm text-primary hover:underline"
                      >
                      {tx.hash ? tx.hash.substring(0, 8) + "..." : "Unknown"}
                      </Link>

                      </td>
                      <td className="p-4">
                        {tx.from && (
                          <button
                            onClick={() => handleAddressClick(tx.from)}
                            className="font-mono text-sm text-primary hover:underline"
                          >
                            {tx.from.substring(0, 8)}...
                          </button>
                        )}
                      </td>
                      <td className="p-4">
                        {tx.to && (
                          <button
                            onClick={() => handleAddressClick(tx.to)}
                            className="font-mono text-sm text-primary hover:underline"
                          >
                            {tx.to.substring(0, 8)}...
                          </button>
                        )}
                      </td>
                      <td className="p-4">{tx.date || t("dashboard.unknownDate")}</td>
                      <td className="p-4">{getMoneyFlowIndicator(tx, effectiveAddress)}</td>
                      <td className="p-4">{tx.fee || "0"}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          tx.status === "tesSUCCESS"
                            ? "bg-green-100 text-green-800"
                            : tx.status === "failed"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {tx.status || t("dashboard.unknownStatus")}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Dashboard;

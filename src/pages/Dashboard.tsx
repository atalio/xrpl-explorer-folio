
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { fetchTransactions, fetchBalance, type Transaction, type BalanceDetails, validateXRPLAddress } from "../services/xrpl";
import { toast } from "sonner";
import QRCode from "qrcode";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const { address } = useParams<{ address: string }>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState<BalanceDetails>({
    total: "0.000000 XRP",
    available: "0.000000 XRP",
    reserve: "0.000000 XRP"
  });
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string>("");
  const [searchAddress, setSearchAddress] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      if (!address) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        console.log('[Dashboard] Loading data for address:', address);
        const [txs, bal] = await Promise.all([
          fetchTransactions(address),
          fetchBalance(address)
        ]);
        
        console.log('[Dashboard] Loaded transactions:', txs);
        console.log('[Dashboard] Loaded balance:', bal);
        
        setTransactions(txs);
        setBalance(bal);

        // Generate QR Code
        QRCode.toDataURL(address, {
          width: 200,
          margin: 2,
          color: {
            dark: '#1A1F2C',
            light: '#FFFFFF',
          },
        })
          .then(url => setQrCode(url))
          .catch(err => console.error("QR Code generation failed:", err));

      } catch (error) {
        console.error('[Dashboard] Error loading data:', error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [address]);

  const handleSearch = () => {
    if (!searchAddress) {
      toast.error("Please enter an XRPL address");
      return;
    }

    if (!validateXRPLAddress(searchAddress)) {
      toast.error("Invalid XRPL address format");
      return;
    }

    navigate(`/dashboard/${searchAddress}`);
  };

  const handleAddressClick = (clickedAddress: string) => {
    navigate(`/dashboard/${clickedAddress}`);
  };

  const getMoneyFlowIndicator = (tx: Transaction, currentAddress?: string) => {
    if (!currentAddress || !tx.from) return null;
    
    const isOutgoing = tx.from.toLowerCase() === currentAddress.toLowerCase();
    
    return (
      <div className={`flex items-center gap-1 ${
        isOutgoing ? 'text-[#ea384c]' : 'text-[#1EAEDB]'
      }`}>
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <Link to="/" className="text-primary hover:text-primary/90">Home</Link>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <span>Dashboard</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h1 className="text-2xl font-bold text-secondary mb-4">Account Overview</h1>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-gray-600">Address</p>
              <p className="font-mono text-sm break-all">{address}</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-gray-600">Total Balance</p>
              <p className="font-bold text-xl">{balance.total}</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-gray-600">Available Balance</p>
              <p className="font-bold text-xl">{balance.available}</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg flex justify-center items-center">
              {qrCode && (
                <img 
                  src={qrCode} 
                  alt="XRPL Address QR Code" 
                  className="max-w-[120px] rounded-lg shadow-sm"
                />
              )}
            </div>
          </div>

          <div className="flex gap-2 mb-6">
            <Input
              placeholder="Enter XRPL address..."
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              className="font-mono"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
            <Button onClick={handleSearch}>Search</Button>
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
                  <th className="text-left p-4">From</th>
                  <th className="text-left p-4">To</th>
                  <th className="text-left p-4">Date</th>
                  <th className="text-left p-4">Flow</th>
                  <th className="text-left p-4">Fee</th>
                  <th className="text-left p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      No transactions found
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
                          className="font-mono text-sm text-primary hover:underline"
                        >
                          {tx.hash ? tx.hash.substring(0, 8) + '...' : 'Unknown'}
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
                      <td className="p-4">{tx.date || 'Unknown'}</td>
                      <td className="p-4">
                        {getMoneyFlowIndicator(tx, address)}
                      </td>
                      <td className="p-4">{tx.fee || '0'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          tx.status === 'tesSUCCESS' ? 'bg-green-100 text-green-800' : 
                          tx.status === 'failed' ? 'bg-red-100 text-red-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {tx.status || 'unknown'}
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
    </div>
  );
};

export default Dashboard;

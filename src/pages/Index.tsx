import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { validateXRPLAddress } from "../services/xrpl";
import { toast } from "sonner";

const Index = () => {
  const [address, setAddress] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateXRPLAddress(address)) {
      navigate(`/dashboard/${address}`);
    } else {
      toast.error("Please enter a valid XRPL address");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 flex flex-col items-center justify-center p-4">
      <div className="animate-float mb-8">
        <img src="/logo.svg" alt="BitBob Logo" className="w-32 h-32" />
      </div>
      
      <div className="w-full max-w-md backdrop-blur-lg bg-white/30 p-8 rounded-2xl shadow-xl border border-white/20">
        <h1 className="text-3xl font-bold text-secondary mb-6 text-center">
          XRPL Transaction Viewer
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-secondary mb-2">
              XRPL Address
            </label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="Enter your XRPL address"
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            View Transactions
          </button>
        </form>
      </div>
    </div>
  );
};

export default Index;
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { validateXRPLAddress } from "../services/xrpl";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [address, setAddress] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Automatically redirect to dashboard if URL is accessed directly
  useEffect(() => {
    if (location.pathname === "/dashboard") {
      navigate("/dashboard/default");
    }
  }, [location.pathname, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      toast.error("Please enter an XRPL address");
      return;
    }
    
    if (validateXRPLAddress(address)) {
      navigate(`/dashboard/${address}`);
    } else {
      toast.error("Please enter a valid XRPL address");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 flex flex-col items-center justify-center p-4">
      <div className="animate-float mb-8">
        <img 
          src="/bitbob_logo.png" 
          alt="Bitbob Logo" 
          className="w-82 h-32"
        />
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
            <Input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="font-mono"
              placeholder="Enter your XRPL address"
            />
          </div>
          
          <Button type="submit" className="w-full">
            View Transactions
          </Button>
        </form>

        <div className="mt-4 text-sm text-center text-gray-600">
          Example: rHNTXD6a7VfFzQK9bNMkX4kYD8nLjhgb32
        </div>
      </div>
    </div>
  );
};

export default Index;

// "SourceTag": "29202152"

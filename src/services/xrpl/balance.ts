
import { toast } from "sonner";
import { getClient, formatXRPAmount } from './utils';
import type { BalanceDetails, AccountInfoResponse } from './types';

export const fetchBalance = async (address: string): Promise<BalanceDetails> => {
  let client = null;
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

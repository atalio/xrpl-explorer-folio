
import { Client, isValidClassicAddress } from 'xrpl';
import { XRPL_SERVERS } from './config';

export const validateXRPLAddress = (address: string): boolean => {
  return isValidClassicAddress(address);
};

export const getClient = async (): Promise<Client> => {
  const shuffledServers = [...XRPL_SERVERS].sort(() => Math.random() - 0.5);
  
  for (const server of shuffledServers) {
    try {
      const client = new Client(server);
      await client.connect();
      console.log(`Connected to ${server}`);
      return client;
    } catch (error) {
      console.error(`Failed to connect to ${server}:`, error);
      continue;
    }
  }
  throw new Error("Could not connect to any XRPL server");
};

export const formatXRPAmount = (amount: string | number | { value: string } | undefined): string => {
  if (!amount) return '0.000000 XRP';
  
  let amountValue: number;
  if (typeof amount === 'object' && 'value' in amount) {
    amountValue = parseFloat(amount.value);
  } else {
    amountValue = typeof amount === 'string' ? parseFloat(amount) : amount;
  }
  
  return `${(amountValue / 1_000_000).toFixed(6)} XRP`;
};

export const formatXRPLDate = (rippleEpochDate: number): string => {
  try {
    const unixTimestamp = (rippleEpochDate + 946684800) * 1000;
    return new Date(unixTimestamp).toLocaleString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

export const hexToAscii = (hex: string): string => {
  let ascii = '';
  for (let i = 0; i < hex.length; i += 2) {
    ascii += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return ascii;
};

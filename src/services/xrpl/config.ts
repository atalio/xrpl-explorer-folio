
export const XRPL_SERVERS = [
  "wss://xrplcluster.com",
  "wss://s1.ripple.com",
  "wss://s2.ripple.com",
  "wss://rippleitin.com",
  "wss://xrpl.ws",
  "wss://xrpl.link",
  // Additional working mainnet endpoints found:
  "wss://s1.ripple.com/",  // Ripple's general-purpose public server
  "wss://s2.ripple.com/",  // Ripple's full-history public server
  "wss://xrplcluster.com/", // XRP Ledger Foundation cluster (alias of xrpl.ws)
] as const;

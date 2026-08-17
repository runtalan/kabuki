import { PlaidApi, Configuration, Products, CountryCode } from "plaid";

const baseUrlFor = (env: string) => ({
  sandbox: "https://sandbox.plaid.com",
  development: "https://development.plaid.com",
  production: "https://production.plaid.com",
}[env] || "https://sandbox.plaid.com");

const productMap: Record<string, Products> = {
  transactions: Products.Transactions,
  auth: Products.Auth,
  identity: Products.Identity,
  income: Products.Income,
  investments: Products.Investments,
  liabilities: Products.Liabilities,
};

const countryMap: Record<string, CountryCode> = {
  US: CountryCode.Us,
  CA: CountryCode.Ca,
  DE: CountryCode.De,
  ES: CountryCode.Es,
  FR: CountryCode.Fr,
  GB: CountryCode.Gb,
  IE: CountryCode.Ie,
  NL: CountryCode.Nl,
};

export interface PlaidHouseholdConfig {
  clientId: string;
  secret: string;
  env: string;
  products: Products[];
  countryCodes: CountryCode[];
  redirectUri: string;
}

function envVar(name: string, suffix: string): string {
  return process.env[`${name}${suffix}`] || "";
}

const configCache = new Map<string, PlaidHouseholdConfig>();
const clientCache = new Map<string, PlaidApi>();

export function getPlaidConfig(suffix: string): PlaidHouseholdConfig {
  if (configCache.has(suffix)) return configCache.get(suffix)!;

  const cfg: PlaidHouseholdConfig = {
    clientId: envVar("PLAID_CLIENT_ID", suffix),
    secret: envVar("PLAID_SECRET", suffix),
    env: envVar("PLAID_ENV", suffix) || "sandbox",
    products: (envVar("PLAID_PRODUCTS", suffix) || "transactions")
      .split(",")
      .map((p) => p.trim())
      .map((p) => productMap[p] || Products.Transactions) as Products[],
    countryCodes: (envVar("PLAID_COUNTRY_CODES", suffix) || "US")
      .split(",")
      .map((c) => c.trim())
      .map((c) => countryMap[c] || CountryCode.Us) as CountryCode[],
    redirectUri: process.env.AUTH_URL || "http://localhost:3000",
  };
  configCache.set(suffix, cfg);
  return cfg;
}

export function getPlaidClient(suffix: string): PlaidApi {
  if (clientCache.has(suffix)) return clientCache.get(suffix)!;

  const cfg = getPlaidConfig(suffix);
  const client = new PlaidApi(
    new Configuration({
      basePath: baseUrlFor(cfg.env),
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": cfg.clientId,
          "PLAID-SECRET": cfg.secret,
        },
      },
    })
  );
  clientCache.set(suffix, client);
  return client;
}

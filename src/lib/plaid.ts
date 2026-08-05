import { PlaidApi, Configuration, Products, CountryCode } from "plaid";

const baseUrl = {
  sandbox: "https://sandbox.plaid.com",
  development: "https://development.plaid.com",
  production: "https://production.plaid.com",
}[process.env.PLAID_ENV || "sandbox"];

const configuration = new Configuration({
  basePath: baseUrl,
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

// Map product and country strings to Plaid enum values
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

export const plaidConfig = {
  clientId: process.env.PLAID_CLIENT_ID || "",
  secret: process.env.PLAID_SECRET || "",
  env: (process.env.PLAID_ENV || "sandbox") as
    | "sandbox"
    | "development"
    | "production",
  products: (process.env.PLAID_PRODUCTS || "transactions")
    .split(",")
    .map((p) => p.trim())
    .map((p) => productMap[p] || Products.Transactions) as Products[],
  countryCodes: (process.env.PLAID_COUNTRY_CODES || "US")
    .split(",")
    .map((c) => c.trim())
    .map((c) => countryMap[c] || CountryCode.Us) as CountryCode[],
  redirectUri: process.env.AUTH_URL || "http://localhost:3000",
};

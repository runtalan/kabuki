export type AssetType = 'stock' | 'option';
export type OptionType = 'call' | 'put';
export type RiskLevel = 'low' | 'medium' | 'high';
export type OrderStrategy = 'cash_secured_put' | 'covered_call' | 'buy_call';
export type OrderType = 'limit' | 'market';

export interface Holding {
  id: string;
  ticker: string;
  assetType: AssetType;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  totalValue: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
}

export interface OptionContract {
  id: string;
  ticker: string;
  optionType: OptionType;
  strike: number;
  expiry: Date;
  bid: number;
  ask: number;
  premium: number;
  dailyYield: number;
  annualizedReturn: number;
  delta: number;
  riskLevel: RiskLevel;
  volume: number;
  openInterest: number;
  lastUpdated: Date;
}

export interface OrderState {
  id?: string;
  strategy: OrderStrategy;
  ticker: string;
  expiry: Date;
  strike: number;
  orderType: OrderType;
  limitPrice?: number;
  quantity: number;
  estimatedPremium?: number;
  estimatedAnnualYield?: number;
  maxRisk?: number;
  maxProfit?: number;
  expiresIn?: number;
}

export interface OptionsExplorationState {
  holdings: Holding[];
  selectedTicker: string | null;
  availableContracts: OptionContract[];
  currentOrder: OrderState | null;
  isLoading: boolean;
  error: string | null;
}

export type MetricMode = 'premium' | 'ari' | 'delta';
export type MoneynessCategoryFilter = 'all' | 'itm' | 'atm' | 'otm';

export interface HeatmapFilterState {
  optionType: 'call' | 'put' | 'both';
  metricMode: MetricMode;
  timeRange?: {
    minDTE: number;
    maxDTE: number;
  };
  moneynessFilter: MoneynessCategoryFilter;
  yieldFilter?: {
    min: number;
    max: number;
  };
}

export interface HeatmapCellData {
  strike: number;
  expiry: Date;
  metricValue: number;
  totalPremium: number;
  dailyYield: number;
  annualizedYield: number;
  callContracts: OptionContract[];
  putContracts: OptionContract[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface OptionsHeatmapProps {
  ticker: string;
  currentPrice: number;
  contracts: OptionContract[];
  onSelectContract: (contract: OptionContract, strike: number, expiry: Date) => void;
  openGuideModal?: () => void;
}

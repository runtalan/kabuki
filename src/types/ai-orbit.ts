// Mock domain types for the AI Orbit automated Wheel Strategy dashboard.
// Frontend/UI only — no backend, schema, or API is implied by these shapes.

export type WheelPhase = 'PUT' | 'CALL';

export type AgentStatus = 'ACTIVE' | 'PAUSED' | 'ERROR';

export type RiskProfile = 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';

export interface AgentPosition {
  contracts: number;
  strike: number;
  expiration: string; // ISO date
  dte: number;
  premiumCollected: number;
  underlyingPrice: number;
}

export interface Agent {
  id: string;
  ticker: string;
  companyName: string;
  status: AgentStatus;
  phase: WheelPhase;
  riskProfile: RiskProfile;
  capturedPremium: number;
  positionPl: number;
  rawStockBasis: number;
  totalCapturedPremiums: number;
  sharesHeld: number;
  position: AgentPosition | null;
  targetDte: number;
  createdAt: string; // ISO date
}

export type ExecutionLogLevel = 'ACCEPTED' | 'FILL' | 'REJECTED' | 'CRON_POLL';

export interface ExecutionLog {
  id: string;
  timestamp: string; // ISO datetime
  ticker: string;
  level: ExecutionLogLevel;
  message: string;
}

export interface MonthlyYield {
  month: string; // e.g. "Jan"
  putPremium: number;
  callPremium: number;
}

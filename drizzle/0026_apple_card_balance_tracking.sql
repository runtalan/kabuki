-- Tracks which accounts should zero out monthly (pay-in-full cards) and
-- which month their currentBalance currently represents.
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS reset_balance_monthly boolean NOT NULL DEFAULT false;

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS balance_month varchar(7);

-- Opt the two existing Apple Card accounts into monthly reset. Their
-- balance_month stays null until the next transaction/reset touches them —
-- see resetStaleMonthlyBalances in src/lib/balance-reset.ts.
UPDATE accounts
SET reset_balance_monthly = true
WHERE name = 'Apple Card' AND is_manual = true AND liability_type = 'credit_card';

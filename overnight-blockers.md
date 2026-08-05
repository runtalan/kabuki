# Overnight Blockers Log

Ambiguous decisions or destructive-risk situations encountered during the autonomous audit, logged rather than acted on unilaterally.

**None reached the threshold for a hard stop.** Two judgment calls worth flagging (neither blocked progress — both implemented with the tradeoff documented at the point of decision):

1. **Budget Performance historical variance has no historical budget to compare against** — `categories.monthly_budget` is a single current value, not versioned over time. `getMonthlyBudgetHistory` compares real historical spend against *today's* budget total rather than "the budget as it was that month," since the latter doesn't exist in the schema. Made this explicit in the UI copy ("vs. today's budget") rather than silently presenting it as more precise than it is. A true fix would need a `budget_history` table (snapshot on every edit) — judged out of scope for this pass; flagging here in case that's wanted later.

2. **Recurring day-modal dismiss reuses the existing `remove()` confirm() dialog** rather than a separate no-confirm-needed flow scoped to "just this day's occurrence." Since dismissing from the calendar and dismissing from the list view both mean the same thing (stop treating this merchant as recurring, not just skip today), reusing the same confirmed, tested code path seemed more correct than adding a second removal mechanism with different semantics.

See `overnight-progress-report.md` for the full session summary.

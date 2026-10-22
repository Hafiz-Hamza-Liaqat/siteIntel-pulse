# SiteIntel Pulse — Scoring Methodology & Evaluation Logic

## 1. Principles of Scoring Integrity
SiteIntel Pulse enforces mathematical and diagnostic integrity:
1. **Never Invent Data:** If a metric is unmeasurable or a provider is not connected, the test result is `UNKNOWN` or `NOT_TESTED`, never a fictitious pass or fail.
2. **Deterministic Rules:** Every test outcome is computed by pure TypeScript functions based strictly on captured evidence records.
3. **Immutable Score Ledger:** Raw observations and individual test results are stored in an append-only ledger before any report projection.

## 2. Test Result States and Point Behavior

| Status | Meaning | Points Awarded | Included in Denominator? |
|---|---|---|---|
| `PASS` | Assertion observed and satisfied | 100% of max points (e.g. 2 / 2) | Yes |
| `WARNING` | Partial issue or weak signal detected | 50% of max points (e.g. 1 / 2) | Yes |
| `FAIL` | Assertion failed / clear defect detected | 0 points | Yes |
| `NOT_DETECTED` | Expected element sought but not observed | 0 or context points | Yes |
| `NOT_APPLICABLE` | Rule does not apply to site type | 0 points | **No** (Excluded from denominator) |
| `UNKNOWN` | Insufficient evidence or no provider key | 0 points | No (Reduces coverage) |
| `NOT_TESTED` | Outside crawl scope or bypassed | 0 points | No (Reduces coverage) |
| `BLOCKED` | Request blocked by rate-limit / robots | 0 points | No (Reduces coverage) |

## 3. Category Score Calculation
For each category $c \in \{1 \dots 11\}$:
$$\text{Tested Points}_c = \sum_{t \in \text{Applicable \& Tested}_c} \text{Max Points}_t$$
$$\text{Earned Points}_c = \sum_{t \in \text{Applicable \& Tested}_c} \text{Earned Points}_t$$
$$\text{Category Score}_c = \begin{cases} 100 \times \frac{\text{Earned Points}_c}{\text{Tested Points}_c} & \text{if } \text{Tested Points}_c > 0 \\ 0 & \text{otherwise} \end{cases}$$

## 4. Overall Composite Score Calculation
The overall score is the weighted average across evaluated categories:
$$\text{Overall Score} = \frac{\sum_{c} \left( \text{Category Score}_c \times \text{Allocated Weight}_c \times \text{Category Coverage}_c \right)}{\sum_{c} \left( \text{Allocated Weight}_c \times \text{Category Coverage}_c \right)}$$
Where the total possible catalogue weights sum to exactly 100.

## 5. Coverage Thresholds & Provisional Status
A scan is labeled **Provisional / Insufficient Coverage** if:
- Total weighted evaluated points < 70% of the 100-point catalogue.
- Any individual evaluated category coverage < 60%.
When provisional, the report explicitly alerts the owner that additional testing or provider integration is required for a conclusive baseline.

## 6. Score Rating Bands
- **90–100:** Strong observed baseline.
- **75–89:** Generally healthy; opportunities remain.
- **60–74:** Needs improvement.
- **40–59:** Weak areas need attention.
- **0–39:** Significant improvement required.

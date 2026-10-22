# LeakFinder AI — Profit Margin Leak Detection

LeakFinder AI reconciles multi-source commerce datasets (Sales, Orders, Discounts, Returns, Costs) to identify where businesses lose margin, why each leak occurs (using NVIDIA Nemotron 70B AI with robust rule-based fallbacks), and models the exact profit impact of discount policy caps.

---

## 1. Detection Rules & Operational Thresholds

All thresholds are centralized in `src/rules/thresholds.ts` for configurability:

| Leak Rule | Category | Detection Condition | Loss Calculation | Default Threshold |
| :--- | :--- | :--- | :--- | :--- |
| **Discount Overuse** | `Discount` | Applied discount exceeds channel cap | $\text{discount} - (\text{cap} \times \text{gross})$ | Web: 15%, Store: 10%, Wholesale: 20% |
| **Sub-Target Margin** | `Pricing` | SKU gross margin falls below 20% | $(20\% \times \text{revenue}) - \text{gross profit}$ | Minimum 20% target margin floor |
| **Shipping Overrun** | `Delivery` | Freight and shipping expense $> 10\%$ of revenue | $\text{shipping} - (10\% \times \text{gross})$ | 10% maximum shipping allowance |
| **Defective Refund Rate** | `Refunds` | Refund exceeds 25% of gross order value | $\text{refund} - \text{restock fee} - (25\% \times \text{gross})$ | 25% refund threshold |
| **Uncovered Returns** | `Returns` | Standard return where refund exceeds restock fee | $\text{refund} - \text{restock fee}$ | Unrecovered inspection / restock fee gap |

### Deduplication Guarantee
Every order transaction is evaluated against all eligible candidate rules and assigned strictly to its **single largest monetary leak**. This guarantees that:
$$\text{Potential Leakage} = \sum \text{Category Totals}$$
with **zero double counting**.

### Severity Classification
- **High Severity**: $\ge 30\%$ share of total potential leakage.
- **Medium Severity**: $10\%$ to $29.9\%$ share of total potential leakage.
- **Low Severity**: $< 10\%$ share of total potential leakage.

---

## 2. Seeded 120-Order Benchmark Demo Patterns

The "Load demo data" button deterministically generates 120 orders over 4 weeks using a Mulberry32 seeded PRNG (`seed: 42949`):
1. **Web Discounting**: Web orders discounted between 22% and 30% on ~38% of transactions (codes: `FLASH25`, `VIPWEB30`, `SAVE25NOW`).
2. **Sub-Target Margin (SKU-LST-119)**: Price ₹4,200 with COGS ₹3,600 and handling ₹150, realizing only ~9.5% gross margin (well below 20%).
3. **Logistics Shipping Overrun (SKU-SMB-220)**: Small parcel priced at ₹1,800 incurring ₹700 in carrier freight (~38.8% of price).
4. **Defective Batch Outliers (SKU-PRO-402)**: High-end unit priced at ₹9,500 suffering 100% customer refunds due to internal firmware calibration defects on ~35% of orders.

---

## 3. NVIDIA Nemotron AI Integration & Fallback Architecture

### Endpoints
- `POST /api/explain`: Evaluates leak evidence and queries `https://integrate.api.nvidia.com/v1/chat/completions` using model `nvidia/llama-3.1-nemotron-70b-instruct` (overridable via `NEMOTRON_MODEL`). Temperature 0.2, 25-second timeout.
- `POST /api/ask`: Interactive assistant answering questions from the analysis summary and built-in user guide.

### Zero-Failure Guarantee
When `NVIDIA_API_KEY` is not configured or remote API calls fail/timeout, LeakFinder AI automatically switches to **deterministic rule-based explanations** grounded strictly in actual numbers from the analysis.

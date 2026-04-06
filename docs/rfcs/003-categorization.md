# RFC 003 — Transaction categorization

## Problem

Merchant names in Brazilian credit card invoices are often truncated, garbled, or prefixed (e.g. `IFD*TREND ALIMENTACOES DE`, `UBER *TRIP HELP.UBER.COM`). Users should not have to manually categorize each transaction. The system must do it automatically.

## Approach: merchant table + LLM hybrid

```
raw description
      │
      ▼
merchant table lookup ──── found ──▶ assign category
      │
   not found
      │
      ▼
   LLM call
      │
      ├── confidence high ──▶ assign category + save to merchant table
      │
      └── confidence low ──▶ pending review queue
                                    │
                                    ▼
                             user confirms in UI
                                    │
                                    ▼
                             save to merchant table
```

## Merchant table

The core of the system's "memory". Maps merchant name patterns to categories.

- Global entries: chains that appear across all users (Netflix, iFood, Uber)
- Per-user entries: local or ambiguous merchants that a user has manually confirmed

Over time, LLM calls decrease as the merchant table grows. For a typical user, most merchants repeat every month.

## Categories (fixed, MVP)

No user-customizable categories in the MVP. Customization adds complexity and defers the core value.

| Category | Subcategories |
|---|---|
| Food | Restaurants, Delivery, Supermarket, Bakery |
| Transport | Fuel, Rideshare, Parking, Public transit |
| Housing | Rent, Utilities, Internet/TV |
| Health | Pharmacy, Medical, Gym |
| Entertainment | Streaming, Events, Travel, Games |
| Shopping | Clothing, Electronics, Home |
| Education | Courses, Books |
| Finance | Insurance, Bank fees |
| Other | — |

See `api/src/categorization/categories.ts` when created.

## Confidence threshold

To be calibrated after initial LLM testing. Transactions below the threshold go to the review queue rather than being auto-categorized. The user's confirmations feed back into the merchant table.

## Why not rules-only

A rules-based approach (keyword matching) would require constant maintenance as new merchants appear. The LLM handles the long tail of unknown merchants naturally, and the merchant table ensures we don't pay for the same inference twice.

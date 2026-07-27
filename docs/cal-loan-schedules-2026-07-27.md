# CAL loan schedules — 2026-07-27

The three uploaded CAL PDFs are treated as the source of truth and replace any conflicting existing database values.

## CAL (Mizrahi) 6401

- Original amount: ILS 44,999.00
- Current balance at schedule start: ILS 44,999.00
- Monthly payment: ILS 2,969.31
- Interest: Prime + 2.50%, nominal annual rate 7.75%
- Start date: 2026-05-29
- 16 scheduled payments from 2026-08-02 through 2027-11-02
- Total scheduled payments: ILS 47,508.96
- Total scheduled interest: ILS 2,510.00
- Full principal, interest, payment, and remaining-balance schedule stored in `public.loan_payment_schedule`

## CAL Express 1 (Mizrahi) 6401

- Original amount: ILS 5,699.00
- Current balance at schedule start: ILS 5,699.00
- Monthly payment: ILS 376.06
- Interest: Prime + 2.50%, nominal annual rate 7.75%
- Start date: 2026-06-04
- 16 scheduled payments from 2026-08-02 through 2027-11-02
- Total scheduled payments: ILS 6,016.96
- Total scheduled interest: ILS 317.89
- Full principal, interest, payment, and remaining-balance schedule stored in `public.loan_payment_schedule`

## CAL Express 2 (Mizrahi) 6401

The third uploaded PDF is also treated as authoritative. Therefore this loan was overwritten to match that document, even though it duplicates the Express schedule above.

- Original amount: ILS 5,699.00
- Current balance at schedule start: ILS 5,699.00
- Monthly payment: ILS 376.06
- Interest: Prime + 2.50%, nominal annual rate 7.75%
- Start date: 2026-06-04
- 16 scheduled payments from 2026-08-02 through 2027-11-02
- Total scheduled payments: ILS 6,016.96
- Total scheduled interest: ILS 317.89
- Full principal, interest, payment, and remaining-balance schedule stored in `public.loan_payment_schedule`

## 30-day report integration

Every schedule row was recreated in `public.financial_entries` as a future `loan_payment` with a unique `source_reference`, linked to its loan. The existing rolling 30-day report reads these future entries, so each payment will appear automatically when its due date enters the report window.

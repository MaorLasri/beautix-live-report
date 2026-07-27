# CAL loan schedules — 2026-07-27

Database update performed from the official CAL amortization schedules supplied on 2026-07-27.

## Updated

- CAL (Mizrahi) 6401
  - Original amount: ILS 44,999.00
  - Monthly payment: ILS 2,969.31
  - Interest: Prime + 2.50%, current nominal annual rate 7.75%
  - 16 scheduled payments from 2026-08-02 through 2027-11-02
  - Full principal, interest, payment and remaining-balance schedule stored in `public.loan_payment_schedule`

- CAL Express 1 (Mizrahi) 6401
  - Original amount: ILS 5,699.00
  - Monthly payment: ILS 376.06
  - Interest: Prime + 2.50%, current nominal annual rate 7.75%
  - 16 scheduled payments from 2026-08-02 through 2027-11-02
  - Full principal, interest, payment and remaining-balance schedule stored in `public.loan_payment_schedule`

## 30-day report integration

Each scheduled payment was inserted into `public.financial_entries` as a future `loan_payment` entry with a unique `source_reference`. The existing 30-day report already reads future entries from this table, so payments automatically appear when their due date enters the rolling 30-day window.

## Not updated from the uploaded documents

The third uploaded PDF duplicated the CAL Express 1 schedule (ILS 5,699, 16 payments). It did not contain a distinct amortization schedule for CAL Express 2 (ILS 5,000, 20 payments). Express 2 was therefore left without generated schedule rows to avoid creating unsupported payment dates or amounts.

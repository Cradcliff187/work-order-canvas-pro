
BEGIN;

-- 1) Add columns if missing
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS invoice_date date,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS subcontractor_notes text,
  ADD COLUMN IF NOT EXISTS payment_terms varchar(50),
  ADD COLUMN IF NOT EXISTS purchase_order_number varchar(100);

-- 2) Set sensible defaults
ALTER TABLE public.invoices
  ALTER COLUMN invoice_date SET DEFAULT CURRENT_DATE;
ALTER TABLE public.invoices
  ALTER COLUMN due_date SET DEFAULT (CURRENT_DATE + INTERVAL '30 days')::date;
ALTER TABLE public.invoices
  ALTER COLUMN payment_terms SET DEFAULT 'Net 30';

-- 3) Backfill existing rows to safe defaults (so NOT NULL + CHECK will pass)
UPDATE public.invoices
SET invoice_date = COALESCE(invoice_date, CURRENT_DATE);

UPDATE public.invoices
SET due_date = COALESCE(due_date, (CURRENT_DATE + INTERVAL '30 days')::date);

-- 4) Enforce NOT NULL where required
ALTER TABLE public.invoices
  ALTER COLUMN invoice_date SET NOT NULL;

ALTER TABLE public.invoices
  ALTER COLUMN due_date SET NOT NULL;

-- 5) Enforce cross-field validation (immutable CHECK)
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_due_after_invoice_date_chk;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_due_after_invoice_date_chk
  CHECK (due_date >= invoice_date);

-- 6) Helpful indexes for sorting/filtering (idempotent)
CREATE INDEX IF NOT EXISTS invoices_invoice_date_idx ON public.invoices (invoice_date);
CREATE INDEX IF NOT EXISTS invoices_due_date_idx ON public.invoices (due_date);

COMMIT;

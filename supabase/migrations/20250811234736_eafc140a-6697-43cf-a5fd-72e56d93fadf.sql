
-- 1) Add work_order_id to invoice_attachments and index it
ALTER TABLE public.invoice_attachments
ADD COLUMN IF NOT EXISTS work_order_id uuid;

-- Create helpful indexes
CREATE INDEX IF NOT EXISTS idx_invoice_attachments_invoice_id
  ON public.invoice_attachments (invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_attachments_work_order_id
  ON public.invoice_attachments (work_order_id);

-- Add foreign key (nullable for now to avoid breaking existing data)
ALTER TABLE public.invoice_attachments
  ADD CONSTRAINT invoice_attachments_work_order_id_fkey
  FOREIGN KEY (work_order_id)
  REFERENCES public.work_orders (id)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

-- 2) Validation trigger: ensure the work_order_id belongs to the invoice via invoice_work_orders
CREATE OR REPLACE FUNCTION public.validate_invoice_attachment_work_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  link_exists boolean;
BEGIN
  -- Require work_order_id for invoice attachments
  IF NEW.work_order_id IS NULL THEN
    RAISE EXCEPTION 'work_order_id is required for invoice attachments';
  END IF;

  -- Verify that (invoice_id, work_order_id) is present in invoice_work_orders
  SELECT EXISTS (
    SELECT 1
    FROM public.invoice_work_orders iwo
    WHERE iwo.invoice_id = NEW.invoice_id
      AND iwo.work_order_id = NEW.work_order_id
  ) INTO link_exists;

  IF NOT link_exists THEN
    RAISE EXCEPTION 'Attachment work_order_id % is not linked to invoice %', NEW.work_order_id, NEW.invoice_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_invoice_attachment_work_order ON public.invoice_attachments;

CREATE TRIGGER trg_validate_invoice_attachment_work_order
BEFORE INSERT OR UPDATE ON public.invoice_attachments
FOR EACH ROW
EXECUTE FUNCTION public.validate_invoice_attachment_work_order();

-- 3) Ensure storage bucket exists (public for read access)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'work-order-attachments'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('work-order-attachments', 'work-order-attachments', true);
  END IF;
END
$$;

-- Create invoice_attachments table for storing uploaded invoice files
CREATE TABLE public.invoice_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type public.file_type NOT NULL DEFAULT 'document'::public.file_type,
  file_size INTEGER,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_invoice_attachments_invoice ON public.invoice_attachments(invoice_id);
CREATE INDEX idx_invoice_attachments_uploader ON public.invoice_attachments(uploaded_by);

-- Add table comment
COMMENT ON TABLE public.invoice_attachments IS 'Stores uploaded invoice documents and files';
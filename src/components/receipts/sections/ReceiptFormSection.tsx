import React from "react";
import { UseFormReturn } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { Form } from "@/components/ui/form";
import { ReceiptFormFields } from "../ReceiptFormFields";
import { LineItemsDisplay } from "../LineItemsDisplay";
import type { OCRResult, SmartReceiptFormData } from '@/types/receipt';
import type { FormConfidence } from '@/utils/ocrUtils';
import type { UseReceiptFlowReturn } from "@/hooks/useReceiptFlow";

interface ReceiptFormSectionProps {
  form: UseFormReturn<SmartReceiptFormData>;
  ocrData: OCRResult | null;
  ocrConfidence: FormConfidence;
  actions: UseReceiptFlowReturn['actions'];
  isMobile: boolean;
  isFormVisible: boolean;
  onSubmit: (data: SmartReceiptFormData) => Promise<void>;
}

export function ReceiptFormSection({
  form,
  ocrData,
  ocrConfidence,
  actions,
  isMobile,
  isFormVisible,
  onSubmit
}: ReceiptFormSectionProps) {
  if (!isFormVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{ overflow: 'hidden' }}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-tour="form-section">
            {/* Main Receipt Details */}
            <ReceiptFormFields
              form={form}
              ocrConfidence={ocrConfidence}
              isMobile={isMobile}
            />

            {/* Line Items Display */}
            <LineItemsDisplay
              ocrData={ocrData}
              ocrConfidence={ocrConfidence}
              onUpdateOCRData={(newData, confidence) => actions.setOCRSuccess(newData, confidence)}
              form={form}
            />

            {/* Bottom padding to account for FloatingActionBar */}
            <div className="pb-32" />
          </form>
        </Form>
      </motion.div>
    </AnimatePresence>
  );
}
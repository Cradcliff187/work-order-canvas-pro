/**
 * OCR Confidence Field Mapper
 * 
 * Maps between OCR field names (vendor, total, date) and form field names 
 * (vendor_name, amount, receipt_date) to ensure confidence scores display correctly.
 */

export interface OCRConfidence {
  vendor?: number;
  total?: number;
  date?: number;
}

export interface FormConfidence {
  vendor_name?: number;
  amount?: number;
  receipt_date?: number;
  [key: string]: number | undefined;
}

/**
 * Maps OCR confidence field names to form field names
 */
export function mapOCRConfidenceToForm(ocrConfidence: OCRConfidence): FormConfidence {
  const mapped: FormConfidence = {
    vendor_name: ocrConfidence.vendor,
    amount: ocrConfidence.total,
    receipt_date: ocrConfidence.date,
  };

  console.log('📊 OCR Confidence Mapping:', {
    input: ocrConfidence,
    output: mapped,
    mapping: {
      'vendor → vendor_name': `${(ocrConfidence.vendor || 0) * 100}% → ${(mapped.vendor_name || 0) * 100}%`,
      'total → amount': `${(ocrConfidence.total || 0) * 100}% → ${(mapped.amount || 0) * 100}%`,
      'date → receipt_date': `${(ocrConfidence.date || 0) * 100}% → ${(mapped.receipt_date || 0) * 100}%`,
    }
  });

  return mapped;
}

/**
 * Maps form confidence field names back to OCR field names (for debugging)
 */
export function mapFormConfidenceToOCR(formConfidence: FormConfidence): OCRConfidence {
  return {
    vendor: formConfidence.vendor_name,
    total: formConfidence.amount,
    date: formConfidence.receipt_date,
  };
}

/**
 * Helper to get confidence value for a form field
 */
export function getFormFieldConfidence(
  formConfidence: FormConfidence, 
  fieldName: keyof FormConfidence
): number {
  return formConfidence[fieldName] || 0;
}

/**
 * Helper to get confidence value for an OCR field  
 */
export function getOCRFieldConfidence(
  ocrConfidence: OCRConfidence,
  fieldName: keyof OCRConfidence
): number {
  return ocrConfidence[fieldName] || 0;
}
// Document type detection utilities

export function detectDocumentType(text: string): { 
  document_type: 'receipt' | 'invoice' | 'statement' | 'unknown';
  document_confidence: number;
} {
  const textLower = text.toLowerCase();
  
  // Receipt indicators (highest priority)
  const receiptIndicators = [
    'thank you',
    'have a great day',
    'come again',
    'cashier',
    'cash register',
    'receipt',
    'change due',
    'tendered',
    'items sold'
  ];
  
  // Invoice indicators
  const invoiceIndicators = [
    'invoice',
    'bill to',
    'ship to',
    'due date',
    'payment terms',
    'net',
    'remit to',
    'purchase order'
  ];
  
  // Statement indicators
  const statementIndicators = [
    'statement',
    'balance',
    'previous balance',
    'new balance',
    'account number',
    'statement date',
    'billing period'
  ];
  
  // Count indicators
  let receiptScore = 0;
  let invoiceScore = 0;
  let statementScore = 0;
  
  receiptIndicators.forEach(indicator => {
    if (textLower.includes(indicator)) {
      receiptScore++;
    }
  });
  
  invoiceIndicators.forEach(indicator => {
    if (textLower.includes(indicator)) {
      invoiceScore++;
    }
  });
  
  statementIndicators.forEach(indicator => {
    if (textLower.includes(indicator)) {
      statementScore++;
    }
  });
  
  // Additional scoring based on structure
  if (text.includes('$') && text.includes('total')) receiptScore += 0.5;
  if (text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/)) receiptScore += 0.5; // Date patterns
  
  // Determine document type
  const maxScore = Math.max(receiptScore, invoiceScore, statementScore);
  
  if (maxScore === 0) {
    return { document_type: 'unknown', document_confidence: 0.1 };
  }
  
  let document_type: 'receipt' | 'invoice' | 'statement' | 'unknown';
  let confidence: number;
  
  if (receiptScore === maxScore) {
    document_type = 'receipt';
    confidence = Math.min(0.3 + (receiptScore * 0.15), 0.95);
  } else if (invoiceScore === maxScore) {
    document_type = 'invoice';
    confidence = Math.min(0.3 + (invoiceScore * 0.15), 0.95);
  } else {
    document_type = 'statement';
    confidence = Math.min(0.3 + (statementScore * 0.15), 0.95);
  }
  
  return { document_type, document_confidence: confidence };
}
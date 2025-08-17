// Document structure analysis for intelligent OCR processing

export interface DocumentSection {
  type: 'header' | 'vendor' | 'items' | 'totals' | 'payment' | 'footer' | 'unknown';
  content: string;
  lines: string[];
  startLine: number;
  endLine: number;
  confidence: number;
}

export interface DocumentStructure {
  sections: DocumentSection[];
  format: 'receipt' | 'invoice' | 'statement' | 'bill' | 'unknown';
  layout: 'columnar' | 'linear' | 'tabular' | 'mixed';
  confidence: number;
}

// Analyze document structure to understand layout and sections
export function analyzeDocumentStructure(text: string): DocumentStructure {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const sections: DocumentSection[] = [];
  
  console.log('📋 Analyzing document structure...');
  
  // Detect header section (usually first 1-3 lines with vendor info)
  const headerSection = detectHeaderSection(lines);
  if (headerSection) sections.push(headerSection);
  
  // Detect items section (contains product/service listings)
  const itemsSection = detectItemsSection(lines, headerSection?.endLine || 0);
  if (itemsSection) sections.push(itemsSection);
  
  // Detect totals section (contains financial summaries)
  const totalsSection = detectTotalsSection(lines, itemsSection?.endLine || headerSection?.endLine || 0);
  if (totalsSection) sections.push(totalsSection);
  
  // Detect payment section (payment method, card info)
  const paymentSection = detectPaymentSection(lines, totalsSection?.endLine || 0);
  if (paymentSection) sections.push(paymentSection);
  
  // Classify remaining lines as footer or unknown
  const usedLines = new Set();
  sections.forEach(section => {
    for (let i = section.startLine; i <= section.endLine; i++) {
      usedLines.add(i);
    }
  });
  
  for (let i = 0; i < lines.length; i++) {
    if (!usedLines.has(i)) {
      const isFooter = i > lines.length * 0.8 || 
                      /thank\s*you|receipt|store\s*info|return\s*policy/i.test(lines[i]);
      sections.push({
        type: isFooter ? 'footer' : 'unknown',
        content: lines[i],
        lines: [lines[i]],
        startLine: i,
        endLine: i,
        confidence: 0.6
      });
    }
  }
  
  // Determine document format and layout
  const format = classifyDocumentFormat(sections);
  const layout = classifyDocumentLayout(lines, sections);
  
  const overallConfidence = sections.reduce((sum, section) => sum + section.confidence, 0) / sections.length;
  
  console.log(`📋 Document structure: ${format} with ${layout} layout (confidence: ${overallConfidence.toFixed(3)})`);
  
  return {
    sections: sections.sort((a, b) => a.startLine - b.startLine),
    format,
    layout,
    confidence: overallConfidence
  };
}

function detectHeaderSection(lines: string[]): DocumentSection | null {
  const headerPatterns = [
    /^(THE\s+)?[A-Z][A-Z\s&'-]{2,40}$/,  // Company names
    /(STORE|LOCATION|BRANCH)\s*#?\d+/i,    // Store numbers
    /\d{3,5}\s+[A-Z][A-Z\s]{5,30}/,       // Address patterns
    /^[A-Z\s]{10,40}$/                     // Generic caps text
  ];
  
  let headerEnd = -1;
  let headerConfidence = 0;
  
  // Look for vendor/company info in first 5 lines
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    for (const pattern of headerPatterns) {
      if (pattern.test(line)) {
        headerEnd = Math.max(headerEnd, i);
        headerConfidence += 0.3;
        break;
      }
    }
    
    // Stop if we hit obvious item or total patterns
    if (/\$\d+\.\d{2}|\btotal\b|\bsubtotal\b/i.test(line)) {
      break;
    }
  }
  
  if (headerEnd >= 0) {
    return {
      type: 'header',
      content: lines.slice(0, headerEnd + 1).join('\n'),
      lines: lines.slice(0, headerEnd + 1),
      startLine: 0,
      endLine: headerEnd,
      confidence: Math.min(headerConfidence, 0.95)
    };
  }
  
  return null;
}

function detectItemsSection(lines: string[], startAfter: number): DocumentSection | null {
  let itemStart = -1;
  let itemEnd = -1;
  let itemCount = 0;
  
  // Look for line items patterns
  const itemPatterns = [
    /^[A-Z0-9][A-Z0-9\s\-'"/]{3,50}\s+\d+\s*\$?\d+\.?\d*$/i,  // Item + qty + price
    /^[A-Z0-9][A-Z0-9\s\-'"/]{5,50}\s+\$\d+\.\d{2}$/i,        // Item + price
    /^\d+\s+[A-Z0-9][A-Z0-9\s\-'"/]{3,40}\s+\$?\d+\.?\d*$/i   // Qty + item + price
  ];
  
  for (let i = startAfter; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip if this looks like a total line
    if (/\b(sub)?total|tax|amount\s+due|balance/i.test(line)) {
      if (itemStart >= 0) itemEnd = i - 1;
      break;
    }
    
    // Check if line matches item patterns
    let isItem = false;
    for (const pattern of itemPatterns) {
      if (pattern.test(line)) {
        isItem = true;
        break;
      }
    }
    
    // Also consider lines with product codes or multiple dollar amounts
    if (!isItem) {
      const dollarMatches = line.match(/\$\d+\.\d{2}/g);
      if (dollarMatches && dollarMatches.length >= 2) {
        isItem = true;
      }
    }
    
    if (isItem) {
      if (itemStart === -1) itemStart = i;
      itemEnd = i;
      itemCount++;
    } else if (itemStart >= 0 && line.length < 5) {
      // Allow short empty lines within items section
      continue;
    } else if (itemStart >= 0) {
      // Non-item line after items started - end section
      break;
    }
  }
  
  if (itemStart >= 0 && itemCount >= 1) {
    return {
      type: 'items',
      content: lines.slice(itemStart, itemEnd + 1).join('\n'),
      lines: lines.slice(itemStart, itemEnd + 1),
      startLine: itemStart,
      endLine: itemEnd,
      confidence: Math.min(0.7 + (itemCount * 0.1), 0.95)
    };
  }
  
  return null;
}

function detectTotalsSection(lines: string[], startAfter: number): DocumentSection | null {
  let totalsStart = -1;
  let totalsEnd = -1;
  let totalCount = 0;
  
  const totalPatterns = [
    /\b(sub)?total\s*:?\s*\$?\d+\.\d{2}/i,
    /\btax\s*:?\s*\$?\d+\.\d{2}/i,
    /\bamount\s+(due|paid)\s*:?\s*\$?\d+\.\d{2}/i,
    /\bbalance\s*:?\s*\$?\d+\.\d{2}/i,
    /\bpayment\s*:?\s*\$?\d+\.\d{2}/i
  ];
  
  for (let i = startAfter; i < lines.length; i++) {
    const line = lines[i];
    
    let isTotal = false;
    for (const pattern of totalPatterns) {
      if (pattern.test(line)) {
        isTotal = true;
        break;
      }
    }
    
    if (isTotal) {
      if (totalsStart === -1) totalsStart = i;
      totalsEnd = i;
      totalCount++;
    } else if (totalsStart >= 0 && /payment\s*method|thank\s*you|card\s*#/i.test(line)) {
      // End totals section when payment info starts
      break;
    }
  }
  
  if (totalsStart >= 0 && totalCount >= 1) {
    return {
      type: 'totals',
      content: lines.slice(totalsStart, totalsEnd + 1).join('\n'),
      lines: lines.slice(totalsStart, totalsEnd + 1),
      startLine: totalsStart,
      endLine: totalsEnd,
      confidence: Math.min(0.8 + (totalCount * 0.05), 0.95)
    };
  }
  
  return null;
}

function detectPaymentSection(lines: string[], startAfter: number): DocumentSection | null {
  let paymentStart = -1;
  let paymentEnd = -1;
  
  const paymentPatterns = [
    /payment\s*method|card\s*#|\*{4}|\bvisa\b|\bmastercard\b|\bamex\b/i,
    /cash|credit|debit|check|gift\s*card/i,
    /approval\s*code|auth\s*code|transaction/i
  ];
  
  for (let i = startAfter; i < lines.length; i++) {
    const line = lines[i];
    
    let isPayment = false;
    for (const pattern of paymentPatterns) {
      if (pattern.test(line)) {
        isPayment = true;
        break;
      }
    }
    
    if (isPayment) {
      if (paymentStart === -1) paymentStart = i;
      paymentEnd = i;
    }
  }
  
  if (paymentStart >= 0) {
    return {
      type: 'payment',
      content: lines.slice(paymentStart, paymentEnd + 1).join('\n'),
      lines: lines.slice(paymentStart, paymentEnd + 1),
      startLine: paymentStart,
      endLine: paymentEnd,
      confidence: 0.8
    };
  }
  
  return null;
}

function classifyDocumentFormat(sections: DocumentSection[]): DocumentStructure['format'] {
  const sectionTypes = sections.map(s => s.type);
  
  // Receipt: header + items + totals (+ optional payment)
  if (sectionTypes.includes('header') && sectionTypes.includes('items') && sectionTypes.includes('totals')) {
    return 'receipt';
  }
  
  // Invoice: similar to receipt but may have more formal structure
  if (sectionTypes.includes('totals') && (sectionTypes.includes('header') || sectionTypes.includes('items'))) {
    return 'invoice';
  }
  
  // Statement: typically has multiple line items and balance information
  if (sectionTypes.includes('items') && sections.filter(s => s.type === 'items').length > 1) {
    return 'statement';
  }
  
  return 'unknown';
}

function classifyDocumentLayout(lines: string[], sections: DocumentSection[]): DocumentStructure['layout'] {
  let tabularLines = 0;
  let columnarLines = 0;
  
  for (const line of lines) {
    // Check for tabular layout (items aligned with spaces/tabs)
    if (/\w+\s{3,}\$?\d+\.?\d*\s*$/.test(line)) {
      tabularLines++;
    }
    
    // Check for columnar layout (multiple columns of data)
    const parts = line.split(/\s{2,}/);
    if (parts.length >= 3) {
      columnarLines++;
    }
  }
  
  const totalLines = lines.length;
  
  if (tabularLines > totalLines * 0.3) return 'tabular';
  if (columnarLines > totalLines * 0.2) return 'columnar';
  
  return 'linear';
}

// Get context around a specific line for better understanding
export function getLineContext(lines: string[], lineIndex: number, contextLines: number = 2): string {
  const start = Math.max(0, lineIndex - contextLines);
  const end = Math.min(lines.length - 1, lineIndex + contextLines);
  
  return lines.slice(start, end + 1)
    .map((line, i) => `${start + i === lineIndex ? '>>>' : '   '} ${line}`)
    .join('\n');
}
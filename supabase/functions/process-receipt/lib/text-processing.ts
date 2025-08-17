// Text processing and normalization utilities

export interface ProcessingMetrics {
  startTime: number;
  ocrTime?: number;
  parsingTime?: number;
  totalTime?: number;
  memoryUsage?: number;
}

export interface DebugLog {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  step: string;
  message: string;
  data?: any;
  processingTime?: number;
}

// Sample test documents for testing mode
export const SAMPLE_DOCUMENTS = {
  home_depot: {
    text: `THE HOME DEPOT #1234
123 MAIN STREET
AUSTIN TX 78701

05/15/2024 2:45 PM

CASHIER: JOHN DOE

DESCRIPTION                  QTY   PRICE
------------------------    ----  ------
2X4 LUMBER 8FT              4     $6.47
SCREWS DECK 2.5"            1     $12.99
DRILL BIT SET               1     $19.99
SANDPAPER 220 GRIT          2     $4.25

SUBTOTAL                          $52.68
TAX                               $4.32
TOTAL                            $57.00

PAYMENT METHOD: CREDIT CARD
THANK YOU FOR SHOPPING AT THE HOME DEPOT`,
    expectedVendor: 'Home Depot',
    expectedTotal: 57.00
  },
  lowes: {
    text: `LOWE'S HOME IMPROVEMENT
STORE #2567
456 OAK AVENUE
DALLAS TX 75201

06/22/2024 11:30 AM

ITEM                         QTY   AMOUNT
----                        ----   ------
PAINT PRIMER GALLON         2     $28.98
PAINT BRUSH 3"              1     $8.99
ROLLER TRAY                 1     $5.47
DROP CLOTH 9X12             1     $12.99

MERCHANDISE SUBTOTAL             $56.43
SALES TAX                        $4.51
TOTAL                           $60.94

VISA ****1234
THANK YOU!`,
    expectedVendor: 'Lowes',
    expectedTotal: 60.94
  }
};

// Logging utility
export function createDebugLog(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', step: string, message: string, data?: any, startTime?: number): DebugLog {
  const timestamp = new Date().toISOString();
  const processingTime = startTime ? Date.now() - startTime : undefined;
  return { timestamp, level, step, message, data, processingTime };
}

export function logDebug(logs: DebugLog[], level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', step: string, message: string, data?: any, startTime?: number): void {
  const log = createDebugLog(level, step, message, data, startTime);
  logs.push(log);
  console.log(`[${log.level}] ${log.step}: ${log.message}`, log.data ? JSON.stringify(log.data, null, 2) : '');
}

export async function processWithTestMode(isTestMode: boolean, testDocument?: string, debugLogs?: DebugLog[]): Promise<{ text: string; source: string }> {
  if (isTestMode && testDocument && SAMPLE_DOCUMENTS[testDocument as keyof typeof SAMPLE_DOCUMENTS]) {
    const sample = SAMPLE_DOCUMENTS[testDocument as keyof typeof SAMPLE_DOCUMENTS];
    logDebug(debugLogs || [], 'INFO', 'TEST_MODE', `Using sample document: ${testDocument}`, { expectedVendor: sample.expectedVendor, expectedTotal: sample.expectedTotal });
    return { text: sample.text, source: 'test_sample' };
  }
  return { text: '', source: 'vision_api' };
}
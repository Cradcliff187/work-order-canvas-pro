import { supabase } from "@/integrations/supabase/client";
import { differenceInHours, isValid, parseISO } from "date-fns";

export interface DuplicateMatch {
  id: string;
  vendor_name: string;
  amount: number;
  receipt_date: string;
  similarity: number;
  timeDifference: number; // hours
}

export interface DuplicationCheckResult {
  isDuplicate: boolean;
  matches: DuplicateMatch[];
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Calculate similarity between two strings using fuzzy matching
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  
  // Levenshtein distance normalized
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Calculate amount similarity with tolerance for rounding differences
 */
function calculateAmountSimilarity(amount1: number, amount2: number): number {
  const diff = Math.abs(amount1 - amount2);
  const maxAmount = Math.max(amount1, amount2);
  
  // Exact match
  if (diff === 0) return 1.0;
  
  // Within $0.05 for amounts under $10
  if (maxAmount < 10 && diff <= 0.05) return 0.95;
  
  // Within 1% for larger amounts
  if (diff / maxAmount <= 0.01) return 0.9;
  
  // Within 5% gets lower score
  if (diff / maxAmount <= 0.05) return 0.7;
  
  // Significant difference
  return Math.max(0, 1 - (diff / maxAmount));
}

/**
 * Calculate time proximity score
 */
function calculateTimeProximity(date1: string, date2: string): number {
  const d1 = parseISO(date1);
  const d2 = parseISO(date2);
  
  if (!isValid(d1) || !isValid(d2)) return 0;
  
  const hoursDiff = Math.abs(differenceInHours(d1, d2));
  
  // Same day = high score
  if (hoursDiff < 24) return 1.0;
  
  // Within 2 days = medium score  
  if (hoursDiff < 48) return 0.8;
  
  // Within a week = low score
  if (hoursDiff < 168) return 0.3;
  
  return 0;
}

/**
 * Calculate overall similarity score
 */
function calculateOverallSimilarity(
  vendorSim: number,
  amountSim: number,
  timeSim: number
): number {
  // Weighted average: vendor (40%), amount (40%), time (20%)
  return (vendorSim * 0.4) + (amountSim * 0.4) + (timeSim * 0.2);
}

/**
 * Check for duplicate receipts in the database
 */
export async function checkForDuplicates(
  vendorName: string,
  amount: number,
  receiptDate: string,
  userId?: string
): Promise<DuplicationCheckResult> {
  try {
    // Get user ID from auth if not provided
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = userId || user?.id;
    
    if (!currentUserId) {
      return { isDuplicate: false, matches: [], confidence: 'low' };
    }

    // Query receipts from the last 30 days to avoid too many comparisons
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('receipts')
      .select('id, vendor_name, amount, receipt_date')
      .eq('employee_user_id', currentUserId)
      .gte('receipt_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('receipt_date', { ascending: false });

    if (error || !data) {
      console.error('Error fetching receipts for duplicate check:', error);
      return { isDuplicate: false, matches: [], confidence: 'low' };
    }

    const matches: DuplicateMatch[] = [];

    for (const receipt of data) {
      const vendorSim = calculateStringSimilarity(vendorName, receipt.vendor_name);
      const amountSim = calculateAmountSimilarity(amount, receipt.amount);
      const timeSim = calculateTimeProximity(receiptDate, receipt.receipt_date);
      
      const overallSim = calculateOverallSimilarity(vendorSim, amountSim, timeSim);
      
      // Consider it a potential duplicate if similarity > 0.7
      if (overallSim > 0.7) {
        const d1 = parseISO(receiptDate);
        const d2 = parseISO(receipt.receipt_date);
        const timeDiff = isValid(d1) && isValid(d2) 
          ? Math.abs(differenceInHours(d1, d2))
          : 0;

        matches.push({
          id: receipt.id,
          vendor_name: receipt.vendor_name,
          amount: receipt.amount,
          receipt_date: receipt.receipt_date,
          similarity: overallSim,
          timeDifference: timeDiff
        });
      }
    }

    // Sort by similarity score descending
    matches.sort((a, b) => b.similarity - a.similarity);

    // Determine confidence level
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (matches.length > 0) {
      const topMatch = matches[0];
      if (topMatch.similarity > 0.9) confidence = 'high';
      else if (topMatch.similarity > 0.8) confidence = 'medium';
    }

    return {
      isDuplicate: matches.length > 0,
      matches: matches.slice(0, 3), // Return top 3 matches
      confidence
    };

  } catch (error) {
    console.error('Error in duplicate check:', error);
    return { isDuplicate: false, matches: [], confidence: 'low' };
  }
}

/**
 * Format duplicate match for display
 */
export function formatDuplicateMatch(match: DuplicateMatch): string {
  const timeStr = match.timeDifference < 24 
    ? `${Math.round(match.timeDifference)}h ago`
    : `${Math.round(match.timeDifference / 24)}d ago`;
    
  return `${match.vendor_name} - $${match.amount.toFixed(2)} (${timeStr})`;
}
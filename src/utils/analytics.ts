import { formatDistanceToNow } from 'date-fns';

// Analytics event types for receipt flow
export type AnalyticsEventType = 
  | 'receipt_flow_started'
  | 'image_compressed' 
  | 'ocr_processing_started'
  | 'ocr_processing_completed'
  | 'ocr_processing_failed'
  | 'form_field_edited'
  | 'draft_saved'
  | 'draft_loaded'
  | 'receipt_submitted'
  | 'tour_started'
  | 'tour_completed'
  | 'tour_skipped'
  | 'error_encountered'
  | 'performance_metric';

interface AnalyticsEventData {
  eventType: AnalyticsEventType;
  timestamp: number;
  sessionId: string;
  userAgent: string;
  metadata?: Record<string, any>;
}

interface PerformanceMetrics {
  compressionTime?: number;
  compressionRatio?: number;
  ocrProcessingTime?: number;
  formCompletionTime?: number;
  errorRecoveryTime?: number;
  originalFileSize?: number;
  compressedFileSize?: number;
  retryCount?: number;
}

class AnalyticsService {
  private sessionId: string;
  private startTime: number;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
  }

  private generateSessionId(): string {
    return `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      devicePixelRatio: window.devicePixelRatio,
      language: navigator.language,
      online: navigator.onLine,
      cookieEnabled: navigator.cookieEnabled,
      platform: navigator.platform
    };
  }

  track(eventType: AnalyticsEventType, metadata: Record<string, any> = {}) {
    const eventData: AnalyticsEventData = {
      eventType,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      metadata: {
        ...metadata,
        sessionDuration: Date.now() - this.startTime,
        deviceInfo: this.getDeviceInfo()
      }
    };

    // Console logging for PWA context - can be replaced with service integration later
    console.log(`[ANALYTICS] ${eventType}`, {
      event: eventData,
      humanReadable: {
        time: new Date(eventData.timestamp).toISOString(),
        sessionDuration: formatDistanceToNow(this.startTime),
        ...metadata
      }
    });

    // Store in localStorage for potential batch upload later
    this.storeEvent(eventData);
  }

  trackPerformance(metrics: PerformanceMetrics) {
    this.track('performance_metric', {
      type: 'performance',
      metrics,
      performanceScore: this.calculatePerformanceScore(metrics)
    });
  }

  trackError(error: Error | string, context: Record<string, any> = {}) {
    this.track('error_encountered', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : { message: error },
      context,
      errorType: typeof error === 'string' ? 'manual' : 'exception'
    });
  }

  trackImageCompression(originalSize: number, compressedSize: number, processingTime: number) {
    const compressionRatio = originalSize > 0 ? (originalSize - compressedSize) / originalSize : 0;
    
    this.track('image_compressed', {
      originalSize,
      compressedSize,
      compressionRatio: Math.round(compressionRatio * 100),
      processingTime,
      sizeSaved: originalSize - compressedSize,
      compressionEfficiency: processingTime > 0 ? (originalSize - compressedSize) / processingTime : 0
    });
  }

  trackOCRPerformance(stage: 'started' | 'completed' | 'failed', metadata: Record<string, any> = {}) {
    const eventMap = {
      started: 'ocr_processing_started',
      completed: 'ocr_processing_completed', 
      failed: 'ocr_processing_failed'
    } as const;

    this.track(eventMap[stage], {
      stage,
      ...metadata
    });
  }

  trackFormInteraction(fieldName: string, action: 'edit' | 'validate' | 'error', metadata: Record<string, any> = {}) {
    this.track('form_field_edited', {
      fieldName,
      action,
      ...metadata
    });
  }

  trackTourProgress(action: 'started' | 'completed' | 'skipped', step?: number, totalSteps?: number) {
    const eventMap = {
      started: 'tour_started',
      completed: 'tour_completed',
      skipped: 'tour_skipped'
    } as const;

    this.track(eventMap[action], {
      action,
      step,
      totalSteps,
      completion: step && totalSteps ? Math.round((step / totalSteps) * 100) : undefined
    });
  }

  private calculatePerformanceScore(metrics: PerformanceMetrics): number {
    let score = 100;
    
    // Penalize slow compression (>2s)
    if (metrics.compressionTime && metrics.compressionTime > 2000) {
      score -= Math.min(20, (metrics.compressionTime - 2000) / 100);
    }
    
    // Penalize slow OCR (>5s)
    if (metrics.ocrProcessingTime && metrics.ocrProcessingTime > 5000) {
      score -= Math.min(30, (metrics.ocrProcessingTime - 5000) / 200);
    }
    
    // Penalize retries
    if (metrics.retryCount && metrics.retryCount > 0) {
      score -= metrics.retryCount * 10;
    }
    
    return Math.max(0, Math.round(score));
  }

  private storeEvent(eventData: AnalyticsEventData) {
    try {
      const stored = localStorage.getItem('receipt_analytics') || '[]';
      const events = JSON.parse(stored);
      events.push(eventData);
      
      // Keep only last 100 events to prevent storage overflow
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }
      
      localStorage.setItem('receipt_analytics', JSON.stringify(events));
    } catch (error) {
      console.warn('[ANALYTICS] Failed to store event:', error);
    }
  }

  getStoredEvents(): AnalyticsEventData[] {
    try {
      const stored = localStorage.getItem('receipt_analytics') || '[]';
      return JSON.parse(stored);
    } catch (error) {
      console.warn('[ANALYTICS] Failed to retrieve stored events:', error);
      return [];
    }
  }

  clearStoredEvents() {
    try {
      localStorage.removeItem('receipt_analytics');
    } catch (error) {
      console.warn('[ANALYTICS] Failed to clear stored events:', error);
    }
  }

  generateSummaryReport(): Record<string, any> {
    const events = this.getStoredEvents();
    const summary = {
      totalEvents: events.length,
      sessionId: this.sessionId,
      sessionDuration: Date.now() - this.startTime,
      eventBreakdown: {} as Record<string, number>,
      averagePerformance: {} as Record<string, number>,
      errorRate: 0,
      completionRate: 0
    };

    events.forEach(event => {
      summary.eventBreakdown[event.eventType] = (summary.eventBreakdown[event.eventType] || 0) + 1;
    });

    const performanceEvents = events.filter(e => e.eventType === 'performance_metric');
    if (performanceEvents.length > 0) {
      summary.averagePerformance = performanceEvents.reduce((acc, event) => {
        const metrics = event.metadata?.metrics || {};
        Object.keys(metrics).forEach(key => {
          acc[key] = (acc[key] || 0) + (metrics[key] || 0);
        });
        return acc;
      }, {} as Record<string, number>);

      Object.keys(summary.averagePerformance).forEach(key => {
        summary.averagePerformance[key] = Math.round(summary.averagePerformance[key] / performanceEvents.length);
      });
    }

    const errorCount = summary.eventBreakdown['error_encountered'] || 0;
    const submissionCount = summary.eventBreakdown['receipt_submitted'] || 0;
    const startCount = summary.eventBreakdown['receipt_flow_started'] || 0;

    summary.errorRate = events.length > 0 ? Math.round((errorCount / events.length) * 100) : 0;
    summary.completionRate = startCount > 0 ? Math.round((submissionCount / startCount) * 100) : 0;

    return summary;
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();

// Helper hooks for React components
export const useAnalytics = () => {
  return {
    track: analytics.track.bind(analytics),
    trackPerformance: analytics.trackPerformance.bind(analytics),
    trackError: analytics.trackError.bind(analytics),
    trackImageCompression: analytics.trackImageCompression.bind(analytics),
    trackOCRPerformance: analytics.trackOCRPerformance.bind(analytics),
    trackFormInteraction: analytics.trackFormInteraction.bind(analytics),
    trackTourProgress: analytics.trackTourProgress.bind(analytics),
    generateSummaryReport: analytics.generateSummaryReport.bind(analytics)
  };
};

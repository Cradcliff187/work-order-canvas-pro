// Performance monitoring and metrics for OCR processing

export interface PerformanceMetrics {
  processingTime: number;
  visionApiTime?: number;
  spatialExtractionTime?: number;
  validationTime?: number;
  imagePreprocessingTime?: number;
  memoryUsage?: number;
  confidenceDistribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  extractionAccuracy?: {
    vendorAccuracy: number;
    totalAccuracy: number;
    dateAccuracy: number;
    lineItemAccuracy: number;
  };
  errorCounts: {
    visionApiErrors: number;
    spatialExtractionErrors: number;
    validationErrors: number;
    preprocessingErrors: number;
  };
}

export interface ProcessingSession {
  sessionId: string;
  startTime: number;
  endTime?: number;
  metrics: PerformanceMetrics;
  imageQuality: number;
  documentType: string;
  vendor?: string;
  processingSteps: ProcessingStep[];
}

export interface ProcessingStep {
  name: string;
  startTime: number;
  endTime?: number;
  success: boolean;
  errorMessage?: string;
  confidenceScore?: number;
  memoryUsed?: number;
}

// Performance monitoring class
export class PerformanceMonitor {
  private session: ProcessingSession;
  private currentStep?: ProcessingStep;

  constructor(imageQuality: number = 0.5, documentType: string = 'receipt') {
    this.session = {
      sessionId: crypto.randomUUID(),
      startTime: Date.now(),
      metrics: {
        processingTime: 0,
        confidenceDistribution: {
          excellent: 0,
          good: 0,
          fair: 0,
          poor: 0
        },
        errorCounts: {
          visionApiErrors: 0,
          spatialExtractionErrors: 0,
          validationErrors: 0,
          preprocessingErrors: 0
        }
      },
      imageQuality,
      documentType,
      processingSteps: []
    };
  }

  startStep(stepName: string): void {
    this.endCurrentStep();
    
    this.currentStep = {
      name: stepName,
      startTime: Date.now(),
      success: true
    };
  }

  endStep(success: boolean = true, errorMessage?: string, confidenceScore?: number): void {
    if (this.currentStep) {
      this.currentStep.endTime = Date.now();
      this.currentStep.success = success;
      this.currentStep.errorMessage = errorMessage;
      this.currentStep.confidenceScore = confidenceScore;
      this.currentStep.memoryUsed = this.getMemoryUsage();
      
      this.session.processingSteps.push(this.currentStep);
      
      // Update error counts
      if (!success) {
        if (this.currentStep.name.includes('vision')) {
          this.session.metrics.errorCounts.visionApiErrors++;
        } else if (this.currentStep.name.includes('spatial')) {
          this.session.metrics.errorCounts.spatialExtractionErrors++;
        } else if (this.currentStep.name.includes('validation')) {
          this.session.metrics.errorCounts.validationErrors++;
        } else if (this.currentStep.name.includes('preprocessing')) {
          this.session.metrics.errorCounts.preprocessingErrors++;
        }
      }
      
      this.currentStep = undefined;
    }
  }

  private endCurrentStep(): void {
    if (this.currentStep && !this.currentStep.endTime) {
      this.endStep(true);
    }
  }

  recordConfidence(quality: 'excellent' | 'good' | 'fair' | 'poor'): void {
    this.session.metrics.confidenceDistribution[quality]++;
  }

  recordVisionApiTime(time: number): void {
    this.session.metrics.visionApiTime = time;
  }

  recordSpatialExtractionTime(time: number): void {
    this.session.metrics.spatialExtractionTime = time;
  }

  recordValidationTime(time: number): void {
    this.session.metrics.validationTime = time;
  }

  recordImagePreprocessingTime(time: number): void {
    this.session.metrics.imagePreprocessingTime = time;
  }

  setVendor(vendor: string): void {
    this.session.vendor = vendor;
  }

  finishSession(overallQuality: 'excellent' | 'good' | 'fair' | 'poor'): ProcessingSession {
    this.endCurrentStep();
    
    this.session.endTime = Date.now();
    this.session.metrics.processingTime = this.session.endTime - this.session.startTime;
    this.session.metrics.memoryUsage = this.getMemoryUsage();
    
    this.recordConfidence(overallQuality);
    
    return this.session;
  }

  private getMemoryUsage(): number {
    // In Deno, we can use performance.memory if available
    try {
      return (performance as any).memory?.usedJSHeapSize || 0;
    } catch {
      return 0;
    }
  }

  getMetrics(): PerformanceMetrics {
    return this.session.metrics;
  }

  logPerformanceSummary(): void {
    const session = this.session;
    const totalTime = session.endTime ? session.endTime - session.startTime : Date.now() - session.startTime;
    
    console.log('📊 Performance Summary:');
    console.log(`   Session ID: ${session.sessionId}`);
    console.log(`   Total Time: ${totalTime}ms`);
    console.log(`   Image Quality: ${session.imageQuality.toFixed(3)}`);
    console.log(`   Document Type: ${session.documentType}`);
    
    if (session.vendor) {
      console.log(`   Vendor: ${session.vendor}`);
    }
    
    console.log(`   Processing Steps: ${session.processingSteps.length}`);
    
    // Log step timings
    for (const step of session.processingSteps) {
      const stepTime = step.endTime ? step.endTime - step.startTime : 0;
      const status = step.success ? '✅' : '❌';
      console.log(`     ${status} ${step.name}: ${stepTime}ms${step.confidenceScore ? ` (conf: ${step.confidenceScore.toFixed(3)})` : ''}`);
    }
    
    // Log error summary
    const errors = session.metrics.errorCounts;
    const totalErrors = errors.visionApiErrors + errors.spatialExtractionErrors + 
                       errors.validationErrors + errors.preprocessingErrors;
    
    if (totalErrors > 0) {
      console.log(`   Errors: ${totalErrors} total`);
      if (errors.visionApiErrors > 0) console.log(`     Vision API: ${errors.visionApiErrors}`);
      if (errors.spatialExtractionErrors > 0) console.log(`     Spatial: ${errors.spatialExtractionErrors}`);
      if (errors.validationErrors > 0) console.log(`     Validation: ${errors.validationErrors}`);
      if (errors.preprocessingErrors > 0) console.log(`     Preprocessing: ${errors.preprocessingErrors}`);
    }
  }
}

// Global performance tracking
export const globalPerformanceStats = {
  totalSessions: 0,
  successfulSessions: 0,
  averageProcessingTime: 0,
  confidenceDistribution: {
    excellent: 0,
    good: 0,
    fair: 0,
    poor: 0
  },
  errorRates: {
    visionApi: 0,
    spatialExtraction: 0,
    validation: 0,
    preprocessing: 0
  }
};

export function updateGlobalStats(session: ProcessingSession): void {
  globalPerformanceStats.totalSessions++;
  
  if (session.endTime) {
    globalPerformanceStats.successfulSessions++;
    
    // Update rolling average processing time
    const newTime = session.endTime - session.startTime;
    globalPerformanceStats.averageProcessingTime = 
      (globalPerformanceStats.averageProcessingTime * (globalPerformanceStats.successfulSessions - 1) + newTime) / 
      globalPerformanceStats.successfulSessions;
  }
  
  // Update confidence distribution
  const conf = session.metrics.confidenceDistribution;
  globalPerformanceStats.confidenceDistribution.excellent += conf.excellent;
  globalPerformanceStats.confidenceDistribution.good += conf.good;
  globalPerformanceStats.confidenceDistribution.fair += conf.fair;
  globalPerformanceStats.confidenceDistribution.poor += conf.poor;
  
  // Update error rates
  const errors = session.metrics.errorCounts;
  globalPerformanceStats.errorRates.visionApi += errors.visionApiErrors;
  globalPerformanceStats.errorRates.spatialExtraction += errors.spatialExtractionErrors;
  globalPerformanceStats.errorRates.validation += errors.validationErrors;
  globalPerformanceStats.errorRates.preprocessing += errors.preprocessingErrors;
}

export function getGlobalPerformanceReport(): any {
  const total = globalPerformanceStats.totalSessions;
  if (total === 0) return { message: 'No sessions recorded yet' };
  
  const successful = globalPerformanceStats.successfulSessions;
  const successRate = (successful / total) * 100;
  
  return {
    totalSessions: total,
    successfulSessions: successful,
    successRate: `${successRate.toFixed(1)}%`,
    averageProcessingTime: `${globalPerformanceStats.averageProcessingTime.toFixed(0)}ms`,
    confidenceBreakdown: {
      excellent: globalPerformanceStats.confidenceDistribution.excellent,
      good: globalPerformanceStats.confidenceDistribution.good,
      fair: globalPerformanceStats.confidenceDistribution.fair,
      poor: globalPerformanceStats.confidenceDistribution.poor
    },
    errorRates: globalPerformanceStats.errorRates
  };
}
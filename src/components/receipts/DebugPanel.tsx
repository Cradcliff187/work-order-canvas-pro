import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatConfidencePercent, ConfidenceValues, logConfidenceDebug } from "@/utils/confidence-display";

interface DebugPanelProps {
  ocrResult?: any;
  formData?: any;
  confidenceValues?: ConfidenceValues;
  rawOCRText?: string | null;
  debugOCRData?: any;
}

export function DebugPanel({ 
  ocrResult, 
  formData, 
  confidenceValues, 
  rawOCRText, 
  debugOCRData 
}: DebugPanelProps) {
  const [debugMode, setDebugMode] = useState(false);
  const [showRawText, setShowRawText] = useState(false);

  // Only render in development mode
  if (import.meta.env.MODE !== 'development') {
    return null;
  }

  // Debug logging for confidence data flow
  // Note: formData is excluded from dependencies to prevent infinite loops
  // since form.getValues() creates new object references on every render
  useEffect(() => {
    if (debugMode && confidenceValues) {
      console.log('🐛 Essential Details Debug:', {
        confidenceValues,
        ocrResult
      });
      logConfidenceDebug('DebugPanel', confidenceValues);
    }
  }, [debugMode, confidenceValues, ocrResult]);

  // Separate effect for form data logging with change detection
  useEffect(() => {
    if (debugMode && formData) {
      const formDataString = JSON.stringify(formData);
      // Only log if form data actually changed
      const prevFormDataString = sessionStorage.getItem('lastFormDataDebug');
      if (formDataString !== prevFormDataString) {
        console.log('🐛 Form Data Debug:', formData);
        sessionStorage.setItem('lastFormDataDebug', formDataString);
      }
    }
  }, [debugMode, JSON.stringify(formData)]);

  if (!debugMode) {
    return (
      <Card className="mb-4 border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Debug OCR Mode</span>
            </div>
            <Switch
              id="debug-mode"
              checked={debugMode}
              onCheckedChange={(checked) => {
                setDebugMode(checked);
              }}
            />
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Debug Mode Toggle */}
      <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Debug OCR Mode</span>
            </div>
            <Switch
              id="debug-mode"
              checked={debugMode}
              onCheckedChange={(checked) => {
                setDebugMode(checked);
              }}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Raw OCR Text Display */}
      {rawOCRText && (
        <Card className="border-orange-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                Raw OCR Text (Debug)
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRawText(!showRawText)}
                >
                  {showRawText ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {showRawText ? 'Hide' : 'Show'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(rawOCRText);
                    toast({
                      title: "Copied to clipboard",
                      description: "Raw OCR text has been copied",
                    });
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          {showRawText && (
            <CardContent>
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded border">
                <pre className="text-xs font-mono whitespace-pre-wrap">{rawOCRText}</pre>
              </div>
              {debugOCRData && (
                <div className="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between">
                    <span>Characters:</span>
                    <span>{debugOCRData.text_length} characters</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Method:</span>
                    <span>{debugOCRData.has_doc_text ? 'DOCUMENT_TEXT' : 'TEXT_DETECTION'}</span>
                  </div>
                  {debugOCRData.parsed_result && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="font-semibold mb-1">Parsed Results:</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-gray-500">Vendor:</span>
                          <span className="font-mono">{debugOCRData.parsed_result.vendor || 'NOT FOUND'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Total:</span>
                          <span className="font-mono">${debugOCRData.parsed_result.total || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Date:</span>
                          <span className="font-mono">{debugOCRData.parsed_result.date || 'NOT FOUND'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Enhanced Confidence Display with Debug Info */}
      {ocrResult && confidenceValues && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              🔍 Confidence Debug
              <Badge variant="outline" className="text-xs">
                OCR Analysis
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <div className="text-gray-600 dark:text-gray-400">Vendor Confidence</div>
                <div className="font-mono text-lg">
                  {formatConfidencePercent(confidenceValues.vendor_name)}
                  <Badge 
                    variant={confidenceValues.vendor_name && confidenceValues.vendor_name > 0.8 ? "default" : "destructive"}
                    className="ml-2 text-xs"
                  >
                    {confidenceValues.vendor_name && confidenceValues.vendor_name > 0.8 ? 'High' : 'Low'}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-gray-600 dark:text-gray-400">Amount Confidence</div>
                <div className="font-mono text-lg">
                  {formatConfidencePercent(confidenceValues.amount)}
                  <Badge 
                    variant={confidenceValues.amount && confidenceValues.amount > 0.8 ? "default" : "destructive"}
                    className="ml-2 text-xs"
                  >
                    {confidenceValues.amount && confidenceValues.amount > 0.8 ? 'High' : 'Low'}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-gray-600 dark:text-gray-400">Date Confidence</div>
                <div className="font-mono text-lg">
                  {formatConfidencePercent(confidenceValues.receipt_date)}
                  <Badge 
                    variant={confidenceValues.receipt_date && confidenceValues.receipt_date > 0.8 ? "default" : "destructive"}
                    className="ml-2 text-xs"
                  >
                    {confidenceValues.receipt_date && confidenceValues.receipt_date > 0.8 ? 'High' : 'Low'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">Raw Confidence Data:</div>
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded border">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {JSON.stringify(confidenceValues, null, 2)}
                </pre>
              </div>
            </div>

            {formData && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">Current Form Data:</div>
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded border">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {JSON.stringify(formData, null, 2)}
                    </pre>
                  </div>
                </div>
              </>
            )}

            {ocrResult && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">OCR Result Data:</div>
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded border">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {JSON.stringify(ocrResult, null, 2)}
                    </pre>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
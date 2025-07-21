
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Save, Upload, Trash2, FileText, Clock, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { ReportDraft } from '@/types/offline';

interface DraftIndicatorProps {
  workOrderId: string;
  onLoadDraft?: (draft: ReportDraft) => void;
  currentDraftId?: string | null;
  className?: string;
}

export function DraftIndicator({ 
  workOrderId, 
  onLoadDraft, 
  currentDraftId,
  className = '' 
}: DraftIndicatorProps) {
  const { getDrafts, deleteDraft, processPendingSyncs, storageStats, pendingCount } = useOfflineStorage();
  const { isOnline } = useNetworkStatus();
  const [drafts, setDrafts] = useState<ReportDraft[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadDrafts();
  }, [workOrderId]);

  const loadDrafts = async () => {
    try {
      const workOrderDrafts = await getDrafts(workOrderId);
      setDrafts(workOrderDrafts);
    } catch (error) {
      console.error('Failed to load drafts:', error);
    }
  };

  const handleLoadDraft = (draft: ReportDraft) => {
    onLoadDraft?.(draft);
  };

  const handleDeleteDraft = async (draftId: string) => {
    try {
      await deleteDraft(draftId);
      await loadDrafts();
    } catch (error) {
      console.error('Failed to delete draft:', error);
    }
  };

  const handleSync = async () => {
    setIsLoading(true);
    try {
      await processPendingSyncs();
      await loadDrafts();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const manualDrafts = drafts.filter(d => d.metadata.isManual);
  const autoDrafts = drafts.filter(d => !d.metadata.isManual);
  const totalDrafts = drafts.length;

  if (totalDrafts === 0 && pendingCount === 0) {
    return null;
  }

  const getStorageWarning = () => {
    if (!storageStats) return null;
    
    const usagePercent = (storageStats.usedSpace / storageStats.totalSpace) * 100;
    
    if (usagePercent > 90) {
      return (
        <Alert className="border-destructive bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Storage {usagePercent.toFixed(0)}% full. Consider deleting old drafts.
          </AlertDescription>
        </Alert>
      );
    }
    
    if (usagePercent > 75) {
      return (
        <Alert className="border-yellow-500 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Storage {usagePercent.toFixed(0)}% full.
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Draft Status Indicator */}
      {totalDrafts > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="min-h-[44px] px-2">
              <FileText className="h-3 w-3 mr-1" />
              <Badge variant="secondary" className="h-5 px-1 text-xs">
                {totalDrafts}
              </Badge>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-4 border-b">
              <h4 className="font-medium">Saved Drafts</h4>
              <p className="text-sm text-muted-foreground">
                {manualDrafts.length} manual, {autoDrafts.length} auto-saved
              </p>
            </div>
            
            {getStorageWarning()}
            
            <div className="max-h-60 overflow-y-auto">
              {manualDrafts.length > 0 && (
                <div className="p-3 border-b">
                  <h5 className="text-sm font-medium text-muted-foreground mb-2">Manual Saves</h5>
                  {manualDrafts.map((draft) => (
                    <div key={draft.id} className="flex items-center justify-between py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {draft.workPerformed.slice(0, 30)}...
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {formatDistanceToNow(draft.updatedAt)} ago
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLoadDraft(draft)}
                          className="min-h-[44px] px-2"
                        >
                          Load
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDraft(draft.id)}
                          className="min-h-[44px] w-10 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {autoDrafts.length > 0 && (
                <div className="p-3">
                  <h5 className="text-sm font-medium text-muted-foreground mb-2">Auto-Saved</h5>
                  {autoDrafts.slice(0, 3).map((draft) => (
                    <div key={draft.id} className="flex items-center justify-between py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">
                          {draft.workPerformed.slice(0, 30)}...
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {formatDistanceToNow(draft.updatedAt)} ago
                          {draft.id === currentDraftId && (
                            <Badge variant="outline" className="ml-2 h-4 px-1 text-xs">Current</Badge>
                          )}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLoadDraft(draft)}
                        className="min-h-[44px] px-2"
                      >
                        Load
                      </Button>
                    </div>
                  ))}
                  {autoDrafts.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      +{autoDrafts.length - 3} more auto-saves
                    </p>
                  )}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Sync Indicator */}
      {pendingCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={!isOnline || isLoading}
          className="min-h-[44px] px-2"
        >
          <Upload className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          <Badge variant="secondary" className="h-5 px-1 text-xs">
            {pendingCount}
          </Badge>
        </Button>
      )}

      {/* Storage Stats */}
      {storageStats && (
        <div className="text-xs text-muted-foreground hidden sm:block">
          {Math.round((storageStats.usedSpace / storageStats.totalSpace) * 100)}% used
        </div>
      )}
    </div>
  );
}

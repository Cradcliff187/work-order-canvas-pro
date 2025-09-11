import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Bookmark, 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Star,
  Clock,
  Flag,
  Calendar
} from 'lucide-react';
import { useFilterPresets } from '@/hooks/useFilterPresets';
import { TimeManagementFilters } from '@/hooks/useTimeManagement';
import { cn } from '@/lib/utils';

interface FilterPresetsManagerProps {
  currentFilters: TimeManagementFilters;
  onLoadPreset: (filters: TimeManagementFilters) => void;
}

export function FilterPresetsManager({ currentFilters, onLoadPreset }: FilterPresetsManagerProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deletePresetId, setDeletePresetId] = useState<string | null>(null);
  const [editingPreset, setEditingPreset] = useState<any>(null);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  
  const {
    presets,
    commonPresets,
    isLoading,
    savePreset,
    updatePreset,
    deletePreset,
    isSaving,
    isUpdating
  } = useFilterPresets();

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    
    savePreset({
      name: presetName,
      description: presetDescription,
      filters: currentFilters
    });
    
    setPresetName('');
    setPresetDescription('');
    setIsCreateOpen(false);
  };

  const handleUpdatePreset = () => {
    if (!presetName.trim() || !editingPreset) return;
    
    updatePreset({
      id: editingPreset.id,
      name: presetName,
      description: presetDescription,
      filters: currentFilters
    });
    
    setPresetName('');
    setPresetDescription('');
    setEditingPreset(null);
    setIsEditOpen(false);
  };

  const handleEditClick = (preset: any) => {
    setEditingPreset(preset);
    setPresetName(preset.name);
    setPresetDescription(preset.description || '');
    setIsEditOpen(true);
  };

  const handleDeleteClick = (presetId: string) => {
    setDeletePresetId(presetId);
  };

  const confirmDelete = () => {
    if (deletePresetId) {
      deletePreset(deletePresetId);
      setDeletePresetId(null);
    }
  };

  const getPresetIcon = (presetName: string) => {
    if (presetName.toLowerCase().includes('flagged')) return <Flag className="h-4 w-4" />;
    if (presetName.toLowerCase().includes('overtime')) return <Clock className="h-4 w-4" />;
    if (presetName.toLowerCase().includes('today')) return <Calendar className="h-4 w-4" />;
    if (presetName.toLowerCase().includes('week')) return <Calendar className="h-4 w-4" />;
    return <Star className="h-4 w-4" />;
  };

  const getActiveFiltersCount = (filters: TimeManagementFilters) => {
    return Object.values(filters).filter(value => 
      Array.isArray(value) ? value.length > 0 : value !== '' && value !== 1 && value !== 50
    ).length;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="h-4 w-4" />
          <span className="font-medium">Filter Presets</span>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Save Current
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Filter Preset</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="preset-name">Preset Name</Label>
                <Input
                  id="preset-name"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="e.g., My Weekly Review"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preset-description">Description (Optional)</Label>
                <Textarea
                  id="preset-description"
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  placeholder="Brief description of this filter preset..."
                  className="resize-none"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                Active filters: {getActiveFiltersCount(currentFilters)}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSavePreset} disabled={!presetName.trim() || isSaving}>
                  {isSaving ? 'Saving...' : 'Save Preset'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Common Presets */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Quick Filters</h4>
        <div className="grid grid-cols-2 gap-2">
          {commonPresets.map((preset, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => onLoadPreset(preset.filters)}
              className="justify-start text-left h-auto py-2"
            >
              <div className="flex items-start gap-2 w-full">
                {getPresetIcon(preset.name)}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-xs truncate">
                    {preset.name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {preset.description}
                  </div>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* User Presets */}
      {presets.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Saved Presets</h4>
          <div className="space-y-1">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center gap-2 p-2 rounded-md border bg-card"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onLoadPreset(preset.filters)}
                  className="flex-1 justify-start text-left h-auto p-2"
                >
                  <div className="flex items-start gap-2 w-full">
                    <Bookmark className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {preset.name}
                      </div>
                      {preset.description && (
                        <div className="text-xs text-muted-foreground truncate">
                          {preset.description}
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {getActiveFiltersCount(preset.filters)} filters
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditClick(preset)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleDeleteClick(preset.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Filter Preset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-preset-name">Preset Name</Label>
              <Input
                id="edit-preset-name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-preset-description">Description (Optional)</Label>
              <Textarea
                id="edit-preset-description"
                value={presetDescription}
                onChange={(e) => setPresetDescription(e.target.value)}
                className="resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdatePreset} disabled={!presetName.trim() || isUpdating}>
                {isUpdating ? 'Updating...' : 'Update Preset'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePresetId} onOpenChange={() => setDeletePresetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Filter Preset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this filter preset? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
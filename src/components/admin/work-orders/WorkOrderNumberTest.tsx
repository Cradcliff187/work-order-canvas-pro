import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useWorkOrderNumberGeneration } from '@/hooks/useWorkOrderNumberGeneration';
import { useOrganizations } from '@/hooks/useOrganizations';
import { AlertCircle, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function WorkOrderNumberTest() {
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [locationInput, setLocationInput] = useState<string>('');
  
  const { data: orgsData } = useOrganizations();
  const organizations = orgsData?.organizations || [];
  
  const {
    workOrderNumber,
    isLoading,
    error,
    isFallback,
    warning,
    requiresInitials,
    organizationName,
    locationNumber,
  } = useWorkOrderNumberGeneration({
    organizationId: selectedOrgId || undefined,
    locationNumber: locationInput || undefined,
  });

  const selectedOrg = organizations.find(org => org.id === selectedOrgId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Work Order Number Testing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="organization">Organization</Label>
              <Select onValueChange={setSelectedOrgId} value={selectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {org.initials || 'NO-INIT'}
                        </Badge>
                        <span>{org.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location Number (optional)</Label>
              <Input
                id="location"
                placeholder="e.g., 001, 504, etc."
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
              />
            </div>
          </div>

          {selectedOrg && (
            <div className="p-4 border rounded-lg bg-muted/20">
              <h4 className="font-medium text-sm mb-2">Organization Details:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span> {selectedOrg.organization_type}
                </div>
                <div>
                  <span className="text-muted-foreground">Initials:</span> {selectedOrg.initials || 'MISSING'}
                </div>
                <div>
                  <span className="text-muted-foreground">Uses Location Numbers:</span> {selectedOrg.uses_partner_location_numbers ? 'Yes' : 'No'}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {selectedOrgId && (
        <Card className={`border-2 ${error ? 'border-destructive' : isFallback ? 'border-yellow-500' : 'border-primary'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : error ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              )}
              Generated Work Order Number
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating number...
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {workOrderNumber && !error && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono text-lg px-4 py-2">
                    {workOrderNumber}
                  </Badge>
                  {isFallback && (
                    <Badge variant="destructive">Fallback</Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Organization:</span> {organizationName}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Location Number:</span> {locationNumber || 'Auto-generated'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Is Fallback:</span> {isFallback ? 'Yes' : 'No'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Requires Initials:</span> {requiresInitials ? 'Yes' : 'No'}
                  </div>
                </div>

                {warning && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{warning}</AlertDescription>
                  </Alert>
                )}

                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Expected Format Analysis:</p>
                  <div className="mt-2 text-xs text-muted-foreground space-y-1">
                    <div>• Format: ORG-LOC-WO (all 3 digits)</div>
                    <div>• Example: ABC-001-001, XYZ-504-001</div>
                    <div>• Location: {locationInput ? 'Manual entry' : 'Auto-generated'}</div>
                    <div>• Work Order: Sequential per location</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
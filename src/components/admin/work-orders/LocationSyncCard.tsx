import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, AlertTriangle, RefreshCw } from 'lucide-react';
import { usePartnerLocationsForOrganization } from '@/hooks/usePartnerLocationsForOrganization';

interface LocationData {
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  store_location?: string;
  partner_location_number?: string;
}

interface LocationSyncCardProps {
  organizationId?: string;
  workOrderData: LocationData;
  onLocationSync: (partnerLocationId: string, syncAction: 'work_order_only' | 'update_partner' | 'create_new') => void;
  onManualModeChange: (isManual: boolean) => void;
  isManualMode: boolean;
}

export function LocationSyncCard({ 
  organizationId, 
  workOrderData, 
  onLocationSync, 
  onManualModeChange,
  isManualMode 
}: LocationSyncCardProps) {
  const { data: partnerLocations, isLoading } = usePartnerLocationsForOrganization(organizationId);
  const [selectedAction, setSelectedAction] = useState<'work_order_only' | 'update_partner' | 'create_new'>('work_order_only');

  // Find matching partner location by location number
  const matchingLocation = partnerLocations?.find(
    loc => loc.location_number === workOrderData.partner_location_number
  );

  // Check if work order data differs from partner location
  const hasLocationDifference = matchingLocation && (
    matchingLocation.street_address !== workOrderData.street_address ||
    matchingLocation.city !== workOrderData.city ||
    matchingLocation.state !== workOrderData.state ||
    matchingLocation.zip_code !== workOrderData.zip_code ||
    matchingLocation.location_name !== workOrderData.store_location
  );

  if (isLoading || !organizationId || isManualMode) {
    return null;
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Location Sync
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="manual-mode" className="text-sm">Manual Mode</Label>
            <Switch
              id="manual-mode"
              checked={isManualMode}
              onCheckedChange={onManualModeChange}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {matchingLocation ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                Partner Location: {matchingLocation.location_number}
              </Badge>
              {hasLocationDifference && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Data Mismatch
                </Badge>
              )}
            </div>

            {hasLocationDifference && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Work order location data differs from partner location. Choose how to handle this:
                </AlertDescription>
              </Alert>
            )}

            <div className="text-xs space-y-1">
              <div><strong>Partner Location:</strong> {matchingLocation.location_name}</div>
              <div>{matchingLocation.street_address}</div>
              <div>{matchingLocation.city}, {matchingLocation.state} {matchingLocation.zip_code}</div>
            </div>

            {hasLocationDifference && (
              <div className="space-y-2">
                <Label className="text-xs">Sync Action:</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="syncAction"
                      value="work_order_only"
                      checked={selectedAction === 'work_order_only'}
                      onChange={(e) => setSelectedAction(e.target.value as any)}
                      className="w-3 h-3"
                    />
                    <span className="text-xs">Update work order only</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="syncAction"
                      value="update_partner"
                      checked={selectedAction === 'update_partner'}
                      onChange={(e) => setSelectedAction(e.target.value as any)}
                      className="w-3 h-3"
                    />
                    <span className="text-xs">Update partner location with work order data</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="syncAction"
                      value="create_new"
                      checked={selectedAction === 'create_new'}
                      onChange={(e) => setSelectedAction(e.target.value as any)}
                      className="w-3 h-3"
                    />
                    <span className="text-xs">Create new partner location</span>
                  </label>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onLocationSync(matchingLocation.id, selectedAction)}
                  className="w-full"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Apply Sync Action
                </Button>
              </div>
            )}
          </div>
        ) : workOrderData.partner_location_number ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Partner location #{workOrderData.partner_location_number} not found. 
              Work order will use manual address data.
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
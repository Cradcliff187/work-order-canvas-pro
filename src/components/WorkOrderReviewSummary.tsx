
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useFormContext } from 'react-hook-form';
import { MapPin, FileText, User, Mail, Phone, Building2, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { formatDate, formatDateTime } from '@/lib/utils/date';
import { formatAddress } from '@/lib/utils/addressUtils';
import { usePartnerLocation } from '@/hooks/usePartnerLocation';

interface WorkOrderReviewSummaryProps {
  trades: any[];
  workOrderNumber?: string;
  isLoadingWorkOrderNumber?: boolean;
  workOrderNumberError?: string | null;
  organizationName?: string;
  userProfile?: any;
  selectedLocation?: any;
  generatedLocationNumber?: string;
  isLoadingLocations?: boolean;
  locationsError?: string | null;
  partnerLocationSelection?: string;
}

export const WorkOrderReviewSummary: React.FC<WorkOrderReviewSummaryProps> = ({
  trades,
  workOrderNumber,
  isLoadingWorkOrderNumber,
  workOrderNumberError,
  organizationName,
  selectedLocation,
  generatedLocationNumber,
  isLoadingLocations,
  locationsError,
  partnerLocationSelection
}) => {
  const form = useFormContext();
  const formData = form.getValues();
  
  const selectedTrade = trades.find(trade => trade.id === formData.trade_id);
  const isExistingLocation = partnerLocationSelection && partnerLocationSelection !== 'add_new';

  // Fallback hook to fetch individual location if selectedLocation is not available
  const { 
    data: fallbackLocation, 
    isLoading: isLoadingFallbackLocation, 
    error: fallbackLocationError,
    refetch: refetchLocation 
  } = usePartnerLocation(isExistingLocation && !selectedLocation ? partnerLocationSelection : undefined);

  // Determine which location data to use
  const locationToUse = selectedLocation || fallbackLocation;
  const isLocationLoading = isLoadingLocations || isLoadingFallbackLocation;
  const locationError = locationsError || fallbackLocationError?.message;

  // Calculate auto-generated title (same logic as in submission)
  const calculateFinalTitle = () => {
    if (formData.title && formData.title.trim()) {
      return formData.title;
    }
    // Auto-generate title when store_location and trade are selected
    if (formData.store_location && selectedTrade) {
      return `${formData.store_location} - ${selectedTrade.name} Work`;
    }
    return `${formData.store_location || 'New Location'} - Work Order`;
  };

  const finalTitle = calculateFinalTitle();

  // Get location data with improved location number handling
  const getLocationData = () => {
    if (isExistingLocation && locationToUse) {
      // Use location from existing selection
      const locationNumber = locationToUse.location_number;
      const displayName = locationToUse.location_name || formData.store_location;
      const formattedName = locationNumber ? `${displayName} (${locationNumber})` : displayName;
      
      return {
        name: formattedName,
        code: locationNumber,
        address: formatAddress({
          location_street_address: locationToUse.street_address,
          location_city: locationToUse.city,
          location_state: locationToUse.state,
          location_zip_code: locationToUse.zip_code
        }),
        contactName: locationToUse.contact_name,
        contactEmail: locationToUse.contact_email,
        contactPhone: locationToUse.contact_phone
      };
    }
    
    // Manual entry or auto-generated location
    const displayName = formData.store_location || formData.location_name;
    let locationNumber = null;
    
    // Priority: generatedLocationNumber > manual partner_location_number
    if (generatedLocationNumber) {
      locationNumber = generatedLocationNumber;
    } else if (formData.partner_location_number) {
      locationNumber = formData.partner_location_number;
    }
    
    const formattedName = locationNumber ? `${displayName} (${locationNumber})` : displayName;
    
    return {
      name: formattedName,
      code: locationNumber,
      address: formatAddress({
        location_street_address: formData.location_street_address || formData.street_address,
        location_city: formData.location_city || formData.city,
        location_state: formData.location_state || formData.state,
        location_zip_code: formData.location_zip_code || formData.zip_code
      }),
      contactName: formData.location_contact_name,
      contactEmail: formData.location_contact_email,
      contactPhone: formData.location_contact_phone
    };
  };

  const locationData = getLocationData();

  return (
    <div className="space-y-6">
      {/* Property Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Property Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Show loading state for location data */}
          {isLocationLoading && isExistingLocation ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : locationError && isExistingLocation ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Failed to load location details: {locationError}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchLocation()}
                  className="ml-2"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div>
                <div className="text-lg font-semibold">
                  {locationData.name || 'Property Name Not Specified'}
                </div>
                {locationData.code && (
                  <div className="text-sm text-muted-foreground">
                    Location Code: {locationData.code}
                  </div>
                )}
              </div>

              {locationData.address && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Address</div>
                  <div className="text-base">{locationData.address}</div>
                </div>
              )}

              {(locationData.contactName || locationData.contactEmail || locationData.contactPhone) && (
                <div className="pt-2 border-t">
                  <div className="text-sm font-medium text-muted-foreground mb-3">Site Contact</div>
                  <div className="grid grid-cols-1 gap-3">
                    {locationData.contactName && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{locationData.contactName}</span>
                      </div>
                    )}
                    {locationData.contactEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{locationData.contactEmail}</span>
                      </div>
                    )}
                    {locationData.contactPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{locationData.contactPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Service Request Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Service Request Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auto-generated title display */}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">Title</div>
            <div className="text-lg font-semibold">{finalTitle}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Service Request Number with loading/error states */}
            <div>
              <div className="text-sm font-medium text-muted-foreground">Service Request Number</div>
              <div className="text-lg font-semibold">
                {isLoadingWorkOrderNumber ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generating...</span>
                  </div>
                ) : workOrderNumberError ? (
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>Will be assigned</span>
                  </div>
                ) : workOrderNumber ? (
                  workOrderNumber
                ) : (
                  <span className="text-muted-foreground">Will be assigned</span>
                )}
              </div>
            </div>
            
            <div>
              <div className="text-sm font-medium text-muted-foreground">Work Type</div>
              <div className="text-lg font-semibold">{selectedTrade?.name || 'Not specified'}</div>
            </div>
          </div>

          {formData.description && (
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">Description</div>
              <div className="text-base bg-muted/30 p-3 rounded-md">{formData.description}</div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formData.partner_po_number && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">PO Number</div>
                <div className="text-base">{formData.partner_po_number}</div>
              </div>
            )}
            {formData.due_date && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Due Date</div>
                <div className="text-base">{formatDate(formData.due_date)}</div>
              </div>
            )}
            {formData.estimated_hours && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Estimated Hours</div>
                <div className="text-base">{formData.estimated_hours} hours</div>
              </div>
            )}
          </div>

          {/* Submission information with current date/time */}
          <div className="pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                Submitting service request for {organizationName || 'your organization'}
              </div>
              <div className="text-right md:text-left">
                Submission time: {formatDateTime(new Date())}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Final Confirmation */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <div className="text-lg font-medium">Ready to Submit?</div>
            <div className="text-sm text-muted-foreground">
              Please review all information above. Once submitted, your service request will be processed and assigned.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

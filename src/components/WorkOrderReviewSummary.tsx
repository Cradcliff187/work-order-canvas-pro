import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useFormContext } from 'react-hook-form';
import { MapPin, Building2, FileText, Clock, User, Mail, Phone, CreditCard, Hash, Calendar } from "lucide-react";
import { formatDate, formatDateTime } from '@/lib/utils/date';
import { formatAddress, formatLocationDisplay } from '@/lib/utils/addressUtils';

interface WorkOrderReviewSummaryProps {
  trades: any[];
  workOrderNumber?: string;
  isLoadingWorkOrderNumber?: boolean;
  organizationName?: string;
  userProfile?: any;
  selectedLocation?: any;
  generatedLocationNumber?: string;
}

export const WorkOrderReviewSummary: React.FC<WorkOrderReviewSummaryProps> = ({
  trades,
  workOrderNumber,
  isLoadingWorkOrderNumber,
  organizationName,
  userProfile,
  selectedLocation,
  generatedLocationNumber
}) => {
  const form = useFormContext();
  const formData = form.getValues();
  
  const selectedTrade = trades.find(trade => trade.id === formData.trade_id);
  const partnerLocationSelection = formData.partner_location_selection;
  const isExistingLocation = partnerLocationSelection && partnerLocationSelection !== 'add_new';
  const isManualEntry = partnerLocationSelection === 'add_new';

  // Determine data sources
  const getLocationSource = () => {
    if (isExistingLocation) return 'Existing Location';
    if (isManualEntry) return 'Manual Entry';
    return 'System Default';
  };

  // Get location data (from existing location or manual entry)
  const getLocationData = () => {
    if (isExistingLocation && selectedLocation) {
      // Priority: generatedLocationNumber > selectedLocation.location_number
      const locationNumber = generatedLocationNumber || selectedLocation.location_number;
      const displayName = selectedLocation.location_name || formData.store_location;
      const formattedName = locationNumber ? `${displayName} (${locationNumber})` : displayName;
      
      return {
        name: formattedName,
        code: locationNumber,
        address: formatAddress({
          location_street_address: selectedLocation.street_address,
          location_city: selectedLocation.city,
          location_state: selectedLocation.state,
          location_zip_code: selectedLocation.zip_code
        }),
        contactName: selectedLocation.contact_name,
        contactEmail: selectedLocation.contact_email,
        contactPhone: selectedLocation.contact_phone
      };
    }
    
    // Manual entry or fallback
    // Priority: generatedLocationNumber > formData.partner_location_number
    const locationNumber = generatedLocationNumber || formData.partner_location_number;
    const displayName = formData.store_location || formData.location_name;
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
  const currentDate = new Date();

  return (
    <div className="space-y-6">
      {/* Work Order Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Work Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Work Order Number
              </div>
              <div className="text-base font-medium">
                {isLoadingWorkOrderNumber ? (
                  <span className="text-muted-foreground">Generating...</span>
                ) : workOrderNumber ? (
                  workOrderNumber
                ) : (
                  <span className="text-muted-foreground">Will be generated</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Status</div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Received (Pending Assignment)
              </Badge>
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-muted-foreground">Title</div>
            <div className="text-base font-medium">
              {formData.title || `${locationData.name || 'New Location'} - ${selectedTrade?.name || 'Work'} Order`}
              <Badge variant="outline" className="ml-2 text-xs">Auto-generated</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Location Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline" className={isExistingLocation ? "bg-green-50 text-green-700 border-green-200" : "bg-blue-50 text-blue-700 border-blue-200"}>
              {getLocationSource()}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Location Name</div>
              <div className="text-base">{locationData.name || 'Not specified'}</div>
            </div>
            {locationData.code && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Location Code</div>
                <div className="text-base">{locationData.code}</div>
              </div>
            )}
          </div>

          {locationData.address && (
            <div>
              <div className="text-sm font-medium text-muted-foreground">Address</div>
              <div className="text-base">{locationData.address}</div>
            </div>
          )}

          {(locationData.contactName || locationData.contactEmail || locationData.contactPhone) && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="text-sm font-medium text-muted-foreground">Contact Information</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Work Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Work Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Type of Work</div>
              <div className="text-base font-medium">{selectedTrade?.name || 'Not specified'}</div>
            </div>
            {formData.partner_po_number && (
              <div>
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  PO Number
                </div>
                <div className="text-base">{formData.partner_po_number}</div>
              </div>
            )}
          </div>

          {formData.description && (
            <div>
              <div className="text-sm font-medium text-muted-foreground">Description</div>
              <div className="text-base bg-muted/30 p-3 rounded-md">{formData.description}</div>
            </div>
          )}

          {(formData.due_date || formData.estimated_hours) && (
            <>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.due_date && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Due Date
                    </div>
                    <div className="text-base">{formatDate(formData.due_date)}</div>
                  </div>
                )}
                {formData.estimated_hours && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Estimated Hours
                    </div>
                    <div className="text-base">{formData.estimated_hours} hours</div>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Submission Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Submission Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Organization</div>
              <div className="text-base font-medium">{organizationName || 'Unknown Organization'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Submitted by</div>
              <div className="text-base">
                {userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'Current User'}
              </div>
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Submission Date & Time
            </div>
            <div className="text-base">{formatDateTime(currentDate)}</div>
            <Badge variant="outline" className="ml-2 text-xs">System Generated</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Final Confirmation */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <div className="text-lg font-medium">Ready to Submit?</div>
            <div className="text-sm text-muted-foreground">
              Please review all information above. Once submitted, your work order will be processed and assigned.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

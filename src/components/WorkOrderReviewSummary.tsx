
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormContext } from 'react-hook-form';
import { MapPin, FileText, User, Mail, Phone, Hash, Calendar, Clock } from "lucide-react";
import { formatDate, formatDateTime } from '@/lib/utils/date';
import { formatAddress } from '@/lib/utils/addressUtils';

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

  return (
    <div className="space-y-6">
      {/* Location Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Location Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-lg font-semibold">
              {locationData.name || 'Location Name Not Specified'}
            </div>
          </div>

          {locationData.address && (
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Address</div>
              <div className="text-base">{locationData.address}</div>
            </div>
          )}

          {(locationData.contactName || locationData.contactEmail || locationData.contactPhone) && (
            <div className="pt-2 border-t">
              <div className="text-sm font-medium text-muted-foreground mb-3">Contact Information</div>
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
        </CardContent>
      </Card>

      {/* Work Details Card */}
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
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Work Order Number
              </div>
              <div className="text-lg font-semibold">
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
              <div className="text-sm font-medium text-muted-foreground">Type of Work</div>
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

          <div className="pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              <strong>Submitting for:</strong> {organizationName || 'Unknown Organization'} • 
              <strong> By:</strong> {userProfile ? ` ${userProfile.first_name} ${userProfile.last_name}` : ' Current User'} • 
              <strong> On:</strong> {formatDateTime(new Date())}
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
              Please review all information above. Once submitted, your work order will be processed and assigned.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

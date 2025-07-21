import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Building2, MapPin, ExternalLink, Plus, Loader2, User, Phone, Mail, Info, Eye } from 'lucide-react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { US_STATES } from '@/constants/states';
import { useLocationSuggestions, formatLocationDisplay, getDirectionsUrl, LocationSuggestion } from '@/hooks/useLocationSuggestions';
import { usePartnerOrganizationLocations } from '@/hooks/usePartnerOrganizationLocations';
import { useAutoOrganization } from '@/hooks/useAutoOrganization';
import { useOrganization } from '@/hooks/useOrganizations';
import { useUserOrganization } from '@/hooks/useUserOrganization';
import { useWorkOrderNumberGeneration } from '@/hooks/useWorkOrderNumberGeneration';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

interface LocationFieldsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  organizationId?: string;
  organizationType?: string;
  showPoNumber?: boolean;
  className?: string;
}

export function LocationFields({ 
  form, 
  organizationId, 
  organizationType,
  showPoNumber = true,
  className 
}: LocationFieldsProps) {
  const { organizationId: autoOrgId, organizationType: autoOrgType } = useAutoOrganization();
  
  const { toast } = useToast();
  
  // Use auto-detected organization if not provided
  const effectiveOrganizationId = organizationId || autoOrgId;
  const effectiveOrganizationType = organizationType || autoOrgType;
  
  const [locationSearchValue, setLocationSearchValue] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>(null);
  const [manualEntryMode, setManualEntryMode] = useState(false);
  const [partnerLocationSelected, setPartnerLocationSelected] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [isGeneratingNumber, setIsGeneratingNumber] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);

  // Get the user's organization data
  const { organization: userOrg, loading: loadingUserOrg } = useUserOrganization();

  // Use user's organization if no specific org ID provided
  const { data: organization, isLoading: isLoadingOrganization } = useOrganization(
    effectiveOrganizationId || ''
  );

  // Use whichever organization data is available
  const orgData = organization || userOrg;

  const { data: partnerLocations, isLoading: isLoadingPartnerLocations } = usePartnerOrganizationLocations(
    effectiveOrganizationId
  );

  // Watch for location code changes to generate work order number preview
  const locationCodeValue = form.watch('partner_location_number');
  
  // Generate work order number preview
  const {
    workOrderNumber: previewWorkOrderNumber,
    isLoading: isLoadingPreview,
    organizationName,
  } = useWorkOrderNumberGeneration({
    organizationId: effectiveOrganizationId,
    locationNumber: locationCodeValue,
  });

  // Add field synchronization between new and legacy field names
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (!name) return;

      // Sync new location fields to legacy fields for backward compatibility
      if (name === 'location_street_address') {
        form.setValue('street_address', value.location_street_address || '');
      } else if (name === 'location_city') {
        form.setValue('city', value.location_city || '');
      } else if (name === 'location_state') {
        form.setValue('state', value.location_state || '');
      } else if (name === 'location_zip_code') {
        form.setValue('zip_code', value.location_zip_code || '');
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  const handlePartnerLocationSelect = useCallback((location: Tables<'partner_locations'>) => {
    if (isUpdatingLocation) return; // Prevent rapid updates
    
    setIsUpdatingLocation(true);
    
    // Set selected location ID first for proper Select state
    setSelectedLocationId(location.id);
    setPartnerLocationSelected(true);
    
    // Use individual setValue calls instead of reset to avoid Select disruption
    form.setValue('partner_location_number', location.location_number);
    form.setValue('store_location', location.location_name);
    form.setValue('location_street_address', location.street_address || '');
    form.setValue('location_city', location.city || '');
    form.setValue('location_state', location.state || '');
    form.setValue('location_zip_code', location.zip_code || '');
    // Contact information fields
    form.setValue('location_contact_name', location.contact_name || '');
    form.setValue('location_contact_phone', location.contact_phone || '');
    form.setValue('location_contact_email', location.contact_email || '');
    // Legacy fields for backward compatibility
    form.setValue('street_address', location.street_address || '');
    form.setValue('city', location.city || '');
    form.setValue('state', location.state || '');
    form.setValue('zip_code', location.zip_code || '');
    
    // Update other state
    setManualEntryMode(false);
    setSelectedLocation(null);
    
    setIsUpdatingLocation(false);
  }, [form, isUpdatingLocation]);

  const clearLocationSelection = useCallback(() => {
    setSelectedLocation(null);
    setLocationSearchValue('');
    setPartnerLocationSelected(false);
    setSelectedLocationId('');
    setManualEntryMode(false);
    form.setValue('partner_location_number', '');
    form.setValue('store_location', '');
    form.setValue('location_street_address', '');
    form.setValue('location_city', '');
    form.setValue('location_state', '');
    form.setValue('location_zip_code', '');
    form.setValue('location_contact_name', '');
    form.setValue('location_contact_phone', '');
    form.setValue('location_contact_email', '');
    // Clear legacy fields too
    form.setValue('street_address', '');
    form.setValue('city', '');
    form.setValue('state', '');
    form.setValue('zip_code', '');
  }, [form]);

  const handleAddNewLocation = useCallback(() => {
    // Clear all existing state and form data immediately
    setManualEntryMode(true);
    setPartnerLocationSelected(false);
    setSelectedLocation(null);
    setSelectedLocationId(''); // This clears the dropdown selection
    
    // Preserve typed location code for organizations that require manual entry
    if (orgData?.uses_partner_location_numbers && locationSearchValue) {
      form.setValue('partner_location_number', locationSearchValue);
    } else if (!orgData?.uses_partner_location_numbers) {
      form.setValue('partner_location_number', '');
    }
    
    // Clear all other form fields
    form.setValue('store_location', '');
    form.setValue('location_street_address', '');
    form.setValue('location_city', '');
    form.setValue('location_state', '');
    form.setValue('location_zip_code', '');
    form.setValue('location_contact_name', '');
    form.setValue('location_contact_phone', '');
    form.setValue('location_contact_email', '');
    // Also clear legacy fields
    form.setValue('street_address', '');
    form.setValue('city', '');
    form.setValue('state', '');
    form.setValue('zip_code', '');
  }, [form, orgData?.uses_partner_location_numbers, locationSearchValue]);

  // Stabilize computed values with useMemo
  const showLocationDetails = useMemo(() => {
    // Show location details for manual entry, location search/suggestions, OR partner location selections
    const hasManualEntry = manualEntryMode;
    const hasSelectedLocation = selectedLocation !== null;
    const hasPartnerLocationSelected = partnerLocationSelected;
    return hasManualEntry || hasSelectedLocation || hasPartnerLocationSelected;
  }, [manualEntryMode, selectedLocation, partnerLocationSelected]);

  // Generate help text based on organization settings
  const locationCodeHelpText = useMemo(() => {
    if (!orgData) return '';
    
    if (orgData.uses_partner_location_numbers) {
      const initials = orgData.initials || 'ORG';
      return `Enter your location code (will appear in work order as: ${initials}-{CODE}-###)`;
    } else {
      return 'Location code will be auto-assigned (001, 002, etc.)';
    }
  }, [orgData]);

  // Generate placeholder text based on organization settings
  const locationCodePlaceholder = useMemo(() => {
    if (!orgData) return '';
    
    if (orgData.uses_partner_location_numbers) {
      return 'e.g., BLDG-A, NORTH-WING, 205';
    } else {
      return 'Leave blank for auto-generated';
    }
  }, [orgData]);

  // All hooks declared above - now check loading state
  if ((isLoadingOrganization || loadingUserOrg) && !effectiveOrganizationId) {
    return <Skeleton className="h-10 w-full" />;
  }

  // Determine if we should show partner locations dropdown
  const shouldShowPartnerLocations = effectiveOrganizationId && partnerLocations && partnerLocations.length > 0;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Location Selection Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <MapPin className="h-5 w-5 text-primary" />
            Location Information
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {shouldShowPartnerLocations && !manualEntryMode 
              ? "Select from saved locations or add a new one" 
              : orgData?.uses_partner_location_numbers 
                ? "Enter location details for this work order"
                : "Location details will be captured when saved"
            }
          </p>
        </div>

        {shouldShowPartnerLocations && !manualEntryMode ? (
          // Saved Locations Mode
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">Saved Locations</h4>
              <Badge variant="secondary" className="text-xs">
                {partnerLocations?.length} locations
              </Badge>
            </div>
            
            <FormField
              control={form.control}
              name="partner_location_selection"
              render={() => (
                <FormItem>
                  <FormControl>
                    <Select onValueChange={(value) => {
                      if (value === "add_new") {
                        handleAddNewLocation();
                      } else {
                        const location = partnerLocations?.find(loc => loc.id === value);
                        if (location) {
                          handlePartnerLocationSelect(location);
                        }
                      }
                    }} value={selectedLocationId}>
                      <SelectTrigger className="h-12 bg-background">
                        <SelectValue placeholder={isLoadingPartnerLocations ? "Loading locations..." : "Choose a saved location"} />
                      </SelectTrigger>
                      <SelectContent>
                        {partnerLocations?.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            <div className="flex items-center gap-3 py-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                {location.location_number}
                              </Badge>
                              <div className="flex flex-col gap-1">
                                <span className="font-medium text-sm">{location.location_name}</span>
                                {location.street_address && (
                                  <span className="text-xs text-muted-foreground">
                                    {location.street_address}, {location.city}, {location.state}
                                  </span>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="add_new" className="border-t">
                          <div className="flex items-center gap-2 text-primary font-medium py-2">
                            <Plus className="h-4 w-4" />
                            <span>Add New Location</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />
            
            {/* Mobile Add New Button */}
            <div className="md:hidden">
              <Button
                type="button"
                variant="outline"
                onClick={handleAddNewLocation}
                className="w-full h-12 justify-start bg-background"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Location
              </Button>
            </div>
          </div>
        ) : (
          // Manual Entry Mode
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">Manual Entry</h4>
              {shouldShowPartnerLocations && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setManualEntryMode(false);
                    setSelectedLocationId('');
                    clearLocationSelection();
                  }}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  ← Back to saved locations
                </Button>
              )}
            </div>
            
            <FormField
              control={form.control}
              name="partner_location_number"
              rules={{
                required: orgData?.uses_partner_location_numbers ? 'Location code is required' : false
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location Code {orgData?.uses_partner_location_numbers && <span className="text-destructive">*</span>}
                    {!orgData?.uses_partner_location_numbers && <Badge variant="secondary" className="text-xs">Auto</Badge>}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={locationCodePlaceholder}
                      className="h-11 bg-background"
                      disabled={!orgData?.uses_partner_location_numbers}
                    />
                  </FormControl>
                  {locationCodeHelpText && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{locationCodeHelpText}</span>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Work Order Number Preview */}
            {orgData && (locationCodeValue || !orgData.uses_partner_location_numbers) && (
              <Alert className="border-primary/20 bg-primary/5">
                <Eye className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Work Order Preview:</span>
                    {isLoadingPreview ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-muted-foreground">Generating...</span>
                      </div>
                    ) : (
                      <Badge variant="outline" className="font-mono">
                        {previewWorkOrderNumber || 'Preview will appear here'}
                      </Badge>
                    )}
                  </div>
                  {organizationName && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Organization: {organizationName}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>

      {/* Location Details Section */}
      {showLocationDetails && (
        <Card className="border-primary/20 bg-background">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold flex items-center gap-2 text-foreground">
                <Building2 className="h-4 w-4 text-primary" />
                Location Details
              </h4>
              <div className="flex items-center gap-2">
                {selectedLocation && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const url = getDirectionsUrl(selectedLocation);
                      if (url) {
                        window.open(url, '_blank');
                      } else {
                        toast({
                          title: "No address available",
                          description: "Cannot get directions without a complete address.",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="text-muted-foreground hover:text-foreground hidden md:flex text-xs"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Directions
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearLocationSelection}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Location Name */}
            <FormField
              control={form.control}
              name="store_location"
              rules={{ required: 'Location name is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Location Name *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., North Building A, Main Warehouse" 
                      className="h-11 bg-background"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address Fields */}
            <div className="space-y-4">
              <h5 className="text-sm font-medium text-foreground border-b border-border pb-2">
                Address Information
              </h5>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="location_street_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Street Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="123 Main Street" 
                          className="h-11 bg-background"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location_city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">City</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="City" 
                          className="h-11 bg-background"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location_state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">State</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 bg-background">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {US_STATES.map((state) => (
                            <SelectItem key={state.value} value={state.value}>
                              {state.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location_zip_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">ZIP Code</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="12345" 
                          className="h-11 bg-background"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Site Contact Information */}
            <div className="space-y-4">
              <h5 className="text-sm font-medium text-foreground border-b border-border pb-2 flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Site Contact Information
                <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
              </h5>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="location_contact_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <User className="h-3 w-3" />
                        Contact Name
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="John Smith" 
                          className="h-11 bg-background"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location_contact_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        Phone Number
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="(555) 123-4567" 
                          className="h-11 bg-background"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location_contact_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="contact@company.com" 
                          type="email"
                          className="h-11 bg-background"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Purchase Information Section */}
      {showPoNumber && (
        <Card className="bg-background">
          <CardContent className="p-6">
            <h4 className="text-base font-semibold mb-4 flex items-center gap-2 text-foreground">
              <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs text-primary font-medium">#</span>
              </div>
              Purchase Information
            </h4>
            <FormField
              control={form.control}
              name="partner_po_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">PO Number (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter purchase order number" 
                      className="h-11 bg-background"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

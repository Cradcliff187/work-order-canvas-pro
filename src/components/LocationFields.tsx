import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Building2, MapPin, ExternalLink, Plus, Loader2 } from 'lucide-react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { US_STATES } from '@/constants/states';
import { useLocationSuggestions, formatLocationDisplay, getDirectionsUrl, LocationSuggestion } from '@/hooks/useLocationSuggestions';
import { usePartnerOrganizationLocations } from '@/hooks/usePartnerOrganizationLocations';
import { useAutoOrganization } from '@/hooks/useAutoOrganization';
import { useOrganization } from '@/hooks/useOrganizations';
import { useUserOrganization } from '@/hooks/useUserOrganization';
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
  }, [form]);

  const handleAddNewLocation = useCallback(() => {
    // Clear all existing state and form data immediately
    setManualEntryMode(true);
    setPartnerLocationSelected(false);
    setSelectedLocation(null);
    setSelectedLocationId(''); // This clears the dropdown selection
    
    // Preserve typed location number for organizations that require manual entry
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
          <h3 className="text-lg font-medium flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Information
          </h3>
          <p className="text-sm text-muted-foreground">
            {shouldShowPartnerLocations && !manualEntryMode 
              ? "Select from your saved locations or add a new one" 
              : orgData?.uses_partner_location_numbers 
                ? "Enter a location number and details for this work order"
                : "Location details will be auto-generated when saved"
            }
          </p>
        </div>

        {shouldShowPartnerLocations && !manualEntryMode ? (
          // Partner Locations Selection Mode
          <FormField
            control={form.control}
            name="partner_location_selection"
            render={() => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Select Location
                </FormLabel>
                <FormControl>
                  <div className="space-y-3">
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
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={isLoadingPartnerLocations ? "Loading locations..." : "Choose from saved locations"} />
                      </SelectTrigger>
                      <SelectContent>
                        {partnerLocations?.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            <div className="flex items-center gap-3 py-1">
                              <Badge variant="secondary" className="font-mono">
                                {location.location_number}
                              </Badge>
                              <div className="flex flex-col">
                                <span className="font-medium">{location.location_name}</span>
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
                          <div className="flex items-center gap-2 text-primary font-medium py-1">
                            <Plus className="h-4 w-4" />
                            <span>Add New Location</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </FormControl>
              </FormItem>
            )}
          />
        ) : (
          // Manual Entry Mode
          <FormField
            control={form.control}
            name="partner_location_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location Number {orgData?.uses_partner_location_numbers && <span className="text-destructive">*</span>}
                  {isGeneratingNumber && <span className="text-sm text-muted-foreground">(generating...)</span>}
                </FormLabel>
                <FormControl>
                  {orgData?.uses_partner_location_numbers ? (
                    <Input
                      {...field}
                      placeholder="Enter location number (e.g., 001, ABC-123)"
                      className="h-11"
                    />
                  ) : (
                    <div className="relative">
                      <Input
                        {...field}
                        placeholder="Will be auto-generated"
                        className="h-11 bg-muted/50"
                        disabled
                      />
                      <Badge variant="outline" className="absolute right-3 top-3">
                        Auto
                      </Badge>
                    </div>
                  )}
                </FormControl>
                {shouldShowPartnerLocations && manualEntryMode && (
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setManualEntryMode(false);
                        setSelectedLocationId('');
                        clearLocationSelection();
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      ← Back to saved locations
                    </Button>
                  </div>
                )}
              </FormItem>
            )}
          />
        )}

        {/* Add New Location Button for Mobile */}
        {shouldShowPartnerLocations && !manualEntryMode && (
          <div className="md:hidden">
            <Button
              type="button"
              variant="outline"
              onClick={handleAddNewLocation}
              className="w-full h-11 text-left justify-start"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Location
            </Button>
          </div>
        )}
      </div>

      {/* Location Details Section */}
      {showLocationDetails && (
        <Card className="border-primary/20">
          <CardContent className="p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
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
                    className="text-muted-foreground hover:text-foreground hidden md:flex"
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
                  className="text-muted-foreground hover:text-foreground"
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="store_location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Location Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Downtown Office, Main Store, Store #123" 
                        className="h-11"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                          className="h-11"
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
                          className="h-11"
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
                          <SelectTrigger className="h-11">
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
                          className="h-11"
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
        <Card>
          <CardContent className="p-4 md:p-6">
            <h4 className="text-base font-medium mb-4 flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center">
                <span className="text-xs">#</span>
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
                      className="h-11"
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
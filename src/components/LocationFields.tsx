import React, { useCallback, useMemo, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Building2, MapPin, ExternalLink, Plus, Loader2 } from 'lucide-react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { US_STATES } from '@/constants/states';
import { useLocationSuggestions, formatLocationDisplay, getDirectionsUrl, LocationSuggestion } from '@/hooks/useLocationSuggestions';
import { usePartnerOrganizationLocations } from '@/hooks/usePartnerOrganizationLocations';
import { useAutoOrganization } from '@/hooks/useAutoOrganization';
import { useOrganization } from '@/hooks/useOrganizations';
import { supabase } from '@/integrations/supabase/client';
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
  
  const [locationSearchOpen, setLocationSearchOpen] = useState(false);
  const [locationSearchValue, setLocationSearchValue] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>(null);
  const [manualEntryMode, setManualEntryMode] = useState(false);
  const [partnerLocationSelected, setPartnerLocationSelected] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [isGeneratingNumber, setIsGeneratingNumber] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);

  // Query organization data to get uses_partner_location_numbers setting
  const { data: organization, isLoading: isLoadingOrganization } = useOrganization(
    effectiveOrganizationId || ''
  );

  const { data: locationSuggestions, isLoading } = useLocationSuggestions({
    organizationId: effectiveOrganizationId,
    searchTerm: locationSearchValue,
    enabled: !!effectiveOrganizationId
  });

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
    setLocationSearchOpen(false);
    setManualEntryMode(false);
    setSelectedLocation(null);
    
    setIsUpdatingLocation(false);
  }, [form, isUpdatingLocation]);

  const handleLocationSelect = useCallback((suggestion: LocationSuggestion) => {
    if (isUpdatingLocation) return; // Prevent rapid updates
    
    setIsUpdatingLocation(true);
    
    // Get current form values to preserve other data
    const currentValues = form.getValues();
    
    // Batch all form updates into a single operation
    form.reset({
      ...currentValues,
      partner_location_number: suggestion.location_number,
      store_location: suggestion.location_name,
      location_street_address: suggestion.location_street_address,
      location_city: suggestion.location_city,
      location_state: suggestion.location_state,
      location_zip_code: suggestion.location_zip_code,
      // Legacy fields for backward compatibility
      street_address: suggestion.location_street_address,
      city: suggestion.location_city,
      state: suggestion.location_state,
      zip_code: suggestion.location_zip_code
    });
    
    // Update state in single batch
    setSelectedLocation(suggestion);
    setLocationSearchValue(suggestion.location_number);
    setLocationSearchOpen(false);
    setPartnerLocationSelected(false);
    setSelectedLocationId('');
    
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
    setLocationSearchOpen(false);
    setPartnerLocationSelected(false);
    setSelectedLocation(null);
    setSelectedLocationId(''); // This clears the dropdown selection
    
    // Only clear location number field if organization doesn't require manual entry
    if (!organization?.uses_partner_location_numbers) {
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
  }, [form, organization?.uses_partner_location_numbers]);

  // Move all hook calls before conditional return
  const watchedLocationNumber = form.watch('partner_location_number');
  
  // Stabilize computed values with useMemo
  const showLocationDetails = useMemo(() => {
    // Only show location details for manual entry or location search/suggestions
    // NOT for partner location selections from dropdown
    const hasManualEntry = manualEntryMode;
    const hasSelectedLocation = selectedLocation !== null;
    return hasManualEntry || hasSelectedLocation;
  }, [manualEntryMode, selectedLocation]);

  // All hooks declared above - now check loading state
  if (isLoadingOrganization && !effectiveOrganizationId) {
    return <Skeleton className="h-10 w-full" />;
  }

  // Determine if we should show partner locations dropdown
  const shouldShowPartnerLocations = effectiveOrganizationId && partnerLocations && partnerLocations.length > 0;
  
  // Determine if we should use the search mode (fallback or manual entry)
  const shouldUseSearchMode = !shouldShowPartnerLocations || manualEntryMode;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Location Selection Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Location Selection</h3>
          <p className="text-sm text-muted-foreground">
            Choose from existing locations or add a new one
          </p>
        </div>

        <FormField
          control={form.control}
          name="partner_location_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location {organization?.uses_partner_location_numbers && <span className="text-destructive">*</span>}
                {isGeneratingNumber && <span className="text-sm text-muted-foreground">(generating...)</span>}
              </FormLabel>
              <FormControl>
                {shouldShowPartnerLocations && !shouldUseSearchMode ? (
                  // Partner Locations Dropdown
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
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingPartnerLocations ? "Loading..." : "Select a location"} />
                    </SelectTrigger>
                    <SelectContent>
                      {partnerLocations?.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {location.location_number}
                            </Badge>
                            <span>{location.location_name}</span>
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="add_new" disabled={isLoadingOrganization}>
                        <div className="flex items-center gap-2 text-primary">
                          {isLoadingOrganization ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-muted-foreground">Loading...</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4" />
                              <span>Add New Location</span>
                            </>
                          )}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  // Search Mode (fallback or manual entry)
                  <Popover open={locationSearchOpen} onOpenChange={setLocationSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={locationSearchOpen}
                        className="w-full justify-between"
                        type="button"
                        disabled={isGeneratingNumber}
                      >
                        {isGeneratingNumber ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating number...
                          </>
                        ) : field.value ? (
                          field.value
                        ) : organization?.uses_partner_location_numbers ? (
                          "Enter location number, name, or search existing"
                        ) : (
                          "Auto-generated when saved"
                        )}
                        <MapPin className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Search by location number, name, or address..." 
                          value={locationSearchValue}
                          onValueChange={setLocationSearchValue}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {isLoading ? "Searching..." : locationSearchValue ? "No matching locations found." : "Type to add a new location."}
                          </CommandEmpty>
                          {!locationSearchValue && locationSuggestions && locationSuggestions.length > 0 && (
                            <CommandGroup heading="Recent Locations">
                              {locationSuggestions.slice(0, 10).map((suggestion) => (
                                <CommandItem
                                  key={suggestion.location_number || suggestion.location_name}
                                  value={suggestion.location_number || suggestion.location_name}
                                  onSelect={() => handleLocationSelect(suggestion)}
                                  className="flex flex-col items-start gap-1"
                                >
                                  <div className="flex items-center gap-2 w-full">
                                    {suggestion.location_number && (
                                      <Badge variant="secondary">
                                        {suggestion.location_number}
                                      </Badge>
                                    )}
                                    {suggestion.location_name && (
                                      <span className="font-medium">
                                        {suggestion.location_name}
                                      </span>
                                    )}
                                    <Badge variant="outline" className="ml-auto">
                                      Used {suggestion.usage_count}x
                                    </Badge>
                                  </div>
                                  {suggestion.full_address && (
                                    <span className="text-sm text-muted-foreground">
                                      {suggestion.full_address}
                                    </span>
                                  )}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                          {locationSearchValue && (
                            <CommandGroup heading={locationSuggestions && locationSuggestions.length > 0 ? "Search Results" : "No Results"}>
                              {locationSuggestions?.map((suggestion) => (
                                <CommandItem
                                  key={suggestion.location_number || suggestion.location_number}
                                  value={suggestion.location_number || suggestion.location_name}
                                  onSelect={() => handleLocationSelect(suggestion)}
                                  className="flex flex-col items-start gap-1"
                                >
                                  <div className="flex items-center gap-2 w-full">
                                    {suggestion.location_number && (
                                      <Badge variant="secondary">
                                        {suggestion.location_number}
                                      </Badge>
                                    )}
                                    {suggestion.location_name && (
                                      <span className="font-medium">
                                        {suggestion.location_name}
                                      </span>
                                    )}
                                    <Badge variant="outline" className="ml-auto">
                                      Used {suggestion.usage_count}x
                                    </Badge>
                                  </div>
                                  {suggestion.full_address && (
                                    <span className="text-sm text-muted-foreground">
                                      {suggestion.full_address}
                                    </span>
                                  )}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                          {locationSearchValue && (
                            <CommandItem
                              onSelect={() => handleAddNewLocation()}
                              className="flex items-center gap-2 text-primary"
                            >
                              <Plus className="h-4 w-4" />
                              <span>Add "{locationSearchValue}" as new location</span>
                            </CommandItem>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </FormControl>
              <p className="text-sm text-muted-foreground mt-1">
                Select a saved location or add new below
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Location Details Section */}
      {showLocationDetails && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Location Details</h3>
            <p className="text-sm text-muted-foreground">
              Complete the address details
            </p>
          </div>
          
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="store_location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store/Location Name {showLocationDetails && <span className="text-destructive"> *</span>}</FormLabel>
                  <FormControl>
                      <Input placeholder="Main Street Store" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            <FormField
              control={form.control}
              name="location_street_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address {showLocationDetails && <span className="text-destructive"> *</span>}</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main Street" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="location_city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City {showLocationDetails && <span className="text-destructive"> *</span>}</FormLabel>
                    <FormControl>
                      <Input placeholder="City" {...field} />
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
                    <FormLabel>State {showLocationDetails && <span className="text-destructive"> *</span>}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
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
                    <FormLabel>ZIP Code {showLocationDetails && <span className="text-destructive"> *</span>}</FormLabel>
                    <FormControl>
                      <Input placeholder="12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* On-Site Contact Information - Only show for new location creation */}
            {showLocationDetails && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-md font-medium">On-Site Contact Information</h4>
                  <p className="text-sm text-muted-foreground">
                    Optional contact details for this location
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="location_contact_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
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
                        <FormLabel>Contact Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="location_contact_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input placeholder="contact@example.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {(selectedLocation || partnerLocationSelected) && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {selectedLocation ? 
                      formatLocationDisplay(selectedLocation) : 
                      `${form.watch('partner_location_number')} - ${form.watch('store_location')}`
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedLocation && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(
                        getDirectionsUrl(selectedLocation),
                        '_blank'
                      )}
                      className="h-8 px-2"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Purchase Information Section */}
      {showPoNumber && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Purchase Information</h3>
            <p className="text-sm text-muted-foreground">
              Optional purchase order number for tracking
            </p>
          </div>

          <FormField
            control={form.control}
            name="partner_po_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  PO Number <span className="text-sm text-muted-foreground">(Optional)</span>
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Purchase order number for tracking" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
}
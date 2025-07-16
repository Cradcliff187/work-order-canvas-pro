import React from 'react';
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
  usePartnerLocations?: boolean;
  className?: string;
}

export function LocationFields({ 
  form, 
  organizationId, 
  organizationType,
  showPoNumber = true,
  usePartnerLocations = true,
  className 
}: LocationFieldsProps) {
  const { organizationId: autoOrgId, organizationType: autoOrgType } = useAutoOrganization();
  const { toast } = useToast();
  
  // Use auto-detected organization if not provided
  const effectiveOrganizationId = organizationId || autoOrgId;
  const effectiveOrganizationType = organizationType || autoOrgType;
  const [locationSearchOpen, setLocationSearchOpen] = React.useState(false);
  const [locationSearchValue, setLocationSearchValue] = React.useState('');
  const [selectedLocation, setSelectedLocation] = React.useState<LocationSuggestion | null>(null);
  const [manualEntryMode, setManualEntryMode] = React.useState(false);
  const [partnerLocationSelected, setPartnerLocationSelected] = React.useState(false);
  const [isGeneratingNumber, setIsGeneratingNumber] = React.useState(false);

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
    usePartnerLocations && effectiveOrganizationId ? effectiveOrganizationId : undefined
  );

  const handlePartnerLocationSelect = (location: Tables<'partner_locations'>) => {
    setPartnerLocationSelected(true);
    setLocationSearchOpen(false);
    setManualEntryMode(false);

    // Auto-fill form fields from partner_locations data
    form.setValue('partner_location_number', location.location_number);
    form.setValue('store_location', location.location_name);
    form.setValue('location_street_address', location.street_address || '');
    form.setValue('location_city', location.city || '');
    form.setValue('location_state', location.state || '');
    form.setValue('location_zip_code', location.zip_code || '');

    // Also fill legacy fields for backward compatibility
    form.setValue('street_address', location.street_address || '');
    form.setValue('city', location.city || '');
    form.setValue('state', location.state || '');
    form.setValue('zip_code', location.zip_code || '');
  };

  const handleLocationSelect = (suggestion: LocationSuggestion) => {
    setSelectedLocation(suggestion);
    setLocationSearchValue(suggestion.location_number);
    setLocationSearchOpen(false);
    setPartnerLocationSelected(false);

    // Auto-fill form fields
    form.setValue('partner_location_number', suggestion.location_number);
    form.setValue('store_location', suggestion.location_name);
    form.setValue('location_street_address', suggestion.location_street_address);
    form.setValue('location_city', suggestion.location_city);
    form.setValue('location_state', suggestion.location_state);
    form.setValue('location_zip_code', suggestion.location_zip_code);

    // Also fill legacy fields for backward compatibility
    form.setValue('street_address', suggestion.location_street_address);
    form.setValue('city', suggestion.location_city);
    form.setValue('state', suggestion.location_state);
    form.setValue('zip_code', suggestion.location_zip_code);
  };

  const handleAddNewLocation = async () => {
    setManualEntryMode(true);
    setLocationSearchOpen(false);
    setPartnerLocationSelected(false);
    setSelectedLocation(null);
    clearLocationSelection();

    // Auto-generate location number if organization doesn't use manual numbering
    if (effectiveOrganizationId && !organization?.uses_partner_location_numbers) {
      setIsGeneratingNumber(true);
      try {
        const { data: generatedNumber, error } = await supabase.rpc(
          'generate_next_location_number',
          { org_id: effectiveOrganizationId }
        );

        if (error) {
          console.error('Failed to generate location number:', error);
          toast({
            title: "Auto-numbering failed",
            description: "Could not generate location number automatically. Please enter manually.",
            variant: "destructive",
          });
        } else if (generatedNumber) {
          form.setValue('partner_location_number', generatedNumber);
          toast({
            title: "Location number generated",
            description: `Auto-generated location number: ${generatedNumber}`,
          });
        }
      } catch (error) {
        console.error('Error generating location number:', error);
        toast({
          title: "Auto-numbering error",
          description: "An error occurred while generating location number. Please enter manually.",
          variant: "destructive",
        });
      } finally {
        setIsGeneratingNumber(false);
      }
    }
  };

  const clearLocationSelection = () => {
    setSelectedLocation(null);
    setLocationSearchValue('');
    setPartnerLocationSelected(false);
    setManualEntryMode(false);
    form.setValue('partner_location_number', '');
    form.setValue('store_location', '');
    form.setValue('location_street_address', '');
    form.setValue('location_city', '');
    form.setValue('location_state', '');
    form.setValue('location_zip_code', '');
  };

  const watchedLocationNumber = form.watch('partner_location_number');
  const showLocationDetails = watchedLocationNumber || selectedLocation || manualEntryMode;

  // Determine if we should show partner locations dropdown
  const shouldShowPartnerLocations = usePartnerLocations && effectiveOrganizationId && partnerLocations && partnerLocations.length > 0;
  
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
                  }} value={partnerLocationSelected ? field.value : ""}>
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
                      <SelectItem value="add_new">
                        <div className="flex items-center gap-2 text-primary">
                          <Plus className="h-4 w-4" />
                          <span>Add New Location</span>
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
                  <FormLabel>Store/Location Name *</FormLabel>
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
                  <FormLabel>Street Address</FormLabel>
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
                    <FormLabel>City</FormLabel>
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
                    <FormLabel>State</FormLabel>
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
                    <FormLabel>ZIP Code</FormLabel>
                    <FormControl>
                      <Input placeholder="12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
    </div>
  );
}
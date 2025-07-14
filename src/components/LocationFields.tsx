import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Building2, MapPin, ExternalLink } from 'lucide-react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { US_STATES } from '@/constants/states';
import { useLocationSuggestions, formatLocationDisplay, getDirectionsUrl, LocationSuggestion } from '@/hooks/useLocationSuggestions';

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
  const [locationSearchOpen, setLocationSearchOpen] = React.useState(false);
  const [locationSearchValue, setLocationSearchValue] = React.useState('');
  const [selectedLocation, setSelectedLocation] = React.useState<LocationSuggestion | null>(null);
  const [isReferenceOpen, setIsReferenceOpen] = React.useState(false);

  const { data: locationSuggestions, isLoading } = useLocationSuggestions({
    organizationId,
    searchTerm: locationSearchValue,
    enabled: !!organizationId
  });

  const handleLocationSelect = (suggestion: LocationSuggestion) => {
    setSelectedLocation(suggestion);
    setLocationSearchValue(suggestion.location_number);
    setLocationSearchOpen(false);

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

  const clearLocationSelection = () => {
    setSelectedLocation(null);
    setLocationSearchValue('');
    form.setValue('partner_location_number', '');
    form.setValue('store_location', '');
    form.setValue('location_street_address', '');
    form.setValue('location_city', '');
    form.setValue('location_state', '');
    form.setValue('location_zip_code', '');
  };

  const watchedLocationNumber = form.watch('partner_location_number');
  const showLocationDetails = watchedLocationNumber || selectedLocation;

  return (
    <div className={cn("space-y-6", className)}>
      <Collapsible open={isReferenceOpen} onOpenChange={setIsReferenceOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between"
            type="button"
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Partner Reference Information
            </div>
            <span className={cn("transition-transform", isReferenceOpen && "rotate-180")}>
              ▼
            </span>
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {showPoNumber && (
              <FormField
                control={form.control}
                name="partner_po_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      PO Number
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Purchase order number" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="partner_location_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location Number
                  </FormLabel>
                  <FormControl>
                    <Popover open={locationSearchOpen} onOpenChange={setLocationSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={locationSearchOpen}
                          className="w-full justify-between"
                          type="button"
                        >
                          {field.value ? field.value : "Search location..."}
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
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </FormControl>
                  <FormMessage />
                  {selectedLocation && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={clearLocationSelection}
                      >
                        Clear Selection
                      </Button>
                      {selectedLocation.full_address && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a 
                            href={getDirectionsUrl(selectedLocation)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Directions
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                </FormItem>
              )}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {showLocationDetails && (
        <Card>
          <CardContent className="pt-6">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location Details
            </h4>
            
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="store_location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Bob's Burgers" 
                        {...field} 
                      />
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
                      <Input 
                        placeholder="123 Main Street" 
                        {...field} 
                      />
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
                        <Input 
                          placeholder="City" 
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
                      <FormLabel>State</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="State" />
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
                        <Input 
                          placeholder="12345" 
                          pattern="^\d{5}(-\d{4})?$"
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
    </div>
  );
}
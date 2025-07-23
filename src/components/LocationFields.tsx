
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FormattedInput } from "@/components/ui/formatted-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { usePartnerLocations } from '@/hooks/usePartnerLocations';
import { US_STATES } from '@/constants/states';

interface LocationFieldsProps {
  form: UseFormReturn<any>;
  organizationId?: string;
  showPoNumber?: boolean;
}

export function LocationFields({ form, organizationId, showPoNumber = false }: LocationFieldsProps) {
  const { data: partnerLocations, isLoading: loadingLocations, error: locationsError, refetch: refetchLocations } = usePartnerLocations(organizationId);

  const partnerLocationSelection = form.watch('partner_location_selection');
  
  // Auto-enable manual entry when no locations exist and loading is complete
  const hasNoLocations = !loadingLocations && !locationsError && partnerLocations?.length === 0;
  const showManualEntry = partnerLocationSelection === 'add_new' || hasNoLocations;
  
  // Auto-set to 'add_new' when no locations exist
  React.useEffect(() => {
    if (hasNoLocations && !partnerLocationSelection && organizationId) {
      form.setValue('partner_location_selection', 'add_new');
    }
  }, [hasNoLocations, partnerLocationSelection, organizationId, form]);

  return (
    <div className="space-y-4">
      {/* Partner Location Selection */}
      {organizationId && (
        <FormField
          control={form.control}
          name="partner_location_selection"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select Location</FormLabel>
              {loadingLocations ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <FormDescription>Loading your saved locations...</FormDescription>
                </div>
              ) : locationsError ? (
                <div className="space-y-2">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Failed to load saved locations.
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="ml-2"
                        onClick={() => refetchLocations()}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Retry
                      </Button>
                    </AlertDescription>
                  </Alert>
                  <FormDescription>You can still enter location details manually below</FormDescription>
                </div>
              ) : partnerLocations && partnerLocations.length > 0 ? (
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a location or add new" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {partnerLocations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.location_name} ({location.location_number})
                      </SelectItem>
                    ))}
                    <SelectItem value="add_new">Add New Location</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">No saved locations found. You can enter location details below.</p>
                </div>
              )}
              <FormDescription>
                Choose from your saved locations or add a new one
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Manual Location Entry */}
      {showManualEntry && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="store_location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Downtown Office" {...field} />
                  </FormControl>
                  <FormDescription>
                    Enter a descriptive name for this location
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="partner_location_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Code</FormLabel>
                  <FormControl>
                    <Input placeholder="001" {...field} />
                  </FormControl>
                  <FormDescription>
                    Your internal location code (if applicable)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Address Fields */}
          <FormField
            control={form.control}
            name="location_street_address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Street Address</FormLabel>
                <FormControl>
                  <FormattedInput 
                    formatter="streetAddress"
                    placeholder="123 Main Street" 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  Enter the physical address where work will be performed
                </FormDescription>
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
                    <FormattedInput 
                      formatter="city"
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
                    <FormattedInput 
                      formatter="zip"
                      placeholder="12345 or 12345-6789" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Location Contact Fields */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="location_contact_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Contact Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Site Manager Name" {...field} />
                  </FormControl>
                  <FormDescription>
                    Name of the person to contact at this location
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location_contact_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Contact Email</FormLabel>
                  <FormControl>
                    <FormattedInput 
                      formatter="email"
                      placeholder="site@company.com" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Email address for coordination and updates
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location_contact_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Contact Phone</FormLabel>
                  <FormControl>
                    <FormattedInput 
                      formatter="phone"
                      placeholder="(555) 123-4567" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Phone number for urgent coordination
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </>
      )}

      {/* PO Number */}
      {showPoNumber && (
        <FormField
          control={form.control}
          name="partner_po_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>PO Number</FormLabel>
              <FormControl>
                <Input placeholder="PO-12345" {...field} />
              </FormControl>
              <FormDescription>
                Your purchase order number for this work (optional)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}

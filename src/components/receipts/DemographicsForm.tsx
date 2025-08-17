import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ReceiptDemographics } from '@/types/receipt';

interface DemographicsFormProps {
  demographics: ReceiptDemographics;
  onChange: (demographics: ReceiptDemographics) => void;
  className?: string;
}

export function DemographicsForm({ demographics, onChange, className }: DemographicsFormProps) {
  const updateField = (field: keyof ReceiptDemographics, value: any) => {
    onChange({ ...demographics, [field]: value });
  };

  return (
    <div className={className}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="age-range">Customer Age Range</Label>
            <Select value={demographics.customer_age_range || ''} onValueChange={(value) => updateField('customer_age_range', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select age range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="18-25">18-25</SelectItem>
                <SelectItem value="26-35">26-35</SelectItem>
                <SelectItem value="36-45">36-45</SelectItem>
                <SelectItem value="46-55">46-55</SelectItem>
                <SelectItem value="56-65">56-65</SelectItem>
                <SelectItem value="65+">65+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Customer Gender</Label>
            <Select value={demographics.customer_gender || ''} onValueChange={(value) => updateField('customer_gender', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="location">Location Context</Label>
            <Input
              id="location"
              value={demographics.location_context || ''}
              onChange={(e) => updateField('location_context', e.target.value)}
              placeholder="e.g., Downtown, Shopping Mall, Airport"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Purchase Category</Label>
            <Select value={demographics.purchase_category || ''} onValueChange={(value) => updateField('purchase_category', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="food-beverage">Food & Beverage</SelectItem>
                <SelectItem value="office-supplies">Office Supplies</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="travel">Travel</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="payment">Payment Method</Label>
            <Select value={demographics.payment_method || ''} onValueChange={(value) => updateField('payment_method', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="credit-card">Credit Card</SelectItem>
                <SelectItem value="debit-card">Debit Card</SelectItem>
                <SelectItem value="mobile-payment">Mobile Payment</SelectItem>
                <SelectItem value="company-card">Company Card</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="weather">Weather Condition</Label>
            <Select value={demographics.weather_condition || ''} onValueChange={(value) => updateField('weather_condition', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select weather" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sunny">Sunny</SelectItem>
                <SelectItem value="rainy">Rainy</SelectItem>
                <SelectItem value="cloudy">Cloudy</SelectItem>
                <SelectItem value="snowy">Snowy</SelectItem>
                <SelectItem value="stormy">Stormy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch 
            id="rush-hour"
            checked={demographics.rush_hour || false}
            onCheckedChange={(checked) => updateField('rush_hour', checked)}
          />
          <Label htmlFor="rush-hour">Rush hour purchase</Label>
        </div>
      </div>
    </div>
  );
}
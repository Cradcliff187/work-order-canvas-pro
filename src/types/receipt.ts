export interface ReceiptDemographics {
  customer_age_range?: string;
  customer_gender?: string;
  location_context?: string;
  purchase_category?: string;
  rush_hour?: boolean;
  weather_condition?: string;
  payment_method?: string;
}

export interface ReceiptWithDemographics {
  id: string;
  vendor_name: string;
  amount: number;
  receipt_date: string;
  demographics?: ReceiptDemographics;
  description?: string;
  notes?: string;
}
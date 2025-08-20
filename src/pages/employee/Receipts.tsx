import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { 
  Upload, 
  Receipt as ReceiptIcon, 
  Calendar,
  DollarSign,
  FileText,
  Plus,
  Image as ImageIcon
} from 'lucide-react';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

interface Receipt {
  id: string;
  vendor_name: string;
  amount: number;
  description: string;
  receipt_date: string;
  receipt_image_url?: string;
  created_at: string;
}

export default function EmployeeReceipts() {
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const [isUploading, setIsUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    vendor_name: '',
    amount: '',
    description: '',
    receipt_date: new Date().toISOString().split('T')[0],
    receipt_image: null as File | null
  });

  // Fetch employee receipts
  const receiptsQuery = useQuery({
    queryKey: ['employee-receipts', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('employee_user_id', profile.id)
        .order('receipt_date', { ascending: false });

      if (error) throw error;
      return data as Receipt[];
    },
    enabled: !!profile?.id
  });

  // Calculate statistics
  const receipts = receiptsQuery.data || [];
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const thisMonthReceipts = receipts.filter(receipt => {
    const receiptDate = new Date(receipt.receipt_date);
    return receiptDate.getMonth() === currentMonth && receiptDate.getFullYear() === currentYear;
  });
  
  const thisMonthTotal = thisMonthReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    setIsUploading(true);
    try {
      let imageUrl = null;

      // Upload image if provided
      if (formData.receipt_image) {
        const fileExt = formData.receipt_image.name.split('.').pop();
        const fileName = `${profile.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, formData.receipt_image);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
      }

      // Insert receipt record
      const { error } = await supabase
        .from('receipts')
        .insert({
          employee_user_id: profile.id,
          vendor_name: formData.vendor_name,
          amount: parseFloat(formData.amount),
          description: formData.description,
          receipt_date: formData.receipt_date,
          receipt_image_url: imageUrl
        });

      if (error) throw error;

      toast.success('Receipt uploaded successfully');
      receiptsQuery.refetch();
      setShowForm(false);
      setFormData({
        vendor_name: '',
        amount: '',
        description: '',
        receipt_date: new Date().toISOString().split('T')[0],
        receipt_image: null
      });
    } catch (error) {
      console.error('Error uploading receipt:', error);
      toast.error('Failed to upload receipt');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, receipt_image: file }));
    }
  };

  if (receiptsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Receipts</h1>
          <p className="text-muted-foreground">
            Upload and manage your expense receipts
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Receipt
        </Button>
      </div>

      {/* Upload Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Upload New Receipt</CardTitle>
            <CardDescription>
              Add a new expense receipt to your records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vendor">Vendor Name</Label>
                  <Input
                    id="vendor"
                    value={formData.vendor_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, vendor_name: e.target.value }))}
                    placeholder="Store or vendor name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="date">Receipt Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.receipt_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, receipt_date: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the expense"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Receipt Image (Optional)</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? 'Uploading...' : 'Upload Receipt'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisMonthReceipts.length}</div>
            <p className="text-xs text-muted-foreground">
              Receipts submitted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${thisMonthTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              This month's expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receipts</CardTitle>
            <ReceiptIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{receipts.length}</div>
            <p className="text-xs text-muted-foreground">
              All time receipts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Receipts List */}
      <Card>
        <CardHeader>
          <CardTitle>Receipt History</CardTitle>
          <CardDescription>Your submitted expense receipts</CardDescription>
        </CardHeader>
        <CardContent>
          {receipts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ReceiptIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No receipts uploaded yet.</p>
              <p className="text-sm">Upload your first receipt to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {receipts.map((receipt) => (
                isMobile ? (
                  <MobileTableCard
                    key={receipt.id}
                    title={receipt.vendor_name}
                    subtitle={format(new Date(receipt.receipt_date), 'MMM d, yyyy')}
                    status={
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg">${receipt.amount.toFixed(2)}</span>
                        {receipt.receipt_image_url && (
                          <Badge variant="secondary" className="text-xs">
                            <ImageIcon className="h-3 w-3 mr-1" />
                            Image
                          </Badge>
                        )}
                      </div>
                    }
                  >
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {receipt.description}
                    </div>
                  </MobileTableCard>
                ) : (
                  <div key={receipt.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{receipt.vendor_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(receipt.receipt_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      {receipt.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {receipt.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-mono text-lg font-semibold">
                          ${receipt.amount.toFixed(2)}
                        </p>
                      </div>
                      {receipt.receipt_image_url && (
                        <Badge variant="secondary">
                          <ImageIcon className="h-3 w-3 mr-1" />
                          Image
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
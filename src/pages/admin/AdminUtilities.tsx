import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FixWorkOrderNumbersButton } from '@/components/admin/FixWorkOrderNumbersButton';
import { FixWorkOrderSequencesButton } from '@/components/admin/work-orders/FixWorkOrderSequencesButton';

export default function AdminUtilities() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Admin Utilities</h1>
        <p className="text-muted-foreground">
          Administrative tools and utilities for system maintenance
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Work Order Numbers</CardTitle>
          </CardHeader>
          <CardContent>
            <FixWorkOrderNumbersButton />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fix Sequence Numbers</CardTitle>
          </CardHeader>
          <CardContent>
            <FixWorkOrderSequencesButton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
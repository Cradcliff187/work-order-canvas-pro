import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function WorkOrderNumberTest() {
  const [organizationId, setOrganizationId] = useState('');
  const [locationNumber, setLocationNumber] = useState('');
  const [sequenceNumber, setSequenceNumber] = useState('1');

  const generatedWorkOrderNumber = organizationId ? `${organizationId}-${locationNumber}-${sequenceNumber.padStart(3, '0')}` : '';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Work Order Number Generator Test</CardTitle>
        <CardDescription>
          Test the work order number generation logic
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="organization">Organization ID</Label>
            <Input
              id="organization"
              placeholder="Enter organization ID"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="location-code">Location Code</Label>
            <Input
              id="location-code"
              placeholder="Enter location code"
              value={locationNumber}
              onChange={(e) => setLocationNumber(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="sequence">Sequence Number</Label>
            <Input
              id="sequence"
              type="number"
              min="1"
              placeholder="1"
              value={sequenceNumber}
              onChange={(e) => setSequenceNumber(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label>Generated Work Order Number</Label>
          <Input
            readOnly
            value={generatedWorkOrderNumber}
          />
        </div>
      </CardContent>
    </Card>
  );
}

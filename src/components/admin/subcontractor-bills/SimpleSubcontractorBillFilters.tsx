import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SubcontractorBillFiltersValue } from "@/types/subcontractor-bills";
import { useSubcontractorOrganizations } from "@/hooks/useSubcontractorOrganizations";

interface SimpleSubcontractorBillFiltersProps {
  value: SubcontractorBillFiltersValue;
  onChange: (filters: SubcontractorBillFiltersValue) => void;
  onClear?: () => void;
}

const statusOptions = [
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "paid", label: "Paid" },
];

export function SimpleSubcontractorBillFilters({
  value,
  onChange,
  onClear,
}: SimpleSubcontractorBillFiltersProps) {
  const { data: subcontractorOrganizations } = useSubcontractorOrganizations();

  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card border rounded-lg">
      <div className="flex-1">
        <Input
          placeholder="Search by bill number or amount..."
          value={value.search || ""}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          className="w-full"
        />
      </div>
      
      <div className="flex-1">
        <Select
          value={value.subcontractor_id || "all"}
          onValueChange={(val) => onChange({ ...value, subcontractor_id: val === "all" ? undefined : val })}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Subcontractors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subcontractors</SelectItem>
            {subcontractorOrganizations?.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1">
        <Select
          value={value.status || "all"}
          onValueChange={(val) => onChange({ ...value, status: val === "all" ? undefined : val })}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statusOptions.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="overdue"
          checked={value.overdue || false}
          onCheckedChange={(checked) => onChange({ ...value, overdue: !!checked })}
        />
        <Label htmlFor="overdue" className="text-sm font-medium">
          Overdue only
        </Label>
      </div>

      {onClear && (
        <div className="flex items-center">
          <button
            onClick={onClear}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
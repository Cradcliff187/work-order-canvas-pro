import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BulkRoleAssignProps {
  selectedCount: number;
  onAssign: (role: string) => void;
}

export function BulkRoleAssign({ selectedCount, onAssign }: BulkRoleAssignProps) {
  const [role, setRole] = React.useState<string>("");

  return (
    <div className="flex items-center gap-2">
      <Select value={role} onValueChange={setRole}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="employee">Employee</SelectItem>
          <SelectItem value="partner">Partner</SelectItem>
          <SelectItem value="subcontractor">Subcontractor</SelectItem>
        </SelectContent>
      </Select>
      <Button
        disabled={!role}
        onClick={() => role && onAssign(role)}
      >
        Assign to {selectedCount} selected
      </Button>
    </div>
  );
}

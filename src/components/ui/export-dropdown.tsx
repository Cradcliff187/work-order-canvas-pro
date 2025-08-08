import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ExportDropdownProps {
  onExport: (format: 'csv' | 'excel') => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  disabled?: boolean;
  loading?: boolean;
}

export function ExportDropdown({ 
  onExport, 
  variant = 'outline',
  size = 'default',
  disabled = false,
  loading = false
}: ExportDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          disabled={disabled || loading}
          aria-label="Export data"
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-50 bg-popover min-w-[220px]">
        <DropdownMenuItem
          onClick={() => onExport('csv')}
          disabled={loading}
          role="menuitem"
        >
          <FileText className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onExport('excel')}
          disabled={loading}
          role="menuitem"
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import { useBranding } from "@/hooks/useBranding";
import { UserDropdown } from "./UserDropdown";

export const StandardHeader = () => {
  const branding = useBranding();

  return (
    <div className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <img 
          src={branding.assets.logos.horizontal} 
          alt={branding.company.name}
          className="h-8 w-auto"
        />
        <div className="text-lg font-semibold text-foreground">
          WorkOrderPortal
        </div>
      </div>
      
      <UserDropdown />
    </div>
  );
};

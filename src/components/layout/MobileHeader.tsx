import { useBranding } from "@/hooks/useBranding";
import { UserDropdown } from "./UserDropdown";

export const MobileHeader = () => {
  const branding = useBranding();

  return (
    <div className="h-auto border-b border-border bg-primary/5 flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <img 
          src={branding.assets.logos.horizontal} 
          alt={branding.company.name}
          className="h-6 w-auto object-contain"
        />
        <div className="flex flex-col">
          <div className="text-base font-semibold text-foreground leading-tight">
            {branding.getProductDisplayName()}
          </div>
          <div className="text-sm text-muted-foreground leading-tight">
            {branding.getCompanyDisplayName()}
          </div>
        </div>
      </div>
      
      <div className="flex-shrink-0">
        <UserDropdown />
      </div>
    </div>
  );
};
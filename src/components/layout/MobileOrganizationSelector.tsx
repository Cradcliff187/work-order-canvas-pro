import React, { useState } from 'react';
import { Building2, ChevronDown, Search, Users, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { UserOrganization } from '@/hooks/useUserOrganizations';

interface MobileOrganizationSelectorProps {
  organizations: UserOrganization[];
  currentOrganization?: UserOrganization;
  onOrganizationChange?: (org: UserOrganization) => void;
  className?: string;
}

const getOrganizationIcon = (type: string) => {
  switch (type) {
    case 'partner':
      return Building2;
    case 'subcontractor':
      return Users;
    case 'internal':
      return Briefcase;
    default:
      return Building2;
  }
};

const getOrganizationTypeColor = (type: string) => {
  switch (type) {
    case 'partner':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-300';
    case 'subcontractor':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-300';
    case 'internal':
      return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300';
  }
};

const truncateOrgName = (name: string, maxLength: number = 25): string => {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength) + '...';
};

export const MobileOrganizationSelector: React.FC<MobileOrganizationSelectorProps> = ({
  organizations,
  currentOrganization,
  onOrganizationChange,
  className
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  if (!currentOrganization) return null;

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.contact_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasMultipleOrganizations = organizations.length > 1;
  const shouldShowSearch = organizations.length > 5;
  const Icon = getOrganizationIcon(currentOrganization.organization_type);

  const handleOrganizationSelect = (org: UserOrganization) => {
    onOrganizationChange?.(org);
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <div 
          className={cn(
            "flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20 cursor-pointer active:bg-primary/10 transition-all duration-200",
            className
          )}
        >
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-medium truncate">
                {truncateOrgName(currentOrganization.name)}
              </h2>
              {hasMultipleOrganizations && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary border-primary/30">
                  {organizations.length}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              ID: {currentOrganization.initials || 'Not configured'}
            </p>
          </div>
          <div className="flex-shrink-0">
            <ChevronDown className={cn(
              "h-5 w-5 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </div>
        </div>
      </SheetTrigger>

      <SheetContent side="bottom" className="max-h-[85vh] overflow-hidden">
        <SheetHeader className="pb-4">
          <SheetTitle>Organizations</SheetTitle>
          <SheetDescription>
            {hasMultipleOrganizations 
              ? "Select an organization to view its work orders"
              : "Your organization details"
            }
          </SheetDescription>
        </SheetHeader>

        {shouldShowSearch && (
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        <div className="space-y-3 overflow-y-auto max-h-[50vh]">
          {filteredOrganizations.map((org) => {
            const OrgIcon = getOrganizationIcon(org.organization_type);
            const isSelected = org.id === currentOrganization.id;
            
            return (
              <div
                key={org.id}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border transition-all duration-200",
                  isSelected 
                    ? "bg-primary/10 border-primary/30" 
                    : "bg-background border-border hover:bg-muted/50",
                  hasMultipleOrganizations && "cursor-pointer active:scale-[0.98]"
                )}
                onClick={() => hasMultipleOrganizations && handleOrganizationSelect(org)}
              >
                <div className={cn(
                  "h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0",
                  isSelected ? "bg-primary/20" : "bg-muted"
                )}>
                  <OrgIcon className={cn(
                    "h-6 w-6",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-base truncate">{org.name}</h3>
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs px-2 py-0.5", getOrganizationTypeColor(org.organization_type))}
                    >
                      {org.organization_type}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      ID: {org.initials || 'Not configured'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {org.contact_email}
                    </p>
                    {org.contact_phone && (
                      <p className="text-xs text-muted-foreground">
                        {org.contact_phone}
                      </p>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <div className="flex-shrink-0">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredOrganizations.length === 0 && searchQuery && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No organizations found matching "{searchQuery}"</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
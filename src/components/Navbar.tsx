
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/hooks/useBranding';
import { LogOut, Settings, User } from 'lucide-react';

const Navbar = () => {
  const { viewingProfile, signOut } = useAuth();
  const { getProductDisplayName, getCompanyDisplayName, assets } = useBranding();

  const handleSignOut = async () => {
    await signOut();
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'admin': return 'text-destructive';
      case 'employee': return 'text-blue-600';
      case 'partner': return 'text-primary';
      case 'subcontractor': return 'text-secondary';
      default: return 'text-muted-foreground';
    }
  };

  const formatUserType = (userType: string) => {
    return userType.charAt(0).toUpperCase() + userType.slice(1);
  };

  const getProfilePath = () => {
    switch (viewingProfile?.user_type) {
      case 'admin': return '/admin/profile';
      case 'employee': return '/admin/profile';
      case 'partner': return '/partner/profile';
      case 'subcontractor': return '/subcontractor/profile';
      default: return '/admin/profile';
    }
  };

  return (
    <nav className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex h-16 items-center px-6">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <img 
            src={assets.logos.horizontal} 
            alt={`${getCompanyDisplayName()} Logo`}
            className="h-8 w-auto"
          />
          <div className="hidden sm:flex flex-col">
            <span className="font-bold text-xl">{getProductDisplayName()}</span>
            <span className="text-xs text-muted-foreground">{getCompanyDisplayName()}</span>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={viewingProfile?.avatar_url} alt={viewingProfile?.first_name} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {viewingProfile ? getInitials(viewingProfile.first_name, viewingProfile.last_name) : 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {viewingProfile?.first_name} {viewingProfile?.last_name}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {viewingProfile?.email}
                </p>
                <p className={`text-xs leading-none font-medium ${getUserTypeColor(viewingProfile?.user_type || '')}`}>
                  {formatUserType(viewingProfile?.user_type || '')}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to={getProfilePath()} className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                <span>Profile Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
};

export default Navbar;

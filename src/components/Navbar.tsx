
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
import { useUserProfile } from '@/hooks/useUserProfile';

const Navbar = () => {
  const { profile, signOut } = useAuth();
  const { primaryRole, isAdmin, isEmployee, isPartner, isSubcontractor } = useUserProfile();
  const { getProductDisplayName, getCompanyDisplayName, assets } = useBranding();

  const handleSignOut = async () => {
    await signOut();
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleColor = () => {
    if (isAdmin()) return 'text-destructive';
    if (isEmployee()) return 'text-blue-600';
    if (isPartner()) return 'text-primary';
    if (isSubcontractor()) return 'text-secondary';
    return 'text-muted-foreground';
  };

  const formatRole = () => {
    return primaryRole ? primaryRole.charAt(0).toUpperCase() + primaryRole.slice(1) : 'Unknown';
  };

  const getProfilePath = () => {
    if (isAdmin() || isEmployee()) {
      return '/admin/profile';
    } else if (isPartner()) {
      return '/partner/profile';
    } else if (isSubcontractor()) {
      return '/subcontractor/profile';
    }
    return '/admin/profile';
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
                <AvatarImage src={profile?.avatar_url} alt={profile?.first_name} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {profile ? getInitials(profile.first_name, profile.last_name) : 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {profile?.first_name} {profile?.last_name}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {profile?.email}
                </p>
                <p className={`text-xs leading-none font-medium ${getRoleColor()}`}>
                  {formatRole()}
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

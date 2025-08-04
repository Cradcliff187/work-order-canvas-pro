import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, Phone, Mail, Edit, Trash2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type PartnerLocation = Tables<'partner_locations'>;

interface LocationCardProps {
  location: PartnerLocation;
  onEdit: (location: PartnerLocation) => void;
  onDelete: (location: PartnerLocation) => void;
}

export function LocationCard({ location, onEdit, onDelete }: LocationCardProps) {
  const formatAddress = () => {
    const addressParts = [
      location.street_address,
      location.city,
      location.state,
      location.zip_code,
    ].filter(Boolean);
    
    return addressParts.length > 0 ? addressParts.join(', ') : null;
  };

  const address = formatAddress();

  return (
    <Card className="transition-all duration-200 border-border hover:shadow-md hover:border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{location.location_name}</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              #{location.location_number}
            </p>
          </div>
          <Badge variant={location.is_active ? 'default' : 'secondary'}>
            {location.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Address */}
        {address && (
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <span className="text-sm text-muted-foreground">{address}</span>
          </div>
        )}

        {/* Contact Info */}
        {(location.contact_name || location.contact_email || location.contact_phone) && (
          <div className="space-y-1">
            {location.contact_name && (
              <div className="text-sm font-medium">{location.contact_name}</div>
            )}
            {location.contact_email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span className="truncate">{location.contact_email}</span>
              </div>
            )}
            {location.contact_phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{location.contact_phone}</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(location)}
            className="flex-1"
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(location)}
            className="flex-1 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
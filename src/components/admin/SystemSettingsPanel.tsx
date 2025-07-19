
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, Key } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const SystemSettingsPanel = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [serviceKey, setServiceKey] = React.useState('');
  const [emailSettings, setEmailSettings] = React.useState({
    ionos_smtp_user: '',
    ionos_smtp_pass: '',
    from_email: 'support@workorderportal.com',
    from_name: 'WorkOrderPro'
  });

  React.useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      
      // Load system settings
      const { data: settings } = await supabase
        .from('system_settings')
        .select('*')
        .in('setting_key', ['service_role_key', 'ionos_smtp_user', 'ionos_smtp_pass', 'from_email', 'from_name']);

      if (settings) {
        settings.forEach(setting => {
          if (setting.setting_key === 'service_role_key') {
            const keyValue = setting.setting_value as any;
            setServiceKey(keyValue?.key || '');
          } else if (setting.setting_key in emailSettings) {
            const settingValue = setting.setting_value as any;
            setEmailSettings(prev => ({
              ...prev,
              [setting.setting_key]: settingValue?.value || ''
            }));
          }
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load system settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveServiceKey = async () => {
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          category: 'system',
          setting_key: 'service_role_key',
          setting_value: { key: serviceKey },
          description: 'Supabase service role key for email triggers',
          updated_by_user_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Service role key saved successfully',
      });
    } catch (error) {
      console.error('Error saving service key:', error);
      toast({
        title: 'Error',
        description: 'Failed to save service role key',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveEmailSettings = async () => {
    try {
      setIsLoading(true);
      
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      const settingsToSave = Object.entries(emailSettings).map(([key, value]) => ({
        category: 'email',
        setting_key: key,
        setting_value: { value },
        description: `Email setting: ${key}`,
        updated_by_user_id: userId
      }));

      const { error } = await supabase
        .from('system_settings')
        .upsert(settingsToSave);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Email settings saved successfully',
      });
    } catch (error) {
      console.error('Error saving email settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save email settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !serviceKey && !emailSettings.from_email) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">System Settings</h2>
        <p className="text-muted-foreground">Configure system-wide settings for email notifications</p>
      </div>

      <Alert>
        <Key className="h-4 w-4" />
        <AlertDescription>
          The service role key is required for database triggers to send emails automatically.
          You can find your service role key in your Supabase dashboard under Settings → API.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Service Role Key</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="service_key">Supabase Service Role Key</Label>
            <Input
              id="service_key"
              type="password"
              value={serviceKey}
              onChange={(e) => setServiceKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            />
          </div>
          
          <Button onClick={saveServiceKey} disabled={isLoading || !serviceKey}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Service Key
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ionos_user">IONOS SMTP Username</Label>
              <Input
                id="ionos_user"
                value={emailSettings.ionos_smtp_user}
                onChange={(e) => setEmailSettings(prev => ({ ...prev, ionos_smtp_user: e.target.value }))}
                placeholder="support@workorderportal.com"
              />
            </div>
            
            <div>
              <Label htmlFor="ionos_pass">IONOS SMTP Password</Label>
              <Input
                id="ionos_pass"
                type="password"
                value={emailSettings.ionos_smtp_pass}
                onChange={(e) => setEmailSettings(prev => ({ ...prev, ionos_smtp_pass: e.target.value }))}
                placeholder="••••••••"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="from_email">From Email</Label>
              <Input
                id="from_email"
                type="email"
                value={emailSettings.from_email}
                onChange={(e) => setEmailSettings(prev => ({ ...prev, from_email: e.target.value }))}
                placeholder="support@workorderportal.com"
              />
            </div>
            
            <div>
              <Label htmlFor="from_name">From Name</Label>
              <Input
                id="from_name"
                value={emailSettings.from_name}
                onChange={(e) => setEmailSettings(prev => ({ ...prev, from_name: e.target.value }))}
                placeholder="WorkOrderPro"
              />
            </div>
          </div>
          
          <Button onClick={saveEmailSettings} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Email Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemSettingsPanel;

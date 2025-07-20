
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmailTestPanel } from '@/components/admin/EmailTestPanel';
import { SimpleEmailTest } from '@/components/admin/SimpleEmailTest';
import { EmailSystemTester } from '@/components/admin/EmailSystemTester';
import { ComprehensiveEmailTester } from '@/components/admin/ComprehensiveEmailTester';
import { Mail, TestTube, Send, Settings, Zap } from 'lucide-react';

const EmailTest = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Email System Testing</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive testing suite for the email system including templates, triggers, and delivery
        </p>
      </div>

      <Tabs defaultValue="comprehensive-v2" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="comprehensive-v2" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Quick Test
          </TabsTrigger>
          <TabsTrigger value="comprehensive" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            System Tests
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Template Tests
          </TabsTrigger>
          <TabsTrigger value="simple" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            SMTP Tests
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comprehensive-v2">
          <ComprehensiveEmailTester />
        </TabsContent>

        <TabsContent value="comprehensive">
          <EmailSystemTester />
        </TabsContent>

        <TabsContent value="templates">
          <EmailTestPanel />
        </TabsContent>

        <TabsContent value="simple">
          <SimpleEmailTest />
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Email System Configuration</CardTitle>
              <CardDescription>
                Email system settings and configuration options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm space-y-2">
                <div><strong>SMTP Provider:</strong> IONOS (port 465, SSL)</div>
                <div><strong>Function Status:</strong> Public (verify_jwt = false)</div>
                <div><strong>Database Triggers:</strong> Active for all email events</div>
                <div><strong>Email Templates:</strong> Auto-created if missing</div>
                <div><strong>URL Generation:</strong> Dynamic based on environment</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmailTest;

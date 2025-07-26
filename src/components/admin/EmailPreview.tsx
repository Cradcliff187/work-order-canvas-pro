
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Smartphone, Monitor, Copy, Eye } from 'lucide-react';
import { useTemplatePreview } from '@/hooks/useTemplatePreview';
import { useToast } from '@/hooks/use-toast';
import DOMPurify from 'dompurify';

interface EmailPreviewProps {
  templateName: string;
  htmlContent: string;
  variables: string[];
}

export const EmailPreview: React.FC<EmailPreviewProps> = ({
  templateName,
  htmlContent,
  variables,
}) => {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const { interpolateTemplate, getAvailableVariables } = useTemplatePreview();
  const { toast } = useToast();

  const interpolatedContent = interpolateTemplate(htmlContent);
  
  // Sanitize the HTML content to prevent XSS attacks
  const sanitizedContent = DOMPurify.sanitize(interpolatedContent, {
    // Allow common email HTML elements and attributes
    ALLOWED_TAGS: [
      'div', 'span', 'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'img', 
      'table', 'tr', 'td', 'th', 'tbody', 'thead', 'tfoot',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
      'blockquote', 'pre', 'code', 'hr'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'style', 'class', 'id',
      'width', 'height', 'border', 'cellpadding', 'cellspacing',
      'align', 'valign', 'bgcolor', 'color'
    ],
    // Remove any script tags and event handlers
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus']
  });
  
  const availableVariables = getAvailableVariables();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied',
        description: 'Content copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="preview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="variables">Variables</TabsTrigger>
          <TabsTrigger value="source">Source</TabsTrigger>
        </TabsList>
        
        <TabsContent value="preview" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'desktop' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('desktop')}
              >
                <Monitor className="h-4 w-4 mr-2" />
                Desktop
              </Button>
              <Button
                variant={viewMode === 'mobile' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('mobile')}
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Mobile
              </Button>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(sanitizedContent)}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy HTML
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <div className="text-sm text-muted-foreground">Template:</div>
              <div className="font-medium">{templateName}</div>
            </CardHeader>
            <CardContent>
              <div
                className={`border rounded-lg overflow-hidden transition-all duration-200 ${
                  viewMode === 'mobile' ? 'max-w-sm mx-auto' : 'w-full'
                }`}
              >
                <div
                  className="p-4 min-h-[400px] bg-white"
                  dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Available Variables
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(availableVariables).map(([category, categoryVariables]) => (
                <div key={category}>
                  <h4 className="font-medium mb-2 capitalize">
                    {category.replace('_', ' ')} Variables
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {categoryVariables.map((variable) => (
                      <Badge
                        key={variable}
                        variant="secondary"
                        className="font-mono cursor-pointer"
                        onClick={() => copyToClipboard(`{{${variable}}}`)}
                      >
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
              
              {variables.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Template Variables</h4>
                  <div className="flex flex-wrap gap-2">
                    {variables.map((variable, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="font-mono cursor-pointer"
                        onClick={() => copyToClipboard(variable)}
                      >
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="source" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>HTML Source</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(sanitizedContent)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm whitespace-pre-wrap">
                {sanitizedContent}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

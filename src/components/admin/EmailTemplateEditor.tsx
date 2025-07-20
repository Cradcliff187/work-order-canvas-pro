
import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Save, 
  X, 
  Trash2, 
  Eye,
  Edit
} from 'lucide-react';
import { VariableInserter } from './VariableInserter';
import { EmailPreview } from './EmailPreview';
import { useTemplatePreview } from '@/hooks/useTemplatePreview';
import type { Tables } from '@/integrations/supabase/types';

type EmailTemplate = Tables<'email_templates'>;

interface EmailTemplateEditorProps {
  template?: EmailTemplate;
  mode?: 'view' | 'edit' | 'create';
  onSave: (data: Partial<EmailTemplate>) => void;
  onCancel: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isLoading?: boolean;
}

export const EmailTemplateEditor: React.FC<EmailTemplateEditorProps> = ({
  template,
  mode = template ? 'edit' : 'create',
  onSave,
  onCancel,
  onEdit,
  onDelete,
  isLoading = false,
}) => {
  const [templateName, setTemplateName] = useState(template?.template_name || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [htmlContent, setHtmlContent] = useState(template?.html_content || '');
  const [isActive, setIsActive] = useState(template?.is_active ?? true);
  const [activeTab, setActiveTab] = useState(mode === 'view' ? 'preview' : 'editor');
  
  const isViewMode = mode === 'view';
  
  const { stripHtml } = useTemplatePreview();

  const editor = useEditor({
    extensions: [StarterKit],
    content: htmlContent,
    editable: !isViewMode,
    onUpdate: ({ editor }) => {
      if (!isViewMode) {
        setHtmlContent(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4 ${isViewMode ? 'bg-muted/50' : ''}`,
      },
    },
  });

  useEffect(() => {
    if (editor && template?.html_content !== htmlContent) {
      editor.commands.setContent(template?.html_content || '');
    }
  }, [template, editor]);

  const handleVariableInsert = (variable: string) => {
    if (editor) {
      editor.chain().focus().insertContent(variable).run();
    }
  };

  const handleSubjectVariableInsert = (variable: string) => {
    setSubject(prev => prev + variable);
  };

  const handleSave = () => {
    const textContent = stripHtml(htmlContent);
    
    const templateData = {
      template_name: templateName,
      subject,
      html_content: htmlContent,
      text_content: textContent,
      is_active: isActive,
    };

    onSave(templateData);
  };

  const isFormValid = templateName.trim() && subject.trim() && htmlContent.trim();

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  // Extract variables from htmlContent for preview
  const extractedVariables = htmlContent.match(/{{[^}]+}}/g) || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {isViewMode ? 'View Email Template' : template ? 'Edit Email Template' : 'Create Email Template'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., work_order_assigned"
                disabled={isViewMode || !!template} // Don't allow editing name for existing templates or in view mode
                readOnly={isViewMode}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="is-active"
                checked={isActive}
                onCheckedChange={setIsActive}
                disabled={isViewMode}
              />
              <Label htmlFor="is-active">Active</Label>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="subject">Subject Line</Label>
              {!isViewMode && <VariableInserter onInsertVariable={handleSubjectVariableInsert} />}
            </div>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Work Order Assignment: {{work_order_number}}"
              disabled={isViewMode}
              readOnly={isViewMode}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Label>Email Content</Label>
                {!isViewMode && (
                  <div className="flex items-center space-x-2">
                    <VariableInserter onInsertVariable={handleVariableInsert} />
                    <Separator orientation="vertical" className="h-6" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => editor.chain().focus().toggleBold().run()}
                      className={editor.isActive('bold') ? 'bg-accent' : ''}
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => editor.chain().focus().toggleItalic().run()}
                      className={editor.isActive('italic') ? 'bg-accent' : ''}
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => editor.chain().focus().toggleBulletList().run()}
                      className={editor.isActive('bulletList') ? 'bg-accent' : ''}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => editor.chain().focus().toggleOrderedList().run()}
                      className={editor.isActive('orderedList') ? 'bg-accent' : ''}
                    >
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <EditorContent editor={editor} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <EmailPreview
            templateName={templateName}
            htmlContent={htmlContent}
            variables={extractedVariables}
          />
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {onDelete && template && !isViewMode && (
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            <X className="h-4 w-4 mr-2" />
            {isViewMode ? 'Back' : 'Cancel'}
          </Button>
          {isViewMode ? (
            onEdit && (
              <Button onClick={onEdit} disabled={isLoading}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Template
              </Button>
            )
          ) : (
            <Button 
              onClick={handleSave} 
              disabled={!isFormValid || isLoading}
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Template'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

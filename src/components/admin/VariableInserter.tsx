import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Code, Search } from 'lucide-react';
import { useTemplatePreview } from '@/hooks/useTemplatePreview';

interface VariableInserterProps {
  onInsertVariable: (variable: string) => void;
  templateType?: string;
}

export const VariableInserter: React.FC<VariableInserterProps> = ({
  onInsertVariable,
  templateType,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { getAvailableVariables } = useTemplatePreview();
  
  const availableVariables = getAvailableVariables(templateType);

  const filteredVariables = Object.entries(availableVariables).reduce((acc, [category, variables]) => {
    const filtered = variables.filter(variable =>
      variable.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as Record<string, string[]>);

  const handleInsertVariable = (variable: string) => {
    onInsertVariable(`{{${variable}}}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Code className="h-4 w-4 mr-2" />
          Insert Variable
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="start">
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search variables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        
        {Object.entries(filteredVariables).map(([category, variables]) => (
          <div key={category}>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="capitalize">
              {category.replace('_', ' ')} Variables
            </DropdownMenuLabel>
            {variables.map((variable) => (
              <DropdownMenuItem
                key={variable}
                onClick={() => handleInsertVariable(variable)}
                className="font-mono text-sm"
              >
                {`{{${variable}}}`}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
        
        {Object.keys(filteredVariables).length === 0 && (
          <div className="p-4 text-center text-muted-foreground">
            No variables found
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
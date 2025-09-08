import { Users, Clock, Archive, Play } from 'lucide-react';
import { WorkItemCard } from '../WorkItemCard';
import type { ClockOption } from './types';

interface WorkSectionRendererProps {
  sectionKey: string;
  sectionOptions: ClockOption[];
  selectedOption: ClockOption | null;
  onOptionSelect: (option: ClockOption) => void;
}

export function WorkSectionRenderer({ 
  sectionKey, 
  sectionOptions, 
  selectedOption, 
  onOptionSelect 
}: WorkSectionRendererProps) {
  // Return null if no options to render
  if (sectionOptions.length === 0) return null;

  const getSectionIcon = (section: string) => {
    switch (section) {
      case 'today': return Play;
      case 'assigned': return Users;
      case 'recent': return Clock;
      case 'available': return Archive;
      default: return Archive;
    }
  };

  const getSectionTitle = (section: string) => {
    switch (section) {
      case 'today': return 'Continue Today\'s Work';
      case 'assigned': return 'Your Assignments';
      case 'recent': return 'Recently Clocked';
      case 'available': return 'Available Work';
      default: return 'Work Items';
    }
  };

  const Icon = getSectionIcon(sectionKey);
  const title = getSectionTitle(sectionKey);

  return (
    <div className={`mb-6 ${sectionKey === 'today' ? 'bg-gradient-to-r from-green-50/50 to-blue-50/50 p-4 rounded-lg border border-green-200/50' : ''}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`h-4 w-4 ${sectionKey === 'today' ? 'text-green-600' : 'text-muted-foreground'}`} />
        <span className={`text-sm font-medium ${sectionKey === 'today' ? 'text-green-700' : 'text-foreground'}`}>
          {title}
        </span>
        <span className="text-xs text-muted-foreground">({sectionOptions.length})</span>
      </div>
      
      <div className="space-y-2">
        {sectionOptions.map((option) => (
          <WorkItemCard
            key={option.id}
            option={option}
            isSelected={selectedOption?.id === option.id}
            onSelect={() => onOptionSelect(option)}
          />
        ))}
      </div>
    </div>
  );
}
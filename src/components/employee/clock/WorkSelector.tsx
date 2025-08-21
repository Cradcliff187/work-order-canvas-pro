import { Users, Clock, Archive } from 'lucide-react';
import { WorkItemCard } from '../WorkItemCard';
import { WorkSelectorProps } from './types';

export function WorkSelector({ options, selectedOption, onOptionSelect }: WorkSelectorProps) {
  // Group options by section
  const assignedOptions = options.filter(opt => opt.section === 'assigned');
  const recentOptions = options.filter(opt => opt.section === 'recent');
  const availableOptions = options.filter(opt => opt.section === 'available');

  const getSectionIcon = (section: string) => {
    switch (section) {
      case 'assigned': return Users;
      case 'recent': return Clock;
      case 'available': return Archive;
      default: return Archive;
    }
  };

  const getSectionTitle = (section: string) => {
    switch (section) {
      case 'assigned': return 'Your Assignments';
      case 'recent': return 'Recently Clocked';
      case 'available': return 'Available Work';
      default: return 'Work Items';
    }
  };

  const renderSection = (sectionOptions: typeof options, sectionKey: string) => {
    if (sectionOptions.length === 0) return null;

    const Icon = getSectionIcon(sectionKey);
    const title = getSectionTitle(sectionKey);

    return (
      <div key={sectionKey} className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{title}</span>
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
  };

  // Show message if no options available
  if (options.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Archive className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No work items found matching your search.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {renderSection(assignedOptions, 'assigned')}
      {renderSection(recentOptions, 'recent')}
      {renderSection(availableOptions, 'available')}
    </div>
  );
}
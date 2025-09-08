import { Users, Clock, Archive, Play } from 'lucide-react';
import { useMemo, useCallback } from 'react';
import { WorkItemCard } from '../WorkItemCard';
import { WorkSelectorProps } from './types';

export function WorkSelector({ options, selectedOption, onOptionSelect }: WorkSelectorProps) {
  // Memoize expensive section filtering and sorting operations
  const todayOptions = useMemo(() => 
    options.filter(opt => opt.section === 'today' || opt.isWorkedToday)
      .sort((a, b) => (b.lastWorkedAt?.getTime() || 0) - (a.lastWorkedAt?.getTime() || 0)),
    [options]
  );
  
  const assignedOptions = useMemo(() => 
    options.filter(opt => opt.section === 'assigned' && !opt.isWorkedToday)
      .sort((a, b) => {
        // Prioritize items worked today, then by work frequency
        if (a.isWorkedToday !== b.isWorkedToday) {
          return (b.isWorkedToday ? 1 : 0) - (a.isWorkedToday ? 1 : 0);
        }
        return (b.sessionCount || 0) - (a.sessionCount || 0);
      }),
    [options]
  );
  
  const recentOptions = useMemo(() => 
    options.filter(opt => opt.section === 'recent' && !opt.isWorkedToday),
    [options]
  );
  
  const availableOptions = useMemo(() => 
    options.filter(opt => opt.section === 'available' && !opt.isWorkedToday),
    [options]
  );

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

  // Memoize render function to prevent recreation on every render
  const renderSection = useCallback((sectionOptions: typeof options, sectionKey: string) => {
    if (sectionOptions.length === 0) return null;

    const Icon = getSectionIcon(sectionKey);
    const title = getSectionTitle(sectionKey);

    return (
      <div key={sectionKey} className={`mb-6 ${sectionKey === 'today' ? 'bg-gradient-to-r from-green-50/50 to-blue-50/50 p-4 rounded-lg border border-green-200/50' : ''}`}>
        <div className="flex items-center gap-2 mb-3">
          <Icon className={`h-4 w-4 ${sectionKey === 'today' ? 'text-green-600' : 'text-muted-foreground'}`} />
          <span className={`text-sm font-medium ${sectionKey === 'today' ? 'text-green-700' : 'text-foreground'}`}>{title}</span>
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
  }, [selectedOption, onOptionSelect]);

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
      {renderSection(todayOptions, 'today')}
      {renderSection(assignedOptions, 'assigned')}
      {renderSection(recentOptions, 'recent')}
      {renderSection(availableOptions, 'available')}
    </div>
  );
}
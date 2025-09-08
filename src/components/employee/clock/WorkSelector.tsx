import { Archive } from 'lucide-react';
import { useMemo } from 'react';
import { WorkSectionRenderer } from './WorkSectionRenderer';
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

  // Define sections for clean mapping
  const sections = useMemo(() => [
    { key: 'today', options: todayOptions },
    { key: 'assigned', options: assignedOptions },
    { key: 'recent', options: recentOptions },
    { key: 'available', options: availableOptions }
  ], [todayOptions, assignedOptions, recentOptions, availableOptions]);

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
      {sections.map(({ key, options: sectionOptions }) => (
        <WorkSectionRenderer
          key={key}
          sectionKey={key}
          sectionOptions={sectionOptions}
          selectedOption={selectedOption}
          onOptionSelect={onOptionSelect}
        />
      ))}
    </div>
  );
}
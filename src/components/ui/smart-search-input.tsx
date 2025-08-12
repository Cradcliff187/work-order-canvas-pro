import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover"

import { cn } from "@/lib/utils"
import { Clock, ClipboardList, Users, MapPin } from "lucide-react"

// Types
export type SmartSearchCategory = "recent" | "work_order" | "assignee" | "location"

export interface SuggestionSourceItem {
  id: string
  label: string
  subtitle?: string
}

export interface SuggestionItem extends SuggestionSourceItem {
  category: SmartSearchCategory
}

interface SmartSearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSearchSubmit?: (query: string) => void
  onSelectSuggestion?: (item: SuggestionItem) => void
  workOrders?: SuggestionSourceItem[]
  assignees?: SuggestionSourceItem[]
  locations?: SuggestionSourceItem[]
  storageKey?: string // localStorage key for recents
  maxPerCategory?: number
  className?: string
}

// Local storage helpers
const getStoredRecents = (key: string): string[] => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

const setStoredRecents = (key: string, recents: string[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(recents))
  } catch {
    // ignore
  }
}

// Simple fuzzy score: prefers continuous matches and earlier occurrences
const fuzzyScore = (query: string, text: string): number => {
  if (!query) return 1
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  if (t.includes(q)) {
    // Higher score for earlier match and shorter text
    return 1000 - t.indexOf(q) - Math.min(t.length - q.length, 500)
  }
  // sequential character match
  let qIdx = 0
  let score = 0
  for (let i = 0; i < t.length && qIdx < q.length; i++) {
    if (t[i] === q[qIdx]) {
      score += 5
      qIdx++
    } else {
      score -= 1
    }
  }
  return qIdx === q.length ? score : 0
}

const categoryIconMap: Record<SmartSearchCategory, React.ReactNode> = {
  recent: <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />,
  work_order: <ClipboardList className="h-4 w-4 text-muted-foreground" aria-hidden="true" />,
  assignee: <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />,
  location: <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />,
}

export const SmartSearchInput: React.FC<SmartSearchInputProps> = ({
  value,
  onChange,
  onSearchSubmit,
  onSelectSuggestion,
  workOrders = [],
  assignees = [],
  locations = [],
  storageKey = "smart-search-recent",
  maxPerCategory = 5,
  className,
  onFocus,
  onBlur,
  ...rest
}) => {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const [recent, setRecent] = useState<string[]>([])
  const triggerRef = useRef<HTMLInputElement | null>(null)

  // Load recents
  useEffect(() => {
    setRecent(getStoredRecents(storageKey))
  }, [storageKey])

  // Construct categorized suggestions
  const categorized = useMemo(() => {
    const q = value?.trim() || ""

    // Recent suggestions are stored as labels only
    const recentItems: SuggestionItem[] = recent
      .filter((r) => (q ? fuzzyScore(q, r) > 0 : true))
      .slice(0, maxPerCategory)
      .map((r, idx) => ({ id: `recent-${idx}-${r}`, label: r, subtitle: undefined, category: "recent" as const }))

    const make = (items: SuggestionSourceItem[], category: SmartSearchCategory): SuggestionItem[] => {
      const scored = items
        .map((it) => ({
          item: it,
          score: q
            ? Math.max(
                fuzzyScore(q, it.label),
                it.subtitle ? fuzzyScore(q, it.subtitle) : 0
              )
            : 1,
        }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxPerCategory)
        .map(({ item }) => ({ ...item, category }))
      return scored
    }

    const wo = make(workOrders, "work_order")
    const asg = make(assignees, "assignee")
    const loc = make(locations, "location")

    return {
      recent: recentItems,
      work_order: wo,
      assignee: asg,
      location: loc,
    }
  }, [value, workOrders, assignees, locations, maxPerCategory, recent])

  // Flatten for navigation (headers are not focusable)
  const flatList: SuggestionItem[] = useMemo(() => {
    return [
      ...categorized.recent,
      ...categorized.work_order,
      ...categorized.assignee,
      ...categorized.location,
    ]
  }, [categorized])


  const handleSubmit = (q: string) => {
    // Update recents
    const next = [q, ...recent.filter((r) => r.toLowerCase() !== q.toLowerCase())]
    const limited = next.slice(0, 10)
    setRecent(limited)
    setStoredRecents(storageKey, limited)

    onSearchSubmit?.(q)
    setOpen(false)
  }

  const handleSelect = (item: SuggestionItem) => {
    // Prefer parent-controlled selection
    onSelectSuggestion?.(item)

    // Also call onSubmit with the label (common behavior for search bars)
    handleSubmit(item.label)
  }

  const showAny =
    categorized.recent.length +
      categorized.work_order.length +
      categorized.assignee.length +
      categorized.location.length > 0

  // Render helpers
  const CategoryHeader = ({ children }: { children: React.ReactNode }) => (
    <div className="px-3 pt-3 pb-2 text-xs font-medium text-muted-foreground select-none">
      {children}
    </div>
  )

  const Row = ({ item, index }: { item: SuggestionItem; index: number }) => {
    const isActive = index === activeIndex
    return (
      <button
        type="button"
        role="option"
        aria-selected={isActive}
        onMouseEnter={() => setActiveIndex(index)}
        onClick={() => handleSelect(item)}
        className={cn(
          "w-full px-3 py-2 flex items-center gap-2 rounded-md text-sm",
          "hover:bg-accent hover:text-accent-foreground",
          isActive && "bg-accent text-accent-foreground"
        )}
      >
        <span aria-hidden>{categoryIconMap[item.category]}</span>
        <span className="flex-1 text-left truncate">{item.label}</span>
        {item.subtitle && (
          <span className="ml-2 text-xs text-muted-foreground truncate">{item.subtitle}</span>
        )}
      </button>
    )
  }

  // Reset active index when list changes or popover opens
  useEffect(() => {
    setActiveIndex(flatList.length ? 0 : -1)
  }, [open, flatList.length])

  // Keep focus on the input when the popover opens
  useEffect(() => {
    if (open) {
      triggerRef.current?.focus()
    }
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverAnchor asChild>
        <Input
          ref={(el) => {
            triggerRef.current = el
          }}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          value={value}
          onChange={(e) => {
            onChange(e)
            if (!open) setOpen(true)
          }}
          onFocus={(e) => {
            setOpen(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            onBlur?.(e)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (activeIndex >= 0 && activeIndex < flatList.length) {
                handleSelect(flatList[activeIndex])
              } else if (value?.trim()) {
                handleSubmit(value.trim())
              }
            } else if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActiveIndex((idx) => (flatList.length ? (idx + 1) % flatList.length : -1))
              if (!open) setOpen(true)
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActiveIndex((idx) => (flatList.length ? (idx - 1 + flatList.length) % flatList.length : -1))
            } else if (e.key === 'Escape') {
              e.preventDefault()
              setOpen(false)
            }
          }}
          className={className}
          {...rest}
        />
      </PopoverAnchor>
      <PopoverContent align="start" sideOffset={6} className="p-0 w-[28rem] max-w-[90vw] z-50" onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()} onFocusOutside={(e) => { const target = e.target as HTMLElement; if (triggerRef.current && (target === triggerRef.current || triggerRef.current.contains(target))) { e.preventDefault(); } }} onPointerDownOutside={(e) => {
        const target = e.target as HTMLElement
        if (triggerRef.current && (target === triggerRef.current || triggerRef.current.contains(target))) {
          e.preventDefault()
        }
      }}>
        {showAny ? (
          <div className="max-h-[60vh] overflow-auto py-2">
            {categorized.recent.length > 0 && (
              <>
                <CategoryHeader>Recent</CategoryHeader>
                <div role="listbox" aria-label="Recent searches" className="px-2 space-y-1">
                  {categorized.recent.map((item, idx) => (
                    <Row key={item.id} item={item} index={idx} />
                  ))}
                </div>
              </>
            )}

            {categorized.work_order.length > 0 && (
              <>
                <CategoryHeader>Work Orders</CategoryHeader>
                <div role="listbox" aria-label="Work orders" className="px-2 space-y-1">
                  {categorized.work_order.map((item, idx) => (
                    <Row key={item.id} item={item} index={categorized.recent.length + idx} />
                  ))}
                </div>
              </>
            )}

            {categorized.assignee.length > 0 && (
              <>
                <CategoryHeader>Assignees</CategoryHeader>
                <div role="listbox" aria-label="Assignees" className="px-2 space-y-1">
                  {categorized.assignee.map((item, idx) => (
                    <Row
                      key={item.id}
                      item={item}
                      index={categorized.recent.length + categorized.work_order.length + idx}
                    />
                  ))}
                </div>
              </>
            )}

            {categorized.location.length > 0 && (
              <>
                <CategoryHeader>Locations</CategoryHeader>
                <div role="listbox" aria-label="Locations" className="px-2 space-y-1">
                  {categorized.location.map((item, idx) => (
                    <Row
                      key={item.id}
                      item={item}
                      index={
                        categorized.recent.length +
                        categorized.work_order.length +
                        categorized.assignee.length +
                        idx
                      }
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="py-8 px-4 text-center text-sm text-muted-foreground">No suggestions</div>
        )}
      </PopoverContent>
    </Popover>
  )
}

export default SmartSearchInput

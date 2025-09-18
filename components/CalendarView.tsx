import React, { useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Event as RBCEvent } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, endOfWeek, isSameMonth, isSameYear, isSameDay, isWithinInterval } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { getCategoryHexColor } from '../utils/categoryStyle';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { TodoItem } from '../types/todo';
import BadgeCount from './BadgeCount';
import ListMenuDropdown from './ListMenuDropdown';
import DropdownMenu from './DropdownMenu';

const locales = {
  'en-US': enUS,
};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

interface TaskEvent extends RBCEvent {
  id: string;
  category: string;
  resource: TodoItem;
  title: string;
}

interface CalendarViewProps {
  todoItems: TodoItem[];
  onEventClick?: (event: TaskEvent) => void;
  view?: 'month' | 'week' | 'day' | 'year';
  onViewChange?: (view: 'month' | 'week' | 'day' | 'year') => void;
  onNavigate?: (date: Date) => void;
  date?: Date;
  handleCloneTodo?: (todo: TodoItem) => void;
  handleDeleteTodo?: (todoId: string) => void;
  setTaskToMove?: (todo: TodoItem) => void;
  setShowMoveTaskModal?: (show: boolean) => void;
  todoLists?: any[];
  allCategories?: string[];
  googleCalendarSyncComponent?: React.ReactNode;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  todoItems = [],
  onEventClick,
  view = 'month',
  onViewChange,
  onNavigate,
  date = new Date(),
  handleCloneTodo,
  handleDeleteTodo,
  setTaskToMove,
  setShowMoveTaskModal,
  todoLists = [],
  allCategories = [],
  googleCalendarSyncComponent,
}) => {
  if (!todoItems) return null;

  // Memoized event processing function
  const processEvent = useMemo(() => {
    return (item: TodoItem) => {
      let start: Date;
      let end: Date;
      let allDay = false;

      if (item.startDate) {
        // Has specific start time - use it as is
        start = new Date(item.startDate);
        end = item.endDate ? new Date(item.endDate) : new Date(start);
        if (!item.endDate) {
          end.setHours(end.getHours() + 1);
        }
        allDay = false; // Has specific time, not all-day
      } else if (item.deadline) {
        // Has deadline - use the actual deadline time
        start = new Date(item.deadline);
        end = item.endDate ? new Date(item.endDate) : new Date(start);
        if (!item.endDate) {
          end.setHours(end.getHours() + 1);
        }
        allDay = false; // Use actual deadline time, not all-day
      } else {
        // No specific date/time - set to today at 9 AM
        start = new Date();
        start.setHours(9, 0, 0, 0);
        end = new Date(start);
        end.setHours(10, 0, 0, 0);
        allDay = false; // Set to 9 AM, not all-day
      }

      return {
        id: item.id,
        title: item.name,
        start,
        end,
        resource: item,
        allDay,
        category: item.category || 'Uncategorized',
      };
    };
  }, []);

  const events = useMemo(() => {
    return todoItems.map(processEvent);
  }, [todoItems, processEvent]);

  // Filter events to only those visible in the current view - with lazy loading optimization
  const visibleEvents = useMemo(() => {
    if (!date || !events.length) return [];
    
    let filtered: TaskEvent[] = [];
    
    if (view === 'month') {
      filtered = events.filter(e => isSameMonth(e.start, date) && isSameYear(e.start, date));
    } else if (view === 'week') {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
      filtered = events.filter(e => isWithinInterval(e.start, { start: weekStart, end: weekEnd }));
    } else if (view === 'day') {
      filtered = events.filter(e => isSameDay(e.start, date));
    } else if (view === 'year') {
      filtered = events.filter(e => isSameYear(e.start, date));
    }
    
    // Limit events for better performance on mobile
    const maxEvents = window.innerWidth < 768 ? 50 : 100;
    return filtered.slice(0, maxEvents);
  }, [events, date, view]);

  // Get unique categories from visible events
  const categories = useMemo(() => {
    const uniqueCategories = new Set(visibleEvents.map(e => e.category));
    return Array.from(uniqueCategories);
  }, [visibleEvents]);

  // Check if legend needs to wrap (for mobile accordion)
  const [needsLegendAccordion, setNeedsLegendAccordion] = React.useState(false);
  const legendRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const checkLegendHeight = () => {
      if (legendRef.current && window.innerWidth < 1024) {
        const legend = legendRef.current;
        const singleRowHeight = 32; // 32px as requested
        const actualHeight = legend.scrollHeight;
        setNeedsLegendAccordion(actualHeight > singleRowHeight);
      }
    };

    // Check after categories change
    if (categories.length > 0) {
      setTimeout(checkLegendHeight, 100);
    }

    // Check on window resize
    window.addEventListener('resize', checkLegendHeight);
    return () => window.removeEventListener('resize', checkLegendHeight);
  }, [categories]);

  // Detect mobile for calendar popup behavior
  React.useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      console.log('📱 Mobile detection:', mobile, 'Width:', window.innerWidth);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Format header text based on view and date
  let headerText = '';
  if (date) {
    if (view === 'month') {
      headerText = format(date, 'MMMM yyyy');
    } else if (view === 'week') {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
      headerText = `${format(weekStart, 'MMM d, yyyy')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    } else if (view === 'day') {
      headerText = format(date, 'EEEE, MMMM d, yyyy');
    } else if (view === 'year') {
      headerText = format(date, 'yyyy');
    }
  }

  // Handler for chevron navigation
  const handlePrev = () => {
    if (!onNavigate || !date) return;
    const d = new Date(date);
    if (view === 'month') d.setMonth(d.getMonth() - 1);
    else if (view === 'week') d.setDate(d.getDate() - 7);
    else if (view === 'day') d.setDate(d.getDate() - 1);
    else if (view === 'year') d.setFullYear(d.getFullYear() - 1);
    onNavigate(d);
  };

  const handleNext = () => {
    if (!onNavigate || !date) return;
    const d = new Date(date);
    if (view === 'month') d.setMonth(d.getMonth() + 1);
    else if (view === 'week') d.setDate(d.getDate() + 7);
    else if (view === 'day') d.setDate(d.getDate() + 1);
    else if (view === 'year') d.setFullYear(d.getFullYear() + 1);
    onNavigate(d);
  };

  const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number; event: TaskEvent | null } | null>(null);
  const [isLegendExpanded, setIsLegendExpanded] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  // Memoized event component to prevent unnecessary re-renders
  const EventComponent = React.useMemo(() => {
    return React.memo(({ event }: { event: TaskEvent }) => {
      // For week and day views, use a simpler component that works better with react-big-calendar
      if (view === 'week' || view === 'day') {
        const backgroundColor = event.id === 'wedding-date-event' 
          ? 'linear-gradient(90deg, #ff7eb3 0%, #ff758c 100%)' 
          : getCategoryHexColor(event.category);
        
        return (
          <div
            className="text-xs font-work flex items-center h-full w-full"
            style={{
              background: backgroundColor,
              color: '#fff',
              borderRadius: '4px',
              overflow: 'hidden',
              fontWeight: event.id === 'wedding-date-event' ? 'bold' : 'normal',
              border: event.id === 'wedding-date-event' ? '2px solid #ff7eb3' : 'none',
              boxShadow: event.id === 'wedding-date-event' ? '0 2px 8px rgba(239,183,197,0.25)' : 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              height: '100%',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              padding: '4px 8px',
              boxSizing: 'border-box',
            }}
            title={event.id === 'wedding-date-event' ? 'Click to Update Wedding Date' : event.title}
            onContextMenu={e => {
              e.preventDefault();
              setContextMenu({ x: e.clientX, y: e.clientY, event });
            }}
          >
            {event.id === 'wedding-date-event' ? (
              <span role="img" aria-label="wedding" className="mr-1 flex-shrink-0">💍</span>
            ) : event.resource.isCompleted && (
              <CheckCircle className="w-3 h-3 mr-1 text-white opacity-80 flex-shrink-0" />
            )}
            <span 
              className={`${event.resource.isCompleted ? 'line-through opacity-70' : ''} truncate`}
              style={{ minWidth: 0 }}
            >
              {event.title}
            </span>
          </div>
        );
      }

      // For month and year views, use the original component
      return (
        <div
          className="p-1 text-xs font-work flex items-center"
          style={{
            background: event.id === 'wedding-date-event' ? 'linear-gradient(90deg, #ff7eb3 0%, #ff758c 100%)' : undefined,
            backgroundColor: event.id === 'wedding-date-event' ? undefined : getCategoryHexColor(event.category),
            color: event.id === 'wedding-date-event' ? '#fff' : '#fff',
            borderRadius: '4px',
            overflow: 'hidden',
            fontWeight: event.id === 'wedding-date-event' ? 'bold' : undefined,
            border: event.id === 'wedding-date-event' ? '2px solid #ff7eb3' : undefined,
            boxShadow: event.id === 'wedding-date-event' ? '0 2px 8px rgba(239,183,197,0.25)' : undefined,
            cursor: event.id === 'wedding-date-event' ? 'pointer' : undefined,
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
          title={event.id === 'wedding-date-event' ? 'Click to Update Wedding Date' : event.title}
          onContextMenu={e => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, event });
          }}
        >
          {event.id === 'wedding-date-event' ? (
            <span role="img" aria-label="wedding" className="mr-1">💍</span>
          ) : event.resource.isCompleted && (
            <CheckCircle className="w-3 h-3 mr-1 text-white opacity-80" />
          )}
          <span className={event.resource.isCompleted ? 'line-through opacity-70' : ''}>
            {event.title}
          </span>
        </div>
      );
    });
  }, [view, setContextMenu]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-white" style={{ position: 'relative' }}>
      {/* Remove default react-big-calendar event borders/backgrounds */}
      <style>{`
        .rbc-event, .rbc-day-slot .rbc-background-event {
          border: none !important;
          background: none !important;
          box-shadow: none !important;
        }
        
        /* Mobile calendar fixes */
        @media (max-width: 1023px) {
          .rbc-calendar {
            width: 100% !important;
            min-width: 100% !important;
            height: 100% !important;
            min-height: 100% !important;
            max-width: 100vw !important;
          }
          
          .rbc-month-view {
            width: 100% !important;
            min-width: 100% !important;
            height: 100% !important;
            min-height: 100% !important;
            max-width: 100vw !important;
            padding: 0.5rem !important;
          }
          
          .rbc-header {
            padding: 6px 2px !important;
            font-size: 11px !important;
          }
          
          .rbc-date-cell {
            padding: 2px !important;
            font-size: 11px !important;
          }
          
          .rbc-popover {
            max-width: calc(100vw - 32px) !important;
            left: 16px !important;
            right: 16px !important;
            transform: none !important;
          }
          
          .rbc-popover-content {
            padding: 12px !important;
          }
        }
        
        /* Ensure calendar takes full height in all contexts */
        .rbc-calendar {
          height: 100% !important;
          min-height: 100% !important;
        }
        
        .rbc-month-view {
          height: 100% !important;
          min-height: 100% !important;
        }
        
        /* Fix event styling in week and day views */
        .rbc-time-view .rbc-event {
          background: inherit !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        
        .rbc-time-view .rbc-event-content {
          background: inherit !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          margin: 0 !important;
          height: 100% !important;
          display: flex !important;
          align-items: center !important;
        }
        
        /* Hide time metadata in week and day views */
        .rbc-time-view .rbc-event-label {
          display: none !important;
        }
        
        .rbc-time-view .rbc-event-time {
          display: none !important;
        }
        
        /* Ensure event pills encapsulate full text */
        .rbc-time-view .rbc-event-content > div {
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          align-items: center !important;
          padding: 4px 8px !important;
          box-sizing: border-box !important;
        }
        
        /* Make time fonts smaller and hour slots taller in week/day views */
        .rbc-time-view .rbc-time-slot {
          font-size: 10px !important;
          height: 60px !important;
        }
        
        .rbc-time-view .rbc-time-header-content {
          font-size: 10px !important;
        }
        
        .rbc-time-view .rbc-timeslot-group {
          min-height: 60px !important;
        }
        
        /* Mobile-specific calendar grid fixes */
        @media (max-width: 1023px) {
          .rbc-month-view .rbc-date {
            width: calc(100% / 7) !important;
            min-width: calc(100% / 7) !important;
            max-width: calc(100% / 7) !important;
            padding: 2px !important;
          }
          
          .rbc-month-view .rbc-row {
            width: 100% !important;
            max-width: 100vw !important;
          }
          
          /* Ensure calendar events have proper width */
          .rbc-event {
            min-width: 60px !important;
            max-width: calc(100% - 4px) !important;
          }
          
          /* Better event text handling */
          .rbc-event-content {
            font-size: 10px !important;
            line-height: 1.2 !important;
            padding: 2px 4px !important;
          }
        }
        
        /* Ensure popup functionality works */
        .rbc-popup {
          z-index: 1000 !important;
        }
        
        .rbc-popup-content {
          max-height: 300px !important;
          overflow-y: auto !important;
        }
        
        /* Style the +N more text */
        .rbc-show-more {
          color: #A85C36 !important;
          font-weight: 500 !important;
          cursor: pointer !important;
          font-size: 11px !important;
        }
        
        .rbc-show-more:hover {
          text-decoration: underline !important;
        }
        
        /* Ensure popup events are styled correctly */
        .rbc-popup .rbc-event {
          margin: 2px 0 !important;
          padding: 4px 8px !important;
          border-radius: 4px !important;
          font-size: 12px !important;
          white-space: normal !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
        }
        
        /* Style the popup date title */
        .rbc-popup .rbc-header {
          font-size: 14px !important;
          font-weight: 600 !important;
          margin-bottom: 8px !important;
          padding-bottom: 4px !important;
          border-bottom: 1px solid #e5e7eb !important;
        }
        
        /* Mobile popup date title */
        @media (max-width: 1023px) {
          .rbc-popup .rbc-header {
            font-size: 12px !important;
            font-weight: 500 !important;
            margin-bottom: 6px !important;
            padding-bottom: 2px !important;
          }
        }
        
        /* Mobile popup positioning */
        @media (max-width: 1023px) {
          .rbc-popup {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            max-width: calc(100vw - 16px) !important;
            width: calc(100vw - 16px) !important;
            max-height: calc(100vh - 64px) !important;
            z-index: 1000 !important;
            margin: 0 !important;
          }
          
          .rbc-popup-content {
            max-width: 100% !important;
            width: 100% !important;
            padding: 12px !important;
            box-sizing: border-box !important;
            overflow: visible !important;
          }
          
          .rbc-popup .rbc-event {
            margin: 4px 0 !important;
            padding: 6px 8px !important;
            font-size: 11px !important;
            line-height: 1.3 !important;
            white-space: normal !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            hyphens: auto !important;
          }
        }
      `}</style>
      {/* Google Calendar Sync Bar */}
      {googleCalendarSyncComponent && (
        <div className="mb-2">{googleCalendarSyncComponent}</div>
      )}
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-4 py-2 lg:border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <h2 className="text-xs lg:text-sm font-work font-medium flex items-center min-w-0 flex-1">
            <span className="truncate">{headerText}</span>
            <BadgeCount count={visibleEvents.length} />
          </h2>
        </div>
        <div className="flex items-center gap-2 lg:hidden">
          {/* <DropdownMenu
            trigger={
              <button className="flex items-center border border-gray-400 rounded-full px-3 py-1 bg-white text-[#332B42] font-medium text-xs lg:text-sm min-w-[80px]">
                {view.charAt(0).toUpperCase() + view.slice(1)}
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" className="ml-1"><path d="M7 10l5 5 5-5" stroke="#332B42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            }
            items={[
              { label: 'Day', onClick: () => onViewChange?.('day') },
              { label: 'Week', onClick: () => onViewChange?.('week') },
              { label: 'Month', onClick: () => onViewChange?.('month') },
            ]}
            width={120}
            align="right"
          /> */}
        </div>
      </div>
      {/* Calendar */}
      <div className="flex-1 p-0 lg:p-4 overflow-hidden min-h-0">
        <div className="h-full w-full overflow-x-auto min-h-0">
          <Calendar
            localizer={localizer}
            events={visibleEvents.filter(e => e && e.title)}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%', minWidth: '100%' }}
            components={{ toolbar: () => null, event: EventComponent }}
            popup={!isMobile}
            onSelectEvent={onEventClick}
            view={view}
            date={date}
            doShowMoreDrillDown={false}
            max={1}
          />
        </div>
        {/* Context menu for right-clicked event */}
        {contextMenu && contextMenu.event && (
          <div
            onClick={() => setContextMenu(null)}
          >
            <ListMenuDropdown
              list={undefined}
              todo={contextMenu.event.resource}
              handleCloneTodo={handleCloneTodo}
              handleDeleteTodo={handleDeleteTodo}
              setTaskToMove={setTaskToMove}
              setShowMoveTaskModal={setShowMoveTaskModal}
              todoLists={todoLists}
              allCategories={allCategories}
              onClose={() => setContextMenu(null)}
              position={{ x: contextMenu.x, y: contextMenu.y }}
            />
          </div>
        )}
      </div>

      {/* Legend */}
      {categories.length > 0 && (
        <div className="px-4 py-2 border-t">
          <div 
            ref={legendRef}
            className={`flex flex-wrap gap-2 transition-all duration-300 ${
              needsLegendAccordion && !isLegendExpanded 
                ? 'h-8 overflow-hidden' 
                : ''
            }`}
            style={{ 
              maxHeight: needsLegendAccordion && !isLegendExpanded ? '32px' : 'none'
            }}
          >
            {categories.map(category => (
              <div key={category} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 lg:w-3 lg:h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getCategoryHexColor(category) }}
                />
                <span className="text-xs font-work text-gray-600 truncate">{category}</span>
              </div>
            ))}
          </div>
          
          {/* Mobile accordion toggle */}
          {needsLegendAccordion && (
            <button
              onClick={() => setIsLegendExpanded(!isLegendExpanded)}
              className="mt-2 text-xs text-[#A85C36] hover:text-[#8B4513] flex items-center gap-1 lg:hidden"
            >
              {isLegendExpanded ? (
                <>
                  <span>Show less</span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </>
              ) : (
                <>
                  <span>Show all categories</span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CalendarView; 
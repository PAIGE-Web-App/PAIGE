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
}) => {
  if (!todoItems) return null;

  const events = useMemo(() => {
    return todoItems.map(item => {
      const start = item.startDate ? new Date(item.startDate) : (item.deadline ? new Date(item.deadline) : new Date());
      const end = item.endDate ? new Date(item.endDate) : start;
      
      // If it's a single-day task, set end time to 1 hour after start
      if (!item.endDate) {
        end.setHours(end.getHours() + 1);
      }

      return {
        id: item.id,
        title: item.name,
        start,
        end,
        resource: item,
        allDay: !item.startDate && !item.endDate, // If no specific times are set, it's an all-day event
        category: item.category || 'Uncategorized',
      };
    });
  }, [todoItems]);

  // Filter events to only those visible in the current view
  let visibleEvents: TaskEvent[] = [];
  if (date) {
    if (view === 'month') {
      visibleEvents = events.filter(e => isSameMonth(e.start, date) && isSameYear(e.start, date));
    } else if (view === 'week') {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
      visibleEvents = events.filter(e => isWithinInterval(e.start, { start: weekStart, end: weekEnd }));
    } else if (view === 'day') {
      visibleEvents = events.filter(e => isSameDay(e.start, date));
    } else if (view === 'year') {
      visibleEvents = events.filter(e => isSameYear(e.start, date));
    }
  }

  // Get unique categories from visible events
  const categories = useMemo(() => {
    const uniqueCategories = new Set(visibleEvents.map(e => e.category));
    return Array.from(uniqueCategories);
  }, [visibleEvents]);

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

  // Custom event component
  const EventComponent = ({ event }: { event: TaskEvent }) => (
    <div
      className="p-1 text-xs font-work flex items-center"
      style={{
        backgroundColor: getCategoryHexColor(event.category),
        color: '#fff',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
      onContextMenu={e => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, event });
      }}
    >
      {event.resource.isCompleted && (
        <CheckCircle className="w-3 h-3 mr-1 text-white opacity-80" />
      )}
      <span className={event.resource.isCompleted ? 'line-through opacity-70' : ''}>
        {event.title}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white" style={{ position: 'relative' }}>
      {/* Remove default react-big-calendar event borders/backgrounds */}
      <style>{`
        .rbc-event, .rbc-day-slot .rbc-background-event {
          border: none !important;
          background: none !important;
          box-shadow: none !important;
        }
      `}</style>
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
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
          <h2 className="text-lg font-work font-medium flex items-center">
            {headerText}
            <BadgeCount count={visibleEvents.length} />
          </h2>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 p-4">
        <Calendar
          localizer={localizer}
          events={visibleEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          components={{ toolbar: () => null, event: EventComponent }}
          popup
          onSelectEvent={onEventClick}
          view={view}
          date={date}
        />
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
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <div key={category} className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getCategoryHexColor(category) }}
                />
                <span className="text-xs font-work text-gray-600">{category}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView; 
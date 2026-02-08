import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { 
  IconChevronLeft, 
  IconChevronRight, 
  IconClock,
  IconCalendar,
  IconX 
} from "@tabler/icons-react";

interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  agentId: Id<"agents">;
  agentName: string;
  agentColor: string;
  priority?: "critical" | "high" | "normal" | "low";
  type: "task" | "cron";
  description?: string;
  status?: string;
}

interface CalendarViewProps {
  onClose?: () => void;
  onSelectTask?: (taskId: Id<"tasks">) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ onClose, onSelectTask }) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<"week" | "day">("week");
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>("all");

  // Fetch tasks and agents
  const tasks = useQuery(api.queries.listTasks);
  const agents = useQuery(api.queries.listAgents);

  // Generate week dates
  const weekDates = useMemo(() => {
    const startOfWeek = new Date(currentWeek);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    startOfWeek.setDate(diff);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentWeek]);

  // Get current day date for day view
  const currentDayDate = useMemo(() => {
    if (viewMode === "day") {
      return [new Date(currentWeek)];
    }
    return weekDates;
  }, [viewMode, currentWeek, weekDates]);

  // Process tasks into calendar events
  const calendarEvents = useMemo(() => {
    if (!tasks || !agents) return [];

    const events: CalendarEvent[] = [];
    
    tasks.forEach(task => {
      // Skip done/archived tasks unless they're scheduled
      if (task.status === "done" || task.status === "archived") return;

      // Create a scheduled time based on task creation or other logic
      // For now, we'll distribute tasks across the week based on their ID
      const taskIdNum = parseInt(task._id.toString().split("").pop() || "0", 16);
      const dayOffset = taskIdNum % 7;
      
      // Distribute tasks throughout business hours (9 AM - 6 PM)
      const businessHours = [9, 10, 11, 12, 13, 14, 15, 16, 17]; // 9 AM to 5 PM
      const hourOffset = businessHours[taskIdNum % businessHours.length];
      
      const scheduledDate = new Date(weekDates[0]);
      scheduledDate.setDate(scheduledDate.getDate() + dayOffset);
      scheduledDate.setHours(hourOffset, (taskIdNum % 4) * 15, 0, 0); // Distribute in 15-min intervals
      
      const endTime = new Date(scheduledDate);
      // Vary duration based on priority
      const duration = task.priority === "critical" ? 2 : task.priority === "high" ? 1.5 : 1;
      endTime.setHours(endTime.getHours() + duration);

      // Get agent info
      const primaryAgent = agents.find(a => a._id === task.assigneeIds[0]);
      
      events.push({
        id: task._id.toString(),
        title: task.title,
        startTime: scheduledDate,
        endTime: endTime,
        agentId: task.assigneeIds[0],
        agentName: primaryAgent?.name || "Unassigned",
        agentColor: getAgentColor(primaryAgent?.name || ""),
        priority: task.priority,
        type: "task",
        description: task.description,
        status: task.status
      });
    });

    // Add some sample cron jobs for demonstration
    const sampleCrons = [
      { title: "Daily Backup", agent: "Coder", time: "02:00", days: [1, 2, 3, 4, 5] },
      { title: "Weekly Report", agent: "Analyst", time: "08:00", days: [1] },
      { title: "Security Scan", agent: "Tester", time: "18:00", days: [1, 3, 5] },
    ];

    sampleCrons.forEach(cron => {
      cron.days.forEach(day => {
        const [hour, minute] = cron.time.split(":").map(Number);
        const scheduledDate = new Date(weekDates[day - 1]);
        scheduledDate.setHours(hour, minute, 0, 0);
        
        const endTime = new Date(scheduledDate);
        endTime.setMinutes(endTime.getMinutes() + 30);

        const agent = agents.find(a => a.name === cron.agent);
        
        events.push({
          id: `cron-${cron.title}-${day}`,
          title: cron.title,
          startTime: scheduledDate,
          endTime: endTime,
          agentId: agent?._id || "" as Id<"agents">,
          agentName: cron.agent,
          agentColor: getAgentColor(cron.agent),
          priority: "normal",
          type: "cron",
          description: "Automated scheduled task"
        });
      });
    });

    return events;
  }, [tasks, agents, weekDates]);

  // Get color for agent
  const getAgentColor = (agentName: string): string => {
    const colors = {
      "Theeb": "#3b82f6", // blue
      "Analyst": "#8b5cf6", // purple
      "Architect": "#10b981", // green
      "Coder": "#f59e0b", // amber
      "Tester": "#ef4444", // red
      "UI/UX Expert": "#ec4899", // pink
      "Marketing": "#06b6d4", // cyan
      "Sales Expert": "#84cc16", // lime
    };
    return colors[agentName as keyof typeof colors] || "#6b7280"; // gray
  };

  // Get priority color
  const getPriorityColor = (priority?: string): string => {
    switch (priority) {
      case "critical": return "#dc2626";
      case "high": return "#ea580c";
      case "normal": return "#ca8a04";
      case "low": return "#16a34a";
      default: return "#6b7280";
    }
  };

  // Navigate weeks
  const goToPreviousWeek = () => {
    setCurrentWeek(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  };

  const goToNextWeek = () => {
    setCurrentWeek(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        goToPreviousWeek();
      } else if (e.key === "ArrowRight") {
        goToNextWeek();
      } else if (e.key === "Escape") {
        setSelectedEvent(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []); // Empty dependency array since we define the functions outside

  // Format week range
  const formatWeekRange = () => {
    const start = weekDates[0];
    const end = weekDates[6];
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  };

  // Get events for a specific day and hour
  const getEventsForSlot = (date: Date, hour: number) => {
    return calendarEvents.filter(event => {
      const eventDate = new Date(event.startTime);
      const matchesTime = eventDate.getDate() === date.getDate() &&
                         eventDate.getMonth() === date.getMonth() &&
                         eventDate.getFullYear() === date.getFullYear() &&
                         eventDate.getHours() === hour;
      
      const matchesAgent = selectedAgentFilter === "all" || event.agentName === selectedAgentFilter;
      
      return matchesTime && matchesAgent;
    });
  };

  // Time slots for the calendar
  const timeSlots = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

  return (
    <div className="calendar-view fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="calendar-header flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close calendar"
          >
            <IconX size={20} />
          </button>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <IconCalendar size={24} className="text-gray-600" />
            Calendar View
          </h2>
        </div>

        <div className="flex items-center gap-4">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === "week" ? "bg-white shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode("day")}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === "day" ? "bg-white shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Day
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Previous week"
            >
              <IconChevronLeft size={20} />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              Today
            </button>
            <button
              onClick={goToNextWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Next week"
            >
              <IconChevronRight size={20} />
            </button>
          </div>

          <div className="text-lg font-medium">
            {formatWeekRange()}
          </div>
        </div>
      </div>

      {/* Legend and Filters */}
      <div className="calendar-legend flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-6">
          <div className="text-sm font-medium text-gray-700">Legend:</div>
          {agents?.slice(0, 5).map(agent => (
            <div key={agent._id} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getAgentColor(agent.name) }}
              />
              <span className="text-sm text-gray-600">{agent.name}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <IconClock size={16} className="text-gray-500" />
            <span className="text-sm text-gray-600">Cron Jobs</span>
          </div>
        </div>
        
        {/* Agent Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Filter:</label>
          <select
            value={selectedAgentFilter}
            onChange={(e) => setSelectedAgentFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Agents</option>
            {agents?.map(agent => (
              <option key={agent._id} value={agent.name}>{agent.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid flex-1 overflow-auto">
        <div className={viewMode === "day" ? "" : "min-w-max"}>
          {/* Day Headers */}
          <div className={`grid sticky top-0 bg-white z-10 border-b border-gray-200 ${
            viewMode === "day" ? "grid-cols-2" : "grid-cols-8"
          }`}>
            <div className="w-20"></div>
            {currentDayDate.map((date, index) => (
              <div key={index} className="p-3 text-center border-l border-gray-200">
                <div className="text-sm font-medium text-gray-900">
                  {viewMode === "day" 
                    ? date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
                    : date.toLocaleDateString("en-US", { weekday: "short" })
                  }
                </div>
                {viewMode === "week" && (
                  <div className={`text-lg font-semibold mt-1 ${
                    date.toDateString() === new Date().toDateString() 
                      ? "bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto" 
                      : "text-gray-700"
                  }`}>
                    {date.getDate()}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Time Slots */}
          {timeSlots.map(hour => (
            <div key={hour} className={`grid border-b border-gray-100 ${
              viewMode === "day" ? "grid-cols-2" : "grid-cols-8"
            }`}>
              <div className="w-20 p-3 text-right text-sm text-gray-500 font-medium">
                {hour}:00
              </div>
              {currentDayDate.map((date, dayIndex) => {
                const events = getEventsForSlot(date, hour);
                return (
                  <div 
                    key={dayIndex} 
                    className="relative p-1 border-l border-gray-100 min-h-16 hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      // Could add create event functionality here
                    }}
                  >
                    {events.map((event, eventIndex) => {
                      // Handle overlapping events
                      const overlapOffset = events.length > 1 ? (eventIndex * 20) : 0;
                      // const _widthPercent = events.length > 1 ? 90 / events.length : 100;
                      
                      return (
                        <div
                          key={event.id}
                          className="calendar-event absolute p-1.5 rounded text-xs text-white shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                          style={{ 
                            backgroundColor: event.agentColor,
                            borderLeft: `3px solid ${getPriorityColor(event.priority)}`,
                            left: `${eventIndex * 5}px`,
                            right: `${(events.length - eventIndex - 1) * 5}px`,
                            top: `${overlapOffset}px`,
                            height: `calc(100% - ${overlapOffset}px - 2px)`
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(event);
                          }}
                        >
                          <div className="font-medium truncate">{event.title}</div>
                          <div className="text-white/80 truncate">
                            {event.agentName}
                            {event.type === "cron" && <IconClock size={10} className="inline ml-1" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{selectedEvent.title}</h3>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <IconX size={20} />
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Assigned to</label>
                <div className="flex items-center gap-2 mt-1">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: selectedEvent.agentColor }}
                  />
                  <span>{selectedEvent.agentName}</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Time</label>
                <div className="mt-1">
                  {selectedEvent.startTime.toLocaleTimeString("en-US", { 
                    hour: "numeric", 
                    minute: "2-digit" 
                  })} - {selectedEvent.endTime.toLocaleTimeString("en-US", { 
                    hour: "numeric", 
                    minute: "2-digit" 
                  })}
                </div>
              </div>
              {selectedEvent.priority && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Priority</label>
                  <div className="mt-1">
                    <span 
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                      style={{ 
                        backgroundColor: `${getPriorityColor(selectedEvent.priority)}20`,
                        color: getPriorityColor(selectedEvent.priority)
                      }}
                    >
                      {selectedEvent.priority}
                    </span>
                  </div>
                </div>
              )}
              {selectedEvent.description && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <p className="mt-1 text-sm text-gray-600">{selectedEvent.description}</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex gap-2">
              <button
                onClick={() => {
                  if (onSelectTask) {
                    onSelectTask(selectedEvent.id as Id<"tasks">);
                    setSelectedEvent(null);
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                View Task Details
              </button>
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
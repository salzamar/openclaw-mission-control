import React, { useState, useCallback, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { format, isToday, isYesterday, isThisWeek, differenceInMinutes } from "date-fns";

// Activity type icons mapping
const ACTIVITY_ICONS = {
  status_update: "📋",
  assignees_update: "👥",
  task_update: "📝",
  task_created: "➕",
  task_completed: "✅",
  message: "💬",
  commented: "💭",
  document_created: "📄",
  document_updated: "📝",
  document_deleted: "🗑️",
  agent_created: "👤",
  agent_updated: "🔄",
  system: "🔧",
  cron: "⏰",
  file_uploaded: "📎",
  file_deleted: "🗑️",
};

// Activity type labels
const ACTIVITY_LABELS = {
  status_update: "Status Update",
  assignees_update: "Assignees Update",
  task_update: "Task Update",
  task_created: "Task Created",
  task_completed: "Task Completed",
  message: "Message",
  commented: "Comment",
  document_created: "Document Created",
  document_updated: "Document Updated",
  document_deleted: "Document Deleted",
  agent_created: "Agent Created",
  agent_updated: "Agent Updated",
  system: "System",
  cron: "Cron Job",
  file_uploaded: "File Uploaded",
  file_deleted: "File Deleted",
};

// Filter configuration
const FILTERS = [
  { id: "all", label: "All", types: [] },
  { id: "tasks", label: "Tasks", types: ["status_update", "assignees_update", "task_update", "task_created", "task_completed"] },
  { id: "files", label: "Files", types: ["document_created", "document_updated", "document_deleted", "file_uploaded", "file_deleted"] },
  { id: "messages", label: "Messages", types: ["message", "commented"] },
  { id: "cron", label: "Cron", types: ["cron"] },
  { id: "system", label: "System", types: ["system", "agent_created", "agent_updated"] },
];

// Format relative time
const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const minutes = differenceInMinutes(now, date);
  
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return `Yesterday ${format(date, "HH:mm")}`;
  if (isThisWeek(date)) return format(date, "EEEE HH:mm");
  return format(date, "MMM d, HH:mm");
};

// Group allActivities by date
const groupActivitiesByDate = (allActivities: any[]) => {
  const groups: { [key: string]: any[] } = {};
  
  allActivities.forEach((activity) => {
    const date = new Date(activity._creationTime);
    let groupKey: string;
    
    if (isToday(date)) {
      groupKey = "Today";
    } else if (isYesterday(date)) {
      groupKey = "Yesterday";
    } else if (isThisWeek(date)) {
      groupKey = format(date, "EEEE");
    } else {
      groupKey = format(date, "MMMM d, yyyy");
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(activity);
  });
  
  return groups;
};

interface ActivityFeedProps {
  className?: string;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ className = "" }) => {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedAgentId, _setSelectedAgentId] = useState<Id<"agents"> | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  
  // Get filter types
  
  // State for pagination
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [allActivities, setAllActivities] = useState<any[]>([]);
  
  // Reset pagination when filters change
  useEffect(() => {
    setCursor(undefined);
    setAllActivities([]);
  }, [selectedFilter, selectedAgentId]);
  
  // Query allActivities with real-time updates
  const result = useQuery(
    api.queries.listActivities, 
    {
      type: selectedFilter === "all" ? undefined : selectedFilter,
      agentId: selectedAgentId,
      cursor,
      limit: 50,
    }
  );
  
  // Update allActivities when new data arrives
  useEffect(() => {
    if (result) {
      if (cursor) {
        // Append new activities
        setAllActivities(prev => [...prev, ...result.activities]);
      } else {
        // Replace all activities (filter changed)
        setAllActivities(result.activities);
      }
      setHasMore(result.hasMore);
    }
  }, [result, cursor]);
  
  // Query agents
  const agents = useQuery(api.queries.listAgents);
  
  // Group allActivities by date
  const groupedActivities = allActivities ? groupActivitiesByDate(allActivities) : {};
  
  // Infinite scroll handler
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !result?.nextCursor) return;
    
    setIsLoadingMore(true);
    setCursor(result.nextCursor);
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMore, result]);
  
  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return;
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );
    
    observerRef.current.observe(loadMoreRef.current);
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleLoadMore]);
  
  if (allActivities === undefined || agents === undefined) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="p-4 border-b border-border">
          <div className="h-8 bg-muted rounded animate-pulse mb-4" />
          <div className="flex gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-6 w-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className={`flex flex-col h-full bg-background ${className}`}>
      {/* Header with search and settings */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Activity Feed</h2>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-muted rounded-lg transition-colors" title="Search">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button className="p-2 hover:bg-muted rounded-lg transition-colors" title="Settings">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setSelectedFilter(filter.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                selectedFilter === filter.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Activity list */}
      <div className="flex-1 overflow-y-auto p-4">
        {allActivities.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <div className="text-4xl mb-2">📭</div>
            <p>No allActivities found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedActivities).map(([dateGroup, groupActivities]) => (
              <div key={dateGroup}>
                {/* Sticky date header */}
                <div className="activity-date-header">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    {dateGroup}
                  </h3>
                </div>
                
                {/* Activities for this date */}
                <div className="space-y-3">
                  {groupActivities.map((activity) => {
                    const icon = ACTIVITY_ICONS[activity.type as keyof typeof ACTIVITY_ICONS] || "📌";
                    const time = new Date(activity._creationTime);
                    
                    return (
                      <div
                        key={activity._id}
                        className="activity-item flex gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer group"
                      >
                        {/* Icon */}
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm shrink-0">
                          {icon}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm leading-relaxed">
                                <span className="font-semibold text-foreground">
                                  {activity.agentName}
                                </span>{" "}
                                <span className="text-muted-foreground">
                                  {activity.message}
                                </span>
                              </p>
                              {activity.targetId && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {ACTIVITY_LABELS[activity.type as keyof typeof ACTIVITY_LABELS] || activity.type}
                                </p>
                              )}
                            </div>
                            <time className="text-xs text-muted-foreground shrink-0">
                              {formatRelativeTime(time)}
                            </time>
                          </div>
                        </div>
                        
                        {/* Expand arrow */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {/* Load more indicator */}
            {hasMore && (
              <div ref={loadMoreRef} className="py-4 text-center">
                {isLoadingMore ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Loading more...
                  </div>
                ) : (
                  <button
                    onClick={handleLoadMore}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Load more
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
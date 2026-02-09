import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

type Objective = {
  _id: Id<"objectives">;
  objectiveId: string;
  title: string;
  description: string;
  status: "active" | "complete" | "backlog";
  progress: number;
  priority: "P0" | "P1" | "P2";
  targetDate?: string;
  completedDate?: string;
  blockers?: string;
};

type ObjectivesViewProps = {
  onSelectObjective?: (objectiveId: string) => void;
};

const ObjectivesView: React.FC<ObjectivesViewProps> = ({ onSelectObjective }) => {
  const objectives = useQuery(api.objectives.list, {});
  const tasks = useQuery(api.queries.listTasks);
  const updateObjective = useMutation(api.objectives.update);
  
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [expandedObjectiveId, setExpandedObjectiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  // Group objectives by status
  const groupedObjectives = useMemo(() => {
    if (!objectives) return { active: [], complete: [], backlog: [] };

    let filtered = objectives;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (o) =>
          o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter((o) => o.priority === priorityFilter);
    }

    return {
      active: filtered.filter((o) => o.status === "active").sort((a, b) => {
        const priorityOrder = { P0: 0, P1: 1, P2: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }),
      complete: filtered.filter((o) => o.status === "complete"),
      backlog: filtered.filter((o) => o.status === "backlog").sort((a, b) => {
        const priorityOrder = { P0: 0, P1: 1, P2: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }),
    };
  }, [objectives, searchQuery, priorityFilter]);

  // Get tasks linked to an objective
  const getObjectiveTasks = (objectiveId: string) => {
    if (!tasks) return { total: 0, completed: 0, blocked: 0 };
    const linkedTasks = tasks.filter((t) => t.objectiveId === objectiveId);
    return {
      total: linkedTasks.length,
      completed: linkedTasks.filter((t) => t.status === "done").length,
      blocked: 0, // Tasks don't have blocked status in schema
    };
  };

  // Priority badge colors
  const getPriorityColors = (priority: string) => {
    switch (priority) {
      case "P0":
        return { bg: "bg-red-900/40", border: "border-red-500", text: "text-red-400" };
      case "P1":
        return { bg: "bg-orange-900/40", border: "border-orange-500", text: "text-orange-400" };
      case "P2":
        return { bg: "bg-blue-900/40", border: "border-blue-500", text: "text-blue-400" };
      default:
        return { bg: "bg-muted", border: "border-border", text: "text-muted-foreground" };
    }
  };

  // Status indicator
  const getStatusIndicator = (objective: Objective) => {
    const taskStats = getObjectiveTasks(objective.objectiveId);
    
    if (objective.status === "complete") {
      return { icon: "✓", color: "text-green-400", label: "Complete" };
    }
    if (taskStats.blocked > 0) {
      return { icon: "🔴", color: "text-red-400", label: `${taskStats.blocked} blocked` };
    }
    
    // Calculate if at risk (e.g., < 50% progress with < 50% time remaining)
    if (objective.targetDate) {
      const target = new Date(objective.targetDate);
      const now = new Date();
      const daysRemaining = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysRemaining < 7 && objective.progress < 80) {
        return { icon: "🟡", color: "text-yellow-400", label: "At risk" };
      }
    }
    
    return { icon: "✅", color: "text-green-400", label: "On track" };
  };

  // Format target date
  const formatTargetDate = (dateStr?: string, completedDate?: string) => {
    if (completedDate) {
      const completedDateObj = new Date(completedDate);
      if (isNaN(completedDateObj.getTime())) {
        return "Complete";
      }
      return `Complete: ${completedDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    }
    if (!dateStr) return "No target date";
    
    const date = new Date(dateStr);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "No target date";
    }
    
    const now = new Date();
    const daysRemaining = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    const formatted = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (daysRemaining < 0) return `${formatted} (overdue)`;
    if (daysRemaining === 0) return `${formatted} (today)`;
    if (daysRemaining === 1) return `${formatted} (tomorrow)`;
    return `${formatted} (${daysRemaining}d)`;
  };

  // Move objective to new status
  const moveObjective = async (objectiveId: string, newStatus: "active" | "complete" | "backlog") => {
    await updateObjective({
      objectiveId,
      status: newStatus,
      completedDate: newStatus === "complete" ? new Date().toISOString() : undefined,
    });
  };

  // Objective Card Component
  const ObjectiveCard = ({ objective }: { objective: Objective }) => {
    const priorityColors = getPriorityColors(objective.priority);
    const statusIndicator = getStatusIndicator(objective);
    const taskStats = getObjectiveTasks(objective.objectiveId);
    const isSelected = selectedObjectiveId === objective.objectiveId;

    return (
      <div
        className={`bg-card rounded-lg border-l-4 ${priorityColors.border} border border-border overflow-hidden cursor-pointer transition-all hover:bg-muted hover:shadow-lg ${
          isSelected ? "ring-2 ring-[var(--accent-orange)]" : ""
        }`}
        onClick={() => {
          setSelectedObjectiveId(objective.objectiveId);
          onSelectObjective?.(objective.objectiveId);
        }}
        onDoubleClick={() => setExpandedObjectiveId(objective.objectiveId)}
      >
        {/* Header */}
        <div className="p-3">
          <div className="flex items-start gap-2 mb-3">
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${priorityColors.bg} ${priorityColors.text} flex-shrink-0`}
            >
              {objective.priority}
            </span>
            <h3 className="text-base font-semibold text-white flex-1 line-clamp-2 leading-tight">
              {objective.title || "Untitled Objective"}
            </h3>
          </div>

          {/* Progress bar */}
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progress: {objective.progress}%</span>
              <span className="text-white font-medium">{objective.progress}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  objective.progress >= 75
                    ? "bg-gradient-to-r from-green-600 to-green-400"
                    : "bg-gradient-to-r from-orange-600 to-orange-400"
                }`}
                style={{ width: `${objective.progress}%` }}
              />
            </div>
          </div>

          {/* Meta info */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              📅 {formatTargetDate(objective.targetDate, objective.completedDate)}
            </span>
            {taskStats.total > 0 && (
              <span className="text-muted-foreground">
                {taskStats.completed}/{taskStats.total} tasks
              </span>
            )}
          </div>

          {/* Status indicator */}
          {objective.status !== "complete" && (
            <div className={`mt-2 text-xs ${statusIndicator.color}`}>
              {statusIndicator.icon} {statusIndicator.label}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Kanban Column Component
  const KanbanColumn = ({
    title,
    objectives,
    emptyMessage,
  }: {
    title: string;
    objectives: Objective[];
    emptyMessage: string;
  }) => (
    <div className="flex-1 min-w-[300px] max-w-[400px] flex flex-col">
      {/* Column header */}
      <div className="px-3 py-2 bg-card rounded-t-lg border border-border border-b-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              {title}
            </span>
            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
              {objectives.length}
            </span>
          </div>
        </div>
      </div>

      {/* Column content */}
      <div className="flex-1 overflow-y-auto bg-secondary border border-border border-t-0 rounded-b-lg p-2 space-y-2 min-h-[400px]">
        {objectives.length > 0 ? (
          objectives.map((objective) => (
            <ObjectiveCard key={objective._id} objective={objective} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <span className="text-2xl mb-2">🎯</span>
            <p className="text-sm text-gray-500">{emptyMessage}</p>
          </div>
        )}
      </div>
    </div>
  );

  // Loading state
  if (objectives === undefined) {
    return (
      <div className="flex-1 overflow-auto p-6 animate-pulse">
        <div className="h-8 bg-card rounded w-48 mb-6" />
        <div className="flex gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex-1 min-w-[300px] h-96 bg-card rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Expanded objective modal
  const expandedObjective = objectives?.find((o) => o.objectiveId === expandedObjectiveId);

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-background">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[var(--accent-orange)]">◇</span>
            <h2 className="text-lg font-semibold text-white tracking-wider">OBJECTIVES</h2>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-3 py-1.5 text-sm bg-[var(--accent-orange)] text-white rounded-lg hover:opacity-90 transition-opacity font-medium">
              + New Objective
            </button>
            <div className="flex items-center gap-1 bg-card rounded-lg p-1">
              <button
                onClick={() => setViewMode("kanban")}
                className={`px-2 py-1 text-xs rounded ${viewMode === "kanban" ? "bg-muted text-white" : "text-muted-foreground"}`}
              >
                ⊞ Grid
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-2 py-1 text-xs rounded ${viewMode === "list" ? "bg-muted text-white" : "text-muted-foreground"}`}
              >
                ≡ List
              </button>
            </div>
            <button className="text-muted-foreground hover:text-white">⚙️</button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              placeholder="Search objectives..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 pl-8 bg-card border border-border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[var(--accent-orange)]"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 bg-card border border-border rounded-lg text-sm text-white focus:outline-none focus:border-[var(--accent-orange)]"
          >
            <option value="all">All Priorities</option>
            <option value="P0">P0 - Critical</option>
            <option value="P1">P1 - High</option>
            <option value="P2">P2 - Normal</option>
          </select>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <div className="flex gap-4 h-full min-w-max">
          <KanbanColumn
            title="Active"
            objectives={groupedObjectives.active}
            emptyMessage="No active objectives. Move items here or create new."
          />
          <KanbanColumn
            title="Complete"
            objectives={groupedObjectives.complete}
            emptyMessage="No completed objectives yet."
          />
          <KanbanColumn
            title="Backlog"
            objectives={groupedObjectives.backlog}
            emptyMessage="No backlog items. Add future objectives here."
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-2 border-t border-border bg-background text-xs text-gray-500">
        ↑↓/jk Navigate • Enter Expand • h/l Switch Column • n New • / Search • ? Help
      </div>

      {/* Expanded Objective Modal */}
      {expandedObjective && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setExpandedObjectiveId(null)}
        >
          <div
            className="bg-card rounded-xl border border-border w-full max-w-2xl max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-2 py-1 rounded ${getPriorityColors(expandedObjective.priority).bg} ${getPriorityColors(expandedObjective.priority).text}`}
                >
                  {expandedObjective.priority}
                </span>
                <span className="text-lg font-semibold text-white">
                  {expandedObjective.title}
                </span>
              </div>
              <button
                onClick={() => setExpandedObjectiveId(null)}
                className="text-muted-foreground hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Modal content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Progress */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Progress</span>
                  <span className="text-lg font-bold text-white">
                    {expandedObjective.progress}%
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      expandedObjective.progress >= 75
                        ? "bg-gradient-to-r from-green-600 to-green-400"
                        : "bg-gradient-to-r from-orange-600 to-orange-400"
                    }`}
                    style={{ width: `${expandedObjective.progress}%` }}
                  />
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <span className="text-muted-foreground">📅 Target Date</span>
                  <div className="text-white">
                    {formatTargetDate(expandedObjective.targetDate)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">📊 Status</span>
                  <div className={getStatusIndicator(expandedObjective).color}>
                    {getStatusIndicator(expandedObjective).icon}{" "}
                    {getStatusIndicator(expandedObjective).label}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                <p className="text-white text-sm">{expandedObjective.description}</p>
              </div>

              {/* Linked tasks */}
              {tasks && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Linked Tasks ({getObjectiveTasks(expandedObjective.objectiveId).total})
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {tasks
                      .filter((t) => t.objectiveId === expandedObjective.objectiveId)
                      .map((task) => (
                        <div
                          key={task._id}
                          className="flex items-center gap-2 p-2 bg-secondary rounded"
                        >
                          <span
                            className={`text-xs ${
                              task.status === "done"
                                ? "text-green-400"
                                : task.status === "review"
                                  ? "text-yellow-400"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {task.status === "done" ? "✓" : task.status === "in_progress" ? "🔄" : "⚙️"}
                          </span>
                          <span className="text-sm text-white flex-1">{task.title}</span>
                          <span className="text-xs text-gray-500">{task.status}</span>
                        </div>
                      ))}
                    {getObjectiveTasks(expandedObjective.objectiveId).total === 0 && (
                      <p className="text-gray-500 text-sm text-center py-4">
                        No tasks linked to this objective
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => moveObjective(expandedObjective.objectiveId, "active")}
                  disabled={expandedObjective.status === "active"}
                  className="px-3 py-1.5 text-xs bg-muted text-white rounded hover:bg-[#444] disabled:opacity-50"
                >
                  → Active
                </button>
                <button
                  onClick={() => moveObjective(expandedObjective.objectiveId, "complete")}
                  disabled={expandedObjective.status === "complete"}
                  className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  ✓ Complete
                </button>
                <button
                  onClick={() => moveObjective(expandedObjective.objectiveId, "backlog")}
                  disabled={expandedObjective.status === "backlog"}
                  className="px-3 py-1.5 text-xs bg-muted text-white rounded hover:bg-[#444] disabled:opacity-50"
                >
                  → Backlog
                </button>
              </div>
              <button className="px-3 py-1.5 text-xs text-muted-foreground hover:text-white">
                Edit Objective
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ObjectivesView;

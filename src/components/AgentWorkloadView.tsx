import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

type Agent = {
  _id: Id<"agents">;
  name: string;
  role: string;
  level: "LEAD" | "INT" | "SPC";
  avatar: string;
  status: "idle" | "active" | "blocked";
  currentTaskId?: Id<"tasks">;
  email?: string;
};

type Task = {
  _id: Id<"tasks">;
  title: string;
  status: string;
  startedAt?: number;
};

type AgentWorkloadViewProps = {
  onSelectAgent?: (agentId: Id<"agents">) => void;
  compact?: boolean;
};

// Agent emoji mapping
const agentEmojis: Record<string, string> = {
  Theeb: "🐺",
  Analyst: "📊",
  Architect: "🏗️",
  Coder: "💻",
  Tester: "🧪",
  "UI/UX Expert": "🎨",
  Marketing: "📢",
  "Sales Expert": "💼",
  Sami: "👤",
};

const AgentWorkloadView: React.FC<AgentWorkloadViewProps> = ({
  onSelectAgent,
  compact = false,
}) => {
  const agents = useQuery(api.queries.listAgents);
  const tasks = useQuery(api.queries.listTasks);
  const [selectedAgentId, setSelectedAgentId] = useState<Id<"agents"> | null>(null);

  // Count stats
  const activeCount = agents?.filter((a) => a.status === "active").length ?? 0;
  const idleCount = agents?.filter((a) => a.status === "idle").length ?? 0;
  const blockedCount = agents?.filter((a) => a.status === "blocked").length ?? 0;
  const totalAgents = agents?.length ?? 0;

  // Get tasks completed today (mock: tasks done today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tasksCompletedToday = tasks?.filter(
    (t) => t.status === "done" && t._creationTime >= today.getTime()
  ).length ?? 0;

  // Get current task for an agent
  const getCurrentTask = (agent: Agent): Task | undefined => {
    if (!agent.currentTaskId || !tasks) return undefined;
    return tasks.find((t) => t._id === agent.currentTaskId);
  };

  // Get tasks completed today by agent
  const getAgentTasksToday = (agentId: Id<"agents">): number => {
    if (!tasks) return 0;
    return tasks.filter(
      (t) =>
        t.status === "done" &&
        t.assigneeIds?.includes(agentId) &&
        t._creationTime >= today.getTime()
    ).length;
  };

  // Format active time
  const formatActiveTime = (startedAt?: number): string => {
    if (!startedAt) return "—";
    const diffMs = Date.now() - startedAt;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
  };

  // Status info
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "active":
        return { icon: "🟢", color: "#22c55e", label: "Active" };
      case "idle":
        return { icon: "⚪", color: "#6b7280", label: "Idle" };
      case "blocked":
        return { icon: "🔴", color: "#ef4444", label: "Blocked" };
      default:
        return { icon: "⚫", color: "#1f2937", label: "Offline" };
    }
  };

  // Level badge colors
  const getLevelColors = (level: string) => {
    switch (level) {
      case "LEAD":
        return { bg: "bg-[#f9731620]", border: "border-[#f97316]", text: "text-[#f97316]" };
      case "SPC":
        return { bg: "bg-[#3b82f620]", border: "border-[#3b82f6]", text: "text-[#3b82f6]" };
      case "INT":
        return { bg: "bg-[#8b5cf620]", border: "border-[#8b5cf6]", text: "text-[#8b5cf6]" };
      default:
        return { bg: "bg-muted", border: "border-border", text: "text-muted-foreground" };
    }
  };

  if (agents === undefined) {
    return (
      <div className="flex-1 overflow-auto p-6 animate-pulse">
        <div className="h-8 bg-card rounded w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-48 bg-card rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Compact sidebar variant
  if (compact) {
    return (
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <span className="text-xs font-bold tracking-wider text-muted-foreground">AGENTS</span>
          <span className="text-xs text-green-500 font-medium">
            🟢 {activeCount}/{totalAgents}
          </span>
        </div>
        <div className="divide-y divide-[#333]">
          {agents.map((agent) => {
            const currentTask = getCurrentTask(agent);
            const statusInfo = getStatusInfo(agent.status);
            return (
              <div
                key={agent._id}
                className="px-3 py-2 hover:bg-muted cursor-pointer transition-colors flex items-center gap-2"
                onClick={() => onSelectAgent?.(agent._id)}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: statusInfo.color }}
                />
                <span className="text-sm">{agent.avatar}</span>
                <span className="text-sm font-medium text-white flex-1 truncate">
                  {agent.name}
                </span>
                <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                  {agent.status === "blocked"
                    ? "BLOCKED"
                    : agent.status === "idle"
                      ? `Idle`
                      : currentTask?.title ?? "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Full grid view
  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[var(--accent-orange)]">◇</span>
            <h2 className="text-lg font-semibold text-white tracking-wider">
              AGENT WORKLOAD
            </h2>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-green-500">🟢 {activeCount}/{totalAgents} ONLINE</span>
            <button className="text-muted-foreground hover:text-white">⟳ Refresh</button>
            <button className="text-muted-foreground hover:text-white">⚙️</button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Active:</span>
            <span className="text-white font-medium">{activeCount}</span>
          </div>
          <div className="w-px h-4 bg-[#333]" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-500" />
            <span className="text-muted-foreground">Idle:</span>
            <span className="text-white font-medium">{idleCount}</span>
          </div>
          <div className="w-px h-4 bg-[#333]" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-muted-foreground">Blocked:</span>
            <span className="text-white font-medium">{blockedCount}</span>
          </div>
          <div className="w-px h-4 bg-[#333]" />
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">✓</span>
            <span className="text-white font-medium">{tasksCompletedToday}</span>
            <span className="text-muted-foreground">tasks today</span>
          </div>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {agents.map((agent) => {
            const currentTask = getCurrentTask(agent);
            const statusInfo = getStatusInfo(agent.status);
            const levelColors = getLevelColors(agent.level);
            const tasksToday = getAgentTasksToday(agent._id);
            const emoji = agentEmojis[agent.name] ?? agent.avatar;

            return (
              <div
                key={agent._id}
                className={`bg-card rounded-xl border border-border overflow-hidden cursor-pointer transition-all hover:border-[#555] hover:shadow-lg ${
                  selectedAgentId === agent._id ? "ring-2 ring-[var(--accent-orange)]" : ""
                }`}
                onClick={() => {
                  setSelectedAgentId(agent._id);
                  onSelectAgent?.(agent._id);
                }}
              >
                {/* Card Header */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Status indicator */}
                    <div
                      className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        agent.status === "active" || agent.status === "blocked"
                          ? "animate-pulse"
                          : ""
                      }`}
                      style={{ backgroundColor: statusInfo.color }}
                    />

                    {/* Avatar */}
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${levelColors.bg} border ${levelColors.border}`}
                    >
                      {emoji}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-white">{agent.name}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${levelColors.bg} ${levelColors.text} border ${levelColors.border}`}
                        >
                          {agent.level}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{agent.role}</div>
                    </div>
                  </div>
                </div>

                {/* Current activity */}
                <div className="px-4 py-3 border-t border-border bg-[#151515]">
                  {agent.status === "blocked" ? (
                    <div className="text-red-400 font-medium text-sm">
                      🔴 BLOCKED
                    </div>
                  ) : agent.status === "idle" ? (
                    <div className="text-gray-500 text-sm">
                      ⚪ IDLE
                    </div>
                  ) : currentTask ? (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Currently:</div>
                      <div className="text-sm text-white truncate">
                        {currentTask.title}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">No active task</div>
                  )}
                </div>

                {/* Stats */}
                <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span>⏱️</span>
                    <span>
                      {agent.status === "active"
                        ? formatActiveTime(currentTask?.startedAt)
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span>✓</span>
                    <span>{tasksToday} today</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {agents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-4xl mb-4">⚫</span>
            <h3 className="text-lg font-medium text-white mb-2">No agents configured</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Configure agents in Mission Control to see their workload here.
            </p>
          </div>
        )}
      </div>

      {/* Footer help */}
      <div className="sticky bottom-0 bg-background border-t border-border px-6 py-2 text-xs text-gray-500">
        ↑↓/jk Navigate • Enter Details • / Search • ? Help
      </div>
    </div>
  );
};

export default AgentWorkloadView;

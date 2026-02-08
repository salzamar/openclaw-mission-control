import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

type PlannerWidgetProps = {
  variant?: "card" | "sidebar" | "header";
  onExpand?: () => void;
};

const PlannerWidget: React.FC<PlannerWidgetProps> = ({
  variant = "header",
  onExpand,
}) => {
  const plannerState = useQuery(api.plannerState.get);
  const objectives = useQuery(api.objectives.list, {});
  const updateStatus = useMutation(api.plannerState.updateStatus);
  const removeApproval = useMutation(api.plannerState.removeWaitingApproval);
  
  const [showApprovals, setShowApprovals] = useState(false);

  // Find current objective
  const currentObjective = objectives?.find(
    (o) => o.objectiveId === plannerState?.currentObjective
  );

  // Format last run time
  const formatLastRun = (isoString?: string) => {
    if (!isoString) return "Never";
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Status indicator
  const getStatusInfo = (status?: string) => {
    switch (status) {
      case "running":
        return { icon: "🟢", color: "#22c55e", label: "Running", pulse: true };
      case "paused":
        return { icon: "🟡", color: "#eab308", label: "Paused", pulse: false };
      case "completed":
        return { icon: "✓", color: "#3b82f6", label: "Completed", pulse: false };
      case "error":
        return { icon: "🔴", color: "#ef4444", label: "Error", pulse: true };
      default:
        return { icon: "⚫", color: "#6b7280", label: "Unknown", pulse: false };
    }
  };

  const statusInfo = getStatusInfo(plannerState?.status);
  const pendingCount = plannerState?.waitingApproval?.length ?? 0;

  // Header variant - compact inline widget
  if (variant === "header") {
    return (
      <div className="relative flex items-center gap-3 px-3 py-2 bg-card rounded-lg border border-border">
        {/* Status indicator */}
        <div
          className={`flex items-center gap-2 ${statusInfo.pulse ? "animate-pulse" : ""}`}
          style={{ color: statusInfo.color }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusInfo.color }}
          />
          <span className="text-xs font-semibold uppercase tracking-wider">
            {statusInfo.label}
          </span>
        </div>

        <div className="w-px h-4 bg-border" />

        {/* Iteration count */}
        <div className="text-xs text-muted-foreground">
          <span className="text-white font-medium">
            #{plannerState?.iterationCount ?? 0}
          </span>
        </div>

        <div className="w-px h-4 bg-border" />

        {/* Cost today */}
        <div className="text-xs text-muted-foreground">
          <span className="text-white font-medium">
            ${(plannerState?.costToday ?? 0).toFixed(2)}
          </span>
          <span className="ml-1">today</span>
        </div>

        {/* Pending approvals badge */}
        {pendingCount > 0 && (
          <>
            <div className="w-px h-4 bg-border" />
            <button
              onClick={() => setShowApprovals(!showApprovals)}
              className="flex items-center gap-1.5 px-2 py-1 bg-[#f9731620] rounded text-[var(--accent-orange)] hover:bg-accent transition-colors"
            >
              <span className="text-xs font-semibold">🔔 {pendingCount}</span>
            </button>
          </>
        )}

        {/* Toggle status button */}
        <button
          onClick={() => {
            const newStatus = plannerState?.status === "running" ? "paused" : "running";
            updateStatus({ status: newStatus });
          }}
          className="ml-1 p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-white"
          title={plannerState?.status === "running" ? "Pause planner" : "Resume planner"}
        >
          {plannerState?.status === "running" ? "⏸" : "▶"}
        </button>

        {/* Approvals dropdown */}
        {showApprovals && pendingCount > 0 && (
          <div className="absolute top-full right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-xl z-50">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Pending Approvals</span>
              <button
                onClick={() => setShowApprovals(false)}
                className="text-muted-foreground hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {plannerState?.waitingApproval?.map((approval, i) => (
                <div
                  key={i}
                  className="p-3 border-b border-border last:border-b-0 hover:bg-muted"
                >
                  <div className="text-sm text-white mb-1">{approval.taskId}</div>
                  <div className="text-xs text-muted-foreground mb-2">{approval.reason}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => removeApproval({ taskId: approval.taskId })}
                      className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => removeApproval({ taskId: approval.taskId })}
                      className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Card variant - full dashboard card
  if (variant === "card") {
    return (
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[var(--accent-orange)]">◇</span>
            <span className="text-xs font-bold tracking-wider text-muted-foreground">
              PLANNER STATUS
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-muted-foreground hover:text-white" title="Settings">
              ⚙️
            </button>
            {onExpand && (
              <button
                onClick={onExpand}
                className="text-muted-foreground hover:text-white"
                title="Expand"
              >
                ↗️
              </button>
            )}
          </div>
        </div>

        {/* Status row */}
        <div className="grid grid-cols-3 gap-4 p-4">
          <div className="text-center">
            <div
              className={`flex items-center justify-center gap-2 ${statusInfo.pulse ? "animate-pulse" : ""}`}
              style={{ color: statusInfo.color }}
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: statusInfo.color }}
              />
              <span className="font-semibold">{statusInfo.label}</span>
            </div>
            <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">
              Status
            </div>
          </div>

          <div className="text-center">
            <div className="text-white font-semibold">
              {formatLastRun(plannerState?.lastRun)}
            </div>
            <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">
              Last Run
            </div>
          </div>

          <div className="text-center">
            <div className="text-white font-semibold">
              #{plannerState?.iterationCount ?? 0}
            </div>
            <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">
              Iteration
            </div>
          </div>
        </div>

        {/* Current objective */}
        {currentObjective && (
          <div className="px-4 py-3 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              🎯 Current Objective
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-medium">{currentObjective.title}</span>
              <span className="text-sm text-muted-foreground">
                {currentObjective.progress}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-500"
                style={{ width: `${currentObjective.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Cost & Approvals */}
        <div className="grid grid-cols-2 gap-4 p-4 border-t border-border">
          <div>
            <div className="text-xs text-muted-foreground mb-1">💰 Cost Today</div>
            <div className="text-xl font-bold text-white">
              ${(plannerState?.costToday ?? 0).toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">🔔 Pending Approvals</div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white">{pendingCount}</span>
              {pendingCount > 0 && (
                <button
                  onClick={() => setShowApprovals(!showApprovals)}
                  className="text-xs text-[var(--accent-orange)] hover:underline"
                >
                  Review →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sidebar variant - compact vertical
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-xs font-bold tracking-wider text-muted-foreground">PLANNER</span>
        <button className="text-muted-foreground hover:text-white text-sm">⚙️</button>
      </div>

      <div className="p-3 border-b border-border">
        <div
          className={`flex items-center gap-2 ${statusInfo.pulse ? "animate-pulse" : ""}`}
          style={{ color: statusInfo.color }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusInfo.color }}
          />
          <span className="text-sm font-medium">{statusInfo.label}</span>
          <span className="text-gray-500 text-sm">
            • Iteration #{plannerState?.iterationCount ?? 0}
          </span>
        </div>
      </div>

      {currentObjective && (
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">🎯 {currentObjective.title}</span>
            <span className="text-white">{currentObjective.progress}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-600 to-orange-400"
              style={{ width: `${currentObjective.progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="p-3 border-b border-border text-sm">
        <div className="text-muted-foreground">💰 ${(plannerState?.costToday ?? 0).toFixed(2)} today</div>
        <div className="text-muted-foreground">📅 Last run: {formatLastRun(plannerState?.lastRun)}</div>
      </div>

      {pendingCount > 0 && (
        <div className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--accent-orange)]">
              🔔 {pendingCount} pending approvals
            </span>
            <button className="text-xs text-[var(--accent-orange)] hover:underline">
              Review →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlannerWidget;

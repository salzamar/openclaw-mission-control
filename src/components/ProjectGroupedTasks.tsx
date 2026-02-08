import React from "react";
import { Id } from "../../convex/_generated/dataModel";
import ProjectBadge from "./ProjectBadge";

type TaskPriority = "critical" | "high" | "normal" | "low";

interface Task {
  _id: Id<"tasks">;
  title: string;
  description: string;
  status: string;
  priority?: TaskPriority;
  projectId?: Id<"projects">;
  project?: {
    _id: Id<"projects">;
    name: string;
    color: string;
    icon: string;
  };
  assigneeIds: Id<"agents">[];
  tags: string[];
  borderColor?: string;
  lastMessageTime?: number;
}

interface ProjectTaskGroup {
  projectId?: string;
  projectName?: string;
  projectColor?: string;
  projectIcon?: string;
  tasks: Task[];
}

interface ProjectGroupedTasksProps {
  tasks: Task[];
  renderTask: (task: Task) => React.ReactNode;
  showProjectHeaders?: boolean;
}

const ProjectGroupedTasks: React.FC<ProjectGroupedTasksProps> = ({
  tasks,
  renderTask,
  showProjectHeaders = true,
}) => {
  // Group tasks by project
  const groupedTasks = tasks.reduce((groups, task) => {
    const projectKey = task.projectId || "no-project";
    
    if (!groups[projectKey]) {
      groups[projectKey] = {
        projectId: task.projectId,
        projectName: task.project?.name || "No Project",
        projectColor: task.project?.color || "#64748b",
        projectIcon: task.project?.icon || "📁",
        tasks: [],
      };
    }
    
    groups[projectKey].tasks.push(task);
    return groups;
  }, {} as Record<string, ProjectTaskGroup>);

  // Sort groups: No Project first, then alphabetically
  const sortedGroups = Object.values(groupedTasks).sort((a, b) => {
    if (!a.projectId && !b.projectId) return 0;
    if (!a.projectId) return -1;
    if (!b.projectId) return 1;
    return (a.projectName || "").localeCompare(b.projectName || "");
  });

  return (
    <>
      {sortedGroups.map((group) => (
        <div key={group.projectId || "no-project"} className="space-y-2">
          {showProjectHeaders && group.projectId && (
            <div className="flex items-center gap-2 px-1 pt-2 pb-1">
              <div className="h-px bg-border flex-1" />
              <ProjectBadge
                name={group.projectName || "No Project"}
                color={group.projectColor || "#64748b"}
                icon={group.projectIcon}
                size="small"
              />
              <div className="h-px bg-border flex-1" />
            </div>
          )}
          <div className="space-y-2">
            {group.tasks.map((task) => renderTask(task))}
          </div>
        </div>
      ))}
    </>
  );
};

export default ProjectGroupedTasks;
import React from "react";
import { Id } from "../../convex/_generated/dataModel";
import TaskCard from "./TaskCard";
import ProjectGroupedTasks from "./ProjectGroupedTasks";

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

interface TaskListProps {
  tasks: Task[];
  selectedProjectId?: Id<"projects"> | null;
  selectedTaskId: Id<"tasks"> | null;
  onSelectTask: (id: Id<"tasks">) => void;
  getAgentName: (id: string) => string;
  formatRelativeTime: (timestamp: number | null) => string;
  columnId: string;
  currentUserAgentId?: Id<"agents">;
  onArchive?: (taskId: Id<"tasks">) => void;
  onPlay?: (taskId: Id<"tasks">) => void;
  flattenedTasks: Array<{ task: Task; columnIndex: number }>;
  focusedTaskIndex: number;
  onRegisterTaskRef: (taskId: string, element: HTMLDivElement | null) => void;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  selectedProjectId,
  selectedTaskId,
  onSelectTask,
  getAgentName,
  formatRelativeTime,
  columnId,
  currentUserAgentId,
  onArchive,
  onPlay,
  flattenedTasks,
  focusedTaskIndex,
  onRegisterTaskRef,
}) => {
  const renderTaskCard = (task: Task) => {
    const flatIndex = flattenedTasks.findIndex(ft => ft.task._id === task._id);
    const isFocused = focusedTaskIndex === flatIndex;
    
    return (
      <TaskCard
        key={task._id}
        ref={(el) => onRegisterTaskRef(task._id, el)}
        task={task}
        isSelected={selectedTaskId === task._id}
        isFocused={isFocused}
        onClick={() => onSelectTask(task._id)}
        getAgentName={getAgentName}
        formatRelativeTime={formatRelativeTime}
        columnId={columnId}
        currentUserAgentId={currentUserAgentId}
        onArchive={onArchive}
        onPlay={onPlay}
        tabIndex={isFocused ? 0 : -1}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelectTask(task._id);
          }
        }}
      />
    );
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="text-3xl mb-2">📥</div>
        <div className="text-xs text-muted-foreground">No tasks</div>
      </div>
    );
  }

  // When project filter is active, show flat list
  if (selectedProjectId !== undefined) {
    return <>{tasks.map(renderTaskCard)}</>;
  }

  // Otherwise, group by project
  return (
    <ProjectGroupedTasks
      tasks={tasks}
      renderTask={renderTaskCard}
      showProjectHeaders={true}
    />
  );
};

export default TaskList;
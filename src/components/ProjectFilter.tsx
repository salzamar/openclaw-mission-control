import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import ProjectBadge from "./ProjectBadge";
import { IconChevronDown, IconFolder, IconFolderOff } from "@tabler/icons-react";

interface ProjectFilterProps {
  selectedProjectId?: Id<"projects"> | null;
  onSelectProject: (projectId: Id<"projects"> | undefined) => void;
  taskCounts?: Record<string, number>;
  className?: string;
}

const ProjectFilter: React.FC<ProjectFilterProps> = ({
  selectedProjectId,
  onSelectProject,
  taskCounts = {},
  className = "",
}) => {
  const projects = useQuery(api.projects.listProjects);
  const [isOpen, setIsOpen] = useState(false);

  // Get selected project details
  const selectedProject = projects?.find((p) => p._id === selectedProjectId);

  // Calculate total tasks with projects
  const totalProjectTasks = Object.entries(taskCounts)
    .filter(([projectId]) => projectId !== "undefined")
    .reduce((sum, [, count]) => sum + count, 0);

  // Calculate tasks without projects
  const noProjectTasks = taskCounts["undefined"] || 0;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg bg-white hover:bg-muted/50 transition-colors"
      >
        {selectedProject ? (
          <>
            <ProjectBadge
              name={selectedProject.name}
              color={selectedProject.color}
              icon={selectedProject.icon}
            />
          </>
        ) : (
          <>
            <IconFolder size={16} className="text-muted-foreground" />
            <span className="text-muted-foreground">All Projects</span>
          </>
        )}
        <IconChevronDown
          size={16}
          className={`text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-border rounded-lg shadow-lg z-50">
          <div className="p-2">
            {/* All Projects Option */}
            <button
              onClick={() => {
                onSelectProject(undefined);
                setIsOpen(false);
              }}
              className={`
                w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors
                ${selectedProjectId === undefined
                  ? "bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]"
                  : "hover:bg-muted/50"
                }
              `}
            >
              <IconFolder size={16} />
              <span className="flex-1 text-left">All Projects</span>
              <span className="text-xs text-muted-foreground">
                {totalProjectTasks + noProjectTasks}
              </span>
            </button>

            {/* Projects with Tasks */}
            {projects
              ?.filter((project) => taskCounts[project._id] > 0)
              .map((project) => (
                <button
                  key={project._id}
                  onClick={() => {
                    onSelectProject(project._id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors
                    ${selectedProjectId === project._id
                      ? "bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]"
                      : "hover:bg-muted/50"
                    }
                  `}
                >
                  <span>{project.icon}</span>
                  <span className="flex-1 text-left">{project.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {taskCounts[project._id] || 0}
                  </span>
                </button>
              ))}

            {/* No Project Option */}
            {noProjectTasks > 0 && (
              <button
                onClick={() => {
                  onSelectProject(undefined);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors
                  ${selectedProjectId === null
                    ? "bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]"
                    : "hover:bg-muted/50"
                  }
                `}
              >
                <IconFolderOff size={16} />
                <span className="flex-1 text-left">No Project</span>
                <span className="text-xs text-muted-foreground">
                  {noProjectTasks}
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectFilter;
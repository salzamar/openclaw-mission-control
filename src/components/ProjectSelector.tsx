import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import ProjectBadge from "./ProjectBadge";
import { IconPlus, IconSearch, IconX } from "@tabler/icons-react";

interface ProjectSelectorProps {
  value?: Id<"projects">;
  onChange: (projectId: Id<"projects"> | undefined) => void;
  allowCreate?: boolean;
  placeholder?: string;
  className?: string;
}

const PROJECT_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#64748b", // gray
];

const PROJECT_ICONS = [
  "📁", "🚀", "💼", "📊", "🎯", "💡", "🔧", "📱",
  "🌐", "💻", "📈", "🎨", "📝", "🔍", "⚡", "🏗️",
];

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  value,
  onChange,
  allowCreate = true,
  placeholder = "Select a project...",
  className = "",
}) => {
  const projects = useQuery(api.projects.listProjects);
  const createProject = useMutation(api.projects.createProject);
  
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);
  const [newProjectIcon, setNewProjectIcon] = useState(PROJECT_ICONS[0]);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const selectedProject = projects?.find((p) => p._id === value);

  const filteredProjects = projects?.filter((project) =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    
    try {
      const projectId = await createProject({
        name: newProjectName.trim(),
        color: newProjectColor,
        icon: newProjectIcon,
      });
      onChange(projectId);
      setIsOpen(false);
      setNewProjectName("");
      setIsCreating(false);
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between px-3 py-2 text-sm 
          border border-border rounded-lg bg-white hover:bg-muted/50 
          focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] 
          focus:border-transparent transition-colors ${className}
        `}
      >
        {selectedProject ? (
          <ProjectBadge
            name={selectedProject.name}
            color={selectedProject.color}
            icon={selectedProject.icon}
          />
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <IconSearch size={16} className="text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <IconSearch
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search projects..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent"
              />
            </div>
          </div>

          {/* Projects List */}
          <div className="overflow-y-auto max-h-48">
            {filteredProjects.length > 0 ? (
              filteredProjects.map((project) => (
                <button
                  key={project._id}
                  onClick={() => {
                    onChange(project._id);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 text-sm 
                    hover:bg-muted/50 transition-colors
                    ${value === project._id ? "bg-[var(--accent-blue)]/10" : ""}
                  `}
                >
                  <ProjectBadge
                    name={project.name}
                    color={project.color}
                    icon={project.icon}
                  />
                  {value === project._id && (
                    <span className="text-[var(--accent-blue)] text-xs font-semibold">
                      ✓
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                No projects found
              </div>
            )}
          </div>

          {/* Create New Project */}
          {allowCreate && (
            <>
              {!isCreating ? (
                <div className="p-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsCreating(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/10 rounded-lg transition-colors"
                  >
                    <IconPlus size={16} />
                    Create new project
                  </button>
                </div>
              ) : (
                <div className="p-3 border-t border-border space-y-3">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Project name"
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCreateProject();
                      }
                    }}
                  />
                  
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      COLOR
                    </label>
                    <div className="flex gap-2">
                      {PROJECT_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewProjectColor(color)}
                          className={`
                            w-8 h-8 rounded-full border-2 transition-all
                            ${newProjectColor === color
                              ? "border-foreground scale-110"
                              : "border-white hover:scale-105"
                            }
                          `}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      ICON
                    </label>
                    <div className="grid grid-cols-8 gap-2">
                      {PROJECT_ICONS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setNewProjectIcon(icon)}
                          className={`
                            w-8 h-8 rounded-lg border transition-all flex items-center justify-center
                            ${newProjectIcon === icon
                              ? "border-[var(--accent-blue)] bg-[var(--accent-blue)]/10"
                              : "border-border hover:bg-muted"
                            }
                          `}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreating(false);
                        setNewProjectName("");
                      }}
                      className="flex-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateProject}
                      disabled={!newProjectName.trim()}
                      className="flex-1 px-3 py-2 text-sm font-semibold text-white bg-[var(--accent-blue)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Create
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Clear Selection */}
          {value && (
            <div className="p-2 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  onChange(undefined);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <IconX size={16} />
                Clear project
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectSelector;
import React from "react";

interface ProjectBadgeProps {
  name: string;
  color: string;
  icon?: string;
  count?: number;
  onClick?: () => void;
  size?: "small" | "medium" | "large";
  className?: string;
}

const ProjectBadge: React.FC<ProjectBadgeProps> = ({
  name,
  color,
  icon = "📁",
  count,
  onClick,
  size = "medium",
  className = "",
}) => {
  const sizeClasses = {
    small: "px-2 py-0.5 text-[10px]",
    medium: "px-2.5 py-1 text-[11px]",
    large: "px-3 py-1.5 text-sm",
  };

  return (
    <span
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 rounded-full font-semibold border transition-all
        ${sizeClasses[size]}
        ${onClick ? "cursor-pointer hover:shadow-md" : ""}
        ${className}
      `}
      style={{
        backgroundColor: `${color}20`,
        borderColor: `${color}40`,
        color: color,
      }}
      title={`${name}${count ? ` (${count} tasks)` : ""}`}
    >
      <span>{icon}</span>
      <span>{name}</span>
      {count !== undefined && (
        <span className="ml-0.5 text-muted-foreground">({count})</span>
      )}
    </span>
  );
};

export default ProjectBadge;
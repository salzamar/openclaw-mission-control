import React, { forwardRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Id } from "../../convex/_generated/dataModel";
import { 
	IconArchive, 
	IconPlayerPlay, 
	IconLoader2, 
	IconDotsVertical,
	IconGripVertical,
} from "@tabler/icons-react";

type TaskPriority = "critical" | "high" | "normal" | "low";

interface Task {
	_id: Id<"tasks">;
	title: string;
	description: string;
	status: string;
	priority?: TaskPriority;
	assigneeIds: Id<"agents">[];
	tags: string[];
	borderColor?: string;
	lastMessageTime?: number;
}

interface TaskCardProps {
	task: Task;
	isSelected: boolean;
	isFocused?: boolean;
	onClick: () => void;
	getAgentName: (id: string) => string;
	formatRelativeTime: (timestamp: number | null) => string;
	columnId: string;
	currentUserAgentId?: Id<"agents">;
	onArchive?: (taskId: Id<"tasks">) => void;
	onPlay?: (taskId: Id<"tasks">) => void;
	isOverlay?: boolean;
	tabIndex?: number;
	onKeyDown?: (e: React.KeyboardEvent) => void;
}

const priorityConfig: Record<TaskPriority, { icon: string; label: string; className: string; badgeClass: string }> = {
	critical: {
		icon: "🔴",
		label: "Critical",
		className: "text-red-600",
		badgeClass: "bg-red-100 text-red-700 border-red-200",
	},
	high: {
		icon: "🟡",
		label: "High",
		className: "text-yellow-600",
		badgeClass: "bg-yellow-50 text-yellow-700 border-yellow-200",
	},
	normal: {
		icon: "🟢",
		label: "Normal",
		className: "text-green-600",
		badgeClass: "bg-green-50 text-green-700 border-green-200",
	},
	low: {
		icon: "🔵",
		label: "Low",
		className: "text-blue-500",
		badgeClass: "bg-blue-50 text-blue-600 border-blue-200",
	},
};

const TaskCard = forwardRef<HTMLDivElement, TaskCardProps>(({
	task,
	isSelected,
	isFocused = false,
	onClick,
	getAgentName,
	formatRelativeTime,
	columnId,
	currentUserAgentId,
	onArchive,
	onPlay,
	isOverlay = false,
	tabIndex = 0,
	onKeyDown,
}, ref) => {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		isDragging,
	} = useDraggable({
		id: task._id,
		data: { task },
	});

	const style = transform
		? {
				transform: CSS.Translate.toString(transform),
		  }
		: undefined;

	const priority = task.priority || "normal";
	const priorityInfo = priorityConfig[priority];

	// Combine refs
	const combinedRef = (node: HTMLDivElement | null) => {
		setNodeRef(node);
		if (typeof ref === 'function') {
			ref(node);
		} else if (ref) {
			ref.current = node;
		}
	};

	return (
		<div
			ref={combinedRef}
			style={{
				...style,
				borderLeft:
					isSelected || isOverlay
						? undefined
						: `4px solid ${task.borderColor || "transparent"}`,
			}}
			className={`bg-white rounded-lg p-4 shadow-sm flex flex-col gap-3 border transition-all cursor-pointer select-none ${
				isDragging ? "dragging-card" : "hover:-translate-y-0.5 hover:shadow-md"
			} ${
				isSelected
					? "ring-2 ring-[var(--accent-blue)] border-transparent"
					: isFocused
					? "ring-2 ring-[var(--accent-orange)] border-transparent"
					: "border-border"
			} ${columnId === "archived" ? "opacity-60" : ""} ${
				columnId === "in_progress" ? "card-running" : ""
			} ${isOverlay ? "drag-overlay" : ""} ${
				priority === "critical" ? "shadow-red-100" : ""
			}`}
			onClick={onClick}
			onKeyDown={onKeyDown}
			aria-label={`Task: ${task.title}. Priority: ${priorityInfo.label}. ${task.assigneeIds.length > 0 ? `Assigned to ${getAgentName(task.assigneeIds[0] as string)}` : "Unassigned"}`}
			{...listeners}
			{...attributes}
			tabIndex={tabIndex}
			role="button"
		>
			{/* Header Row: Priority Badge + Actions */}
			<div className="flex justify-between items-start">
				{/* Priority Badge */}
				<div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${priorityInfo.badgeClass}`}>
					<span>{priorityInfo.icon}</span>
					<span>{priorityInfo.label}</span>
				</div>

				{/* Action Buttons */}
				<div className="flex items-center gap-1">
					{/* Play/Start Button - for inbox/assigned tasks */}
					{(columnId === "inbox" || columnId === "assigned") && currentUserAgentId && onPlay && (
						<button
							onClick={(e) => {
								e.stopPropagation();
								onPlay(task._id);
							}}
							className="p-1.5 hover:bg-[var(--accent-blue)] hover:text-white rounded-md transition-colors text-muted-foreground group relative"
							title="Start task (run agent)"
							aria-label="Start task"
						>
							<IconPlayerPlay size={14} />
							<span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
								Start task
							</span>
						</button>
					)}

					{/* Running Indicator - for in_progress tasks */}
					{columnId === "in_progress" && (
						<span 
							className="p-1.5 text-[var(--accent-blue)] relative group"
							title="Task is running"
						>
							<IconLoader2 size={14} className="animate-spin" />
							<span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
								Running...
							</span>
						</span>
					)}

					{/* Archive Button - for done tasks */}
					{columnId === "done" && currentUserAgentId && onArchive && (
						<button
							onClick={(e) => {
								e.stopPropagation();
								onArchive(task._id);
							}}
							className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground group relative"
							title="Archive task"
							aria-label="Archive task"
						>
							<IconArchive size={14} />
							<span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
								Archive
							</span>
						</button>
					)}

					{/* More Actions Menu */}
					<button
						onClick={(e) => {
							e.stopPropagation();
							// TODO: Open action menu
						}}
						className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground group relative"
						title="More actions"
						aria-label="More actions"
					>
						<IconDotsVertical size={14} />
						<span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
							More actions
						</span>
					</button>

					{/* Drag Handle */}
					<span
						className="p-1 text-muted-foreground/50 cursor-grab active:cursor-grabbing"
						title="Drag to move"
					>
						<IconGripVertical size={14} />
					</span>
				</div>
			</div>

			{/* Task Title */}
			<h3 className="text-sm font-semibold text-foreground leading-tight">
				{task.title}
			</h3>

			{/* Task Description */}
			<p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
				{task.description}
			</p>

			{/* Footer: Assignee + Timestamp */}
			<div className="flex justify-between items-center mt-1">
				{task.assigneeIds && task.assigneeIds.length > 0 ? (
					<div className="flex items-center gap-1.5">
						<span className="text-xs">👤</span>
						<span className="text-[11px] font-semibold text-foreground">
							{getAgentName(task.assigneeIds[0] as string)}
						</span>
					</div>
				) : (
					<span className="text-[11px] text-muted-foreground italic">Unassigned</span>
				)}
				{task.lastMessageTime && (
					<span className="text-[11px] text-muted-foreground">
						{formatRelativeTime(task.lastMessageTime)}
					</span>
				)}
			</div>

			{/* Tags */}
			{task.tags.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{task.tags.map((tag) => (
						<span
							key={tag}
							className="text-[10px] px-2 py-0.5 bg-muted rounded font-medium text-muted-foreground"
						>
							{tag}
						</span>
					))}
				</div>
			)}
		</div>
	);
});

TaskCard.displayName = "TaskCard";

export default TaskCard;

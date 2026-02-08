import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { IconArchive } from "@tabler/icons-react";
import {
	DndContext,
	DragOverlay,
	PointerSensor,
	useSensor,
	useSensors,
	DragStartEvent,
	DragEndEvent,
} from "@dnd-kit/core";
import TaskCard from "./TaskCard";
import KanbanColumn from "./KanbanColumn";
import SearchFilterBar from "./SearchFilterBar";

type TaskStatus = "inbox" | "assigned" | "in_progress" | "review" | "done" | "archived";
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

function formatRelativeTime(timestamp: number | null): string {
	if (!timestamp) return "";

	const now = Date.now();
	const diff = now - timestamp;

	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (seconds < 60) return "just now";
	if (minutes < 60) return `${minutes}m ago`;
	if (hours < 24) return `${hours}h ago`;
	if (days < 7) return `${days}d ago`;

	return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const columns = [
	{ id: "inbox", label: "INBOX", color: "var(--text-subtle)" },
	{ id: "assigned", label: "ASSIGNED", color: "var(--accent-orange)" },
	{ id: "in_progress", label: "IN PROGRESS", color: "var(--accent-blue)" },
	{ id: "review", label: "REVIEW", color: "var(--text-main)" },
	{ id: "done", label: "DONE", color: "var(--accent-green)" },
];

const archivedColumn = { id: "archived", label: "ARCHIVED", color: "var(--text-subtle)" };

interface MissionQueueProps {
	selectedTaskId: Id<"tasks"> | null;
	onSelectTask: (id: Id<"tasks">) => void;
}

const MissionQueue: React.FC<MissionQueueProps> = ({ selectedTaskId, onSelectTask }) => {
	const tasks = useQuery(api.queries.listTasks);
	const agents = useQuery(api.queries.listAgents);
	const archiveTask = useMutation(api.tasks.archiveTask);
	const updateStatus = useMutation(api.tasks.updateStatus);
	const linkRun = useMutation(api.tasks.linkRun);
	const [showArchived, setShowArchived] = useState(false);
	const convex = useConvex();
	const [activeTask, setActiveTask] = useState<Task | null>(null);

	// Search and filter state
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedTags, setSelectedTags] = useState<string[]>([]);
	const [selectedAssignees, setSelectedAssignees] = useState<Id<"agents">[]>([]);
	const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);

	// Keyboard navigation state
	const [focusedTaskIndex, setFocusedTaskIndex] = useState<number>(-1);
	const [focusedColumnIndex, setFocusedColumnIndex] = useState<number>(0);
	const taskRefs = useRef<Map<string, HTMLDivElement>>(new Map());
	const containerRef = useRef<HTMLDivElement>(null);

	const currentUserAgent = agents?.find(a => a.name === "Manish");

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8, // 8px movement required to start drag
			},
		})
	);

	// Extract all unique tags from tasks
	const availableTags = useMemo(() => {
		if (!tasks) return [];
		const tagSet = new Set<string>();
		tasks.forEach(task => {
			task.tags.forEach(tag => tagSet.add(tag));
		});
		return Array.from(tagSet).sort();
	}, [tasks]);

	// Filter tasks based on search and filters
	const filteredTasks = useMemo(() => {
		if (!tasks) return [];

		return tasks.filter((task) => {
			// Search filter (title + description)
			if (searchQuery) {
				const query = searchQuery.toLowerCase();
				const matchesSearch = 
					task.title.toLowerCase().includes(query) ||
					task.description.toLowerCase().includes(query);
				if (!matchesSearch) return false;
			}

			// Tag filter
			if (selectedTags.length > 0) {
				const hasMatchingTag = selectedTags.some(tag => task.tags.includes(tag));
				if (!hasMatchingTag) return false;
			}

			// Assignee filter
			if (selectedAssignees.length > 0) {
				const hasMatchingAssignee = selectedAssignees.some(
					agentId => task.assigneeIds.includes(agentId)
				);
				if (!hasMatchingAssignee) return false;
			}

			// Priority filter
			if (selectedPriorities.length > 0) {
				const taskPriority = task.priority || "normal";
				if (!selectedPriorities.includes(taskPriority)) return false;
			}

			return true;
		});
	}, [tasks, searchQuery, selectedTags, selectedAssignees, selectedPriorities]);

	// Get tasks for each column
	const getColumnTasks = useCallback((columnId: string) => {
		return filteredTasks.filter(t => t.status === columnId);
	}, [filteredTasks]);

	// Flatten tasks for keyboard navigation
	const flattenedTasks = useMemo(() => {
		const displayColumns = showArchived ? [...columns, archivedColumn] : columns;
		const result: { task: Task; columnIndex: number }[] = [];
		
		displayColumns.forEach((col, colIndex) => {
			const colTasks = getColumnTasks(col.id);
			colTasks.forEach(task => {
				result.push({ task: task as Task, columnIndex: colIndex });
			});
		});
		
		return result;
	}, [getColumnTasks, showArchived]);

	// Keyboard navigation handler
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Only handle keyboard navigation when not in an input
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
				return;
			}

			const displayColumns = showArchived ? [...columns, archivedColumn] : columns;

			switch (e.key) {
				case "ArrowDown":
				case "j": // Vim-style navigation
					e.preventDefault();
					setFocusedTaskIndex(prev => {
						const next = prev + 1;
						return next < flattenedTasks.length ? next : prev;
					});
					break;

				case "ArrowUp":
				case "k": // Vim-style navigation
					e.preventDefault();
					setFocusedTaskIndex(prev => {
						const next = prev - 1;
						return next >= 0 ? next : 0;
					});
					break;

				case "ArrowRight":
				case "l": // Vim-style navigation
					e.preventDefault();
					setFocusedColumnIndex(prev => {
						const next = prev + 1;
						return next < displayColumns.length ? next : prev;
					});
					// Find first task in new column
					{
						const newColId = displayColumns[Math.min(focusedColumnIndex + 1, displayColumns.length - 1)].id;
						const firstTaskIndex = flattenedTasks.findIndex(
							({ task }) => task.status === newColId
						);
						if (firstTaskIndex >= 0) {
							setFocusedTaskIndex(firstTaskIndex);
						}
					}
					break;

				case "ArrowLeft":
				case "h": // Vim-style navigation
					e.preventDefault();
					setFocusedColumnIndex(prev => {
						const next = prev - 1;
						return next >= 0 ? next : 0;
					});
					// Find first task in new column
					{
						const newColId = displayColumns[Math.max(focusedColumnIndex - 1, 0)].id;
						const firstTaskIndex = flattenedTasks.findIndex(
							({ task }) => task.status === newColId
						);
						if (firstTaskIndex >= 0) {
							setFocusedTaskIndex(firstTaskIndex);
						}
					}
					break;

				case "Enter":
				case " ": // Space to select
					e.preventDefault();
					if (focusedTaskIndex >= 0 && focusedTaskIndex < flattenedTasks.length) {
						const { task } = flattenedTasks[focusedTaskIndex];
						onSelectTask(task._id);
					}
					break;

				case "Escape":
					e.preventDefault();
					setFocusedTaskIndex(-1);
					break;

				case "/": // Quick search
					e.preventDefault();
					const searchInput = document.querySelector('input[placeholder="Search tasks..."]') as HTMLInputElement;
					if (searchInput) {
						searchInput.focus();
					}
					break;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [flattenedTasks, focusedTaskIndex, focusedColumnIndex, showArchived, onSelectTask]);

	// Scroll focused task into view
	useEffect(() => {
		if (focusedTaskIndex >= 0 && focusedTaskIndex < flattenedTasks.length) {
			const { task } = flattenedTasks[focusedTaskIndex];
			const element = taskRefs.current.get(task._id);
			if (element) {
				element.scrollIntoView({ behavior: "smooth", block: "nearest" });
				element.focus();
			}
		}
	}, [focusedTaskIndex, flattenedTasks]);

	if (tasks === undefined || agents === undefined) {
		return (
			<main className="[grid-area:main] bg-secondary flex flex-col overflow-hidden animate-pulse">
				<div className="h-[65px] bg-white border-b border-border" />
				<div className="flex-1 grid grid-cols-5 gap-px bg-border">
					{[...Array(5)].map((_, i) => (
						<div key={i} className="bg-secondary" />
					))}
				</div>
			</main>
		);
	}

	const getAgentName = (id: string) => {
		return agents.find((a) => a._id === id)?.name || "Unknown";
	};

	const handleDragStart = (event: DragStartEvent) => {
		const task = tasks.find((t) => t._id === event.active.id);
		if (task) {
			setActiveTask(task as Task);
		}
	};

	const handleDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event;
		setActiveTask(null);

		if (!over || !currentUserAgent) return;

		const taskId = active.id as Id<"tasks">;
		const newStatus = over.id as TaskStatus;
		const task = tasks.find((t) => t._id === taskId);

		if (task && task.status !== newStatus) {
			await updateStatus({
				taskId,
				status: newStatus,
				agentId: currentUserAgent._id,
			});
		}
	};

	const handleArchive = (taskId: Id<"tasks">) => {
		if (currentUserAgent) {
			archiveTask({ taskId, agentId: currentUserAgent._id });
		}
	};

	const buildAgentPreamble = (task: Task) => {
		const assignee = task.assigneeIds.length > 0
			? agents.find(a => a._id === task.assigneeIds[0])
			: null;
		if (!assignee) return "";

		const parts: string[] = [];
		if (assignee.systemPrompt) parts.push(`System Prompt:\n${assignee.systemPrompt}`);
		if (assignee.character) parts.push(`Character:\n${assignee.character}`);
		if (assignee.lore) parts.push(`Lore:\n${assignee.lore}`);

		return parts.length > 0 ? parts.join("\n\n") + "\n\n---\n\n" : "";
	};

	const buildPrompt = async (task: Task) => {
		let prompt = buildAgentPreamble(task);

		prompt += task.description && task.description !== task.title
			? `${task.title}\n\n${task.description}`
			: task.title;

		const messages = await convex.query(api.queries.listMessages, { taskId: task._id });
		if (messages && messages.length > 0) {
			const sorted = [...messages].sort((a, b) => a._creationTime - b._creationTime);
			const thread = sorted.map(m => `[${m.agentName}]: ${m.content}`).join("\n\n");
			prompt += `\n\n---\nConversation:\n${thread}\n---\nContinue working on this task based on the conversation above.`;
		}

		return prompt;
	};

	const triggerAgent = async (taskId: Id<"tasks">, message: string) => {
		try {
			const res = await fetch("/hooks/agent", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${import.meta.env.VITE_OPENCLAW_HOOK_TOKEN || ""}`,
				},
				body: JSON.stringify({
					message,
					sessionKey: `mission:${taskId}`,
					name: "MissionControl",
					wakeMode: "now",
				}),
			});

			if (res.ok) {
				const data = await res.json();
				if (data.runId) {
					await linkRun({ taskId, openclawRunId: data.runId });
				}
			}
		} catch (err) {
			console.error("[MissionQueue] Failed to trigger openclaw agent:", err);
		}
	};

	const handlePlay = async (taskId: Id<"tasks">) => {
		if (!currentUserAgent) return;

		await updateStatus({ taskId, status: "in_progress", agentId: currentUserAgent._id });

		const task = tasks.find((t) => t._id === taskId);
		if (!task) return;

		const message = await buildPrompt(task as Task);
		await triggerAgent(taskId, message);
	};

	const displayColumns = showArchived ? [...columns, archivedColumn] : columns;
	const archivedCount = filteredTasks.filter((t) => t.status === "archived").length;
	const totalFiltered = filteredTasks.filter((t) => t.status !== "done" && t.status !== "archived").length;

	// Register task ref for keyboard navigation
	const registerTaskRef = (taskId: string, element: HTMLDivElement | null) => {
		if (element) {
			taskRefs.current.set(taskId, element);
		} else {
			taskRefs.current.delete(taskId);
		}
	};

	return (
		<main className="[grid-area:main] bg-secondary flex flex-col overflow-hidden" ref={containerRef}>
			{/* Header with stats */}
			<div className="flex items-center justify-between px-6 py-5 bg-white border-b border-border">
				<div className="text-[11px] font-bold tracking-widest text-muted-foreground flex items-center gap-2">
					<span className="w-1.5 h-1.5 bg-[var(--accent-orange)] rounded-full" />{" "}
					MISSION QUEUE
				</div>
				<div className="flex gap-2 items-center">
					{/* Keyboard shortcuts hint */}
					<div className="hidden md:flex items-center gap-1 text-[10px] text-muted-foreground mr-2">
						<kbd className="px-1.5 py-0.5 bg-muted rounded text-[9px] font-mono">↑↓</kbd>
						<span>navigate</span>
						<kbd className="px-1.5 py-0.5 bg-muted rounded text-[9px] font-mono ml-2">Enter</kbd>
						<span>select</span>
						<kbd className="px-1.5 py-0.5 bg-muted rounded text-[9px] font-mono ml-2">/</kbd>
						<span>search</span>
					</div>
					
					<div className="text-[11px] font-semibold px-3 py-1 rounded bg-muted text-muted-foreground flex items-center gap-1.5">
						<span className="text-sm">📦</span>{" "}
						{filteredTasks.filter((t) => t.status === "inbox").length}
					</div>
					<div className="text-[11px] font-semibold px-3 py-1 rounded bg-[#f0f0f0] text-[#999]">
						{totalFiltered} active
					</div>
					<button
						onClick={() => setShowArchived(!showArchived)}
						className={`text-[11px] font-semibold px-3 py-1 rounded flex items-center gap-1.5 transition-colors ${
							showArchived
								? "bg-[var(--accent-blue)] text-white"
								: "bg-[#f0f0f0] text-[#999] hover:bg-[#e5e5e5]"
						}`}
					>
						<IconArchive size={14} />
						{showArchived ? "Hide Archived" : "Show Archived"}
						{archivedCount > 0 && (
							<span className={`px-1.5 rounded-full text-[10px] ${showArchived ? "bg-white/20" : "bg-[#d0d0d0]"}`}>
								{archivedCount}
							</span>
						)}
					</button>
				</div>
			</div>

			{/* Search and Filter Bar */}
			<SearchFilterBar
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				selectedTags={selectedTags}
				onTagsChange={setSelectedTags}
				selectedAssignees={selectedAssignees}
				onAssigneesChange={setSelectedAssignees}
				selectedPriorities={selectedPriorities}
				onPrioritiesChange={setSelectedPriorities}
				availableTags={availableTags}
				availableAgents={(agents ?? []).map(a => ({ _id: a._id, name: a.name, avatar: a.avatar }))}
			/>

			<DndContext
				sensors={sensors}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
			>
				<div 
					className={`flex-1 grid gap-px bg-border overflow-x-auto ${showArchived ? "grid-cols-6" : "grid-cols-5"}`}
					role="region"
					aria-label="Task board"
				>
					{displayColumns.map((col) => {
						const columnTasks = getColumnTasks(col.id);
						return (
							<KanbanColumn
								key={col.id}
								column={col}
								taskCount={columnTasks.length}
							>
								{columnTasks.length === 0 ? (
									<div className="flex flex-col items-center justify-center py-8 text-center">
										<div className="text-3xl mb-2">📥</div>
										<div className="text-xs text-muted-foreground">No tasks</div>
										{(searchQuery || selectedTags.length > 0 || selectedAssignees.length > 0 || selectedPriorities.length > 0) && (
											<div className="text-[10px] text-muted-foreground mt-1">
												Try adjusting filters
											</div>
										)}
									</div>
								) : (
									columnTasks.map((task) => {
										const flatIndex = flattenedTasks.findIndex(ft => ft.task._id === task._id);
										const isFocused = focusedTaskIndex === flatIndex;
										
										return (
											<TaskCard
												key={task._id}
												ref={(el) => registerTaskRef(task._id, el)}
												task={task as Task}
												isSelected={selectedTaskId === task._id}
												isFocused={isFocused}
												onClick={() => onSelectTask(task._id)}
												getAgentName={getAgentName}
												formatRelativeTime={formatRelativeTime}
												columnId={col.id}
												currentUserAgentId={currentUserAgent?._id}
												onArchive={handleArchive}
												onPlay={handlePlay}
												tabIndex={isFocused ? 0 : -1}
												onKeyDown={(e) => {
													if (e.key === "Enter" || e.key === " ") {
														e.preventDefault();
														onSelectTask(task._id);
													}
												}}
											/>
										);
									})
								)}
							</KanbanColumn>
						);
					})}
				</div>

				<DragOverlay>
					{activeTask ? (
						<TaskCard
							task={activeTask}
							isSelected={false}
							onClick={() => {}}
							getAgentName={getAgentName}
							formatRelativeTime={formatRelativeTime}
							columnId={activeTask.status}
							isOverlay={true}
						/>
					) : null}
				</DragOverlay>
			</DndContext>
		</main>
	);
};

export default MissionQueue;

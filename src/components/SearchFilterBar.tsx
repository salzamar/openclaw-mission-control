import React, { useState, useRef, useEffect } from "react";
import { IconSearch, IconX, IconChevronDown } from "@tabler/icons-react";
import { Id } from "../../convex/_generated/dataModel";

interface Agent {
	_id: Id<"agents">;
	name: string;
	avatar: string;
}

interface SearchFilterBarProps {
	searchQuery: string;
	onSearchChange: (query: string) => void;
	selectedTags: string[];
	onTagsChange: (tags: string[]) => void;
	selectedAssignees: Id<"agents">[];
	onAssigneesChange: (assignees: Id<"agents">[]) => void;
	selectedPriorities: string[];
	onPrioritiesChange: (priorities: string[]) => void;
	availableTags: string[];
	availableAgents: Agent[];
}

const priorities = [
	{ id: "critical", label: "Critical", icon: "🔴" },
	{ id: "high", label: "High", icon: "🟡" },
	{ id: "normal", label: "Normal", icon: "🟢" },
	{ id: "low", label: "Low", icon: "🔵" },
];

const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
	searchQuery,
	onSearchChange,
	selectedTags,
	onTagsChange,
	selectedAssignees,
	onAssigneesChange,
	selectedPriorities,
	onPrioritiesChange,
	availableTags,
	availableAgents,
}) => {
	const [showTagDropdown, setShowTagDropdown] = useState(false);
	const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
	const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
	
	const tagDropdownRef = useRef<HTMLDivElement>(null);
	const assigneeDropdownRef = useRef<HTMLDivElement>(null);
	const priorityDropdownRef = useRef<HTMLDivElement>(null);

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
				setShowTagDropdown(false);
			}
			if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target as Node)) {
				setShowAssigneeDropdown(false);
			}
			if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(event.target as Node)) {
				setShowPriorityDropdown(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const toggleTag = (tag: string) => {
		if (selectedTags.includes(tag)) {
			onTagsChange(selectedTags.filter((t) => t !== tag));
		} else {
			onTagsChange([...selectedTags, tag]);
		}
	};

	const toggleAssignee = (agentId: Id<"agents">) => {
		if (selectedAssignees.includes(agentId)) {
			onAssigneesChange(selectedAssignees.filter((id) => id !== agentId));
		} else {
			onAssigneesChange([...selectedAssignees, agentId]);
		}
	};

	const togglePriority = (priority: string) => {
		if (selectedPriorities.includes(priority)) {
			onPrioritiesChange(selectedPriorities.filter((p) => p !== priority));
		} else {
			onPrioritiesChange([...selectedPriorities, priority]);
		}
	};

	const clearAllFilters = () => {
		onSearchChange("");
		onTagsChange([]);
		onAssigneesChange([]);
		onPrioritiesChange([]);
	};

	const hasActiveFilters = searchQuery || selectedTags.length > 0 || selectedAssignees.length > 0 || selectedPriorities.length > 0;

	const getAgentName = (agentId: Id<"agents">) => {
		return availableAgents.find((a) => a._id === agentId)?.name || "Unknown";
	};

	return (
		<div className="px-4 py-3 bg-white border-b border-border">
			{/* Search and filter controls */}
			<div className="flex items-center gap-3">
				{/* Search Input */}
				<div className="relative flex-1 max-w-md">
					<IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
					<input
						type="text"
						placeholder="Search tasks..."
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent bg-[#f8f9fa] placeholder:text-muted-foreground"
					/>
					{searchQuery && (
						<button
							onClick={() => onSearchChange("")}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
						>
							<IconX size={14} />
						</button>
					)}
				</div>

				{/* Tag Filter Dropdown */}
				<div className="relative" ref={tagDropdownRef}>
					<button
						onClick={() => {
							setShowTagDropdown(!showTagDropdown);
							setShowAssigneeDropdown(false);
							setShowPriorityDropdown(false);
						}}
						className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
							selectedTags.length > 0
								? "bg-[var(--accent-blue)] text-white border-transparent"
								: "bg-[#f8f9fa] text-muted-foreground border-border hover:bg-[#f0f0f0]"
						}`}
					>
						<span>Tags</span>
						{selectedTags.length > 0 && (
							<span className="px-1.5 py-0.5 bg-white/20 rounded text-xs font-semibold">
								{selectedTags.length}
							</span>
						)}
						<IconChevronDown size={14} />
					</button>
					
					{showTagDropdown && (
						<div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-border z-50 py-1 max-h-64 overflow-y-auto">
							{availableTags.length === 0 ? (
								<div className="px-3 py-2 text-sm text-muted-foreground">No tags available</div>
							) : (
								availableTags.map((tag) => (
									<button
										key={tag}
										onClick={() => toggleTag(tag)}
										className={`w-full text-left px-3 py-2 text-sm hover:bg-[#f8f9fa] flex items-center justify-between ${
											selectedTags.includes(tag) ? "bg-[#f0f8ff] text-[var(--accent-blue)]" : ""
										}`}
									>
										<span>{tag}</span>
										{selectedTags.includes(tag) && <span>✓</span>}
									</button>
								))
							)}
						</div>
					)}
				</div>

				{/* Assignee Filter Dropdown */}
				<div className="relative" ref={assigneeDropdownRef}>
					<button
						onClick={() => {
							setShowAssigneeDropdown(!showAssigneeDropdown);
							setShowTagDropdown(false);
							setShowPriorityDropdown(false);
						}}
						className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
							selectedAssignees.length > 0
								? "bg-[var(--accent-blue)] text-white border-transparent"
								: "bg-[#f8f9fa] text-muted-foreground border-border hover:bg-[#f0f0f0]"
						}`}
					>
						<span>Assignee</span>
						{selectedAssignees.length > 0 && (
							<span className="px-1.5 py-0.5 bg-white/20 rounded text-xs font-semibold">
								{selectedAssignees.length}
							</span>
						)}
						<IconChevronDown size={14} />
					</button>
					
					{showAssigneeDropdown && (
						<div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-lg shadow-lg border border-border z-50 py-1 max-h-64 overflow-y-auto">
							{availableAgents.length === 0 ? (
								<div className="px-3 py-2 text-sm text-muted-foreground">No agents available</div>
							) : (
								availableAgents.map((agent) => (
									<button
										key={agent._id}
										onClick={() => toggleAssignee(agent._id)}
										className={`w-full text-left px-3 py-2 text-sm hover:bg-[#f8f9fa] flex items-center justify-between ${
											selectedAssignees.includes(agent._id) ? "bg-[#f0f8ff] text-[var(--accent-blue)]" : ""
										}`}
									>
										<span className="flex items-center gap-2">
											<span>{agent.avatar}</span>
											<span>{agent.name}</span>
										</span>
										{selectedAssignees.includes(agent._id) && <span>✓</span>}
									</button>
								))
							)}
						</div>
					)}
				</div>

				{/* Priority Filter Dropdown */}
				<div className="relative" ref={priorityDropdownRef}>
					<button
						onClick={() => {
							setShowPriorityDropdown(!showPriorityDropdown);
							setShowTagDropdown(false);
							setShowAssigneeDropdown(false);
						}}
						className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
							selectedPriorities.length > 0
								? "bg-[var(--accent-blue)] text-white border-transparent"
								: "bg-[#f8f9fa] text-muted-foreground border-border hover:bg-[#f0f0f0]"
						}`}
					>
						<span>Priority</span>
						{selectedPriorities.length > 0 && (
							<span className="px-1.5 py-0.5 bg-white/20 rounded text-xs font-semibold">
								{selectedPriorities.length}
							</span>
						)}
						<IconChevronDown size={14} />
					</button>
					
					{showPriorityDropdown && (
						<div className="absolute top-full left-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-border z-50 py-1">
							{priorities.map((priority) => (
								<button
									key={priority.id}
									onClick={() => togglePriority(priority.id)}
									className={`w-full text-left px-3 py-2 text-sm hover:bg-[#f8f9fa] flex items-center justify-between ${
										selectedPriorities.includes(priority.id) ? "bg-[#f0f8ff] text-[var(--accent-blue)]" : ""
									}`}
								>
									<span className="flex items-center gap-2">
										<span>{priority.icon}</span>
										<span>{priority.label}</span>
									</span>
									{selectedPriorities.includes(priority.id) && <span>✓</span>}
								</button>
							))}
						</div>
					)}
				</div>

				{/* Clear All Button */}
				{hasActiveFilters && (
					<button
						onClick={clearAllFilters}
						className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
					>
						<IconX size={14} />
						Clear all
					</button>
				)}
			</div>

			{/* Active Filters Pills */}
			{hasActiveFilters && (
				<div className="flex flex-wrap items-center gap-2 mt-3">
					<span className="text-xs text-muted-foreground">Active filters:</span>
					
					{selectedTags.map((tag) => (
						<span
							key={tag}
							className="inline-flex items-center gap-1 px-2 py-1 bg-[#f0f8ff] text-[var(--accent-blue)] text-xs rounded-full"
						>
							{tag}
							<button onClick={() => toggleTag(tag)} className="hover:text-[var(--accent-blue-dark)]">
								<IconX size={12} />
							</button>
						</span>
					))}
					
					{selectedAssignees.map((agentId) => (
						<span
							key={agentId}
							className="inline-flex items-center gap-1 px-2 py-1 bg-[#f0f8ff] text-[var(--accent-blue)] text-xs rounded-full"
						>
							👤 {getAgentName(agentId)}
							<button onClick={() => toggleAssignee(agentId)} className="hover:text-[var(--accent-blue-dark)]">
								<IconX size={12} />
							</button>
						</span>
					))}
					
					{selectedPriorities.map((priorityId) => {
						const priority = priorities.find((p) => p.id === priorityId);
						return (
							<span
								key={priorityId}
								className="inline-flex items-center gap-1 px-2 py-1 bg-[#f0f8ff] text-[var(--accent-blue)] text-xs rounded-full"
							>
								{priority?.icon} {priority?.label}
								<button onClick={() => togglePriority(priorityId)} className="hover:text-[var(--accent-blue-dark)]">
									<IconX size={12} />
								</button>
							</span>
						);
					})}
				</div>
			)}
		</div>
	);
};

export default SearchFilterBar;

import React, { useEffect, useState, useRef } from "react";
import SignOutButton from "./Signout";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import PlannerWidget from "./PlannerWidget";

export type ViewMode = "tasks" | "agents" | "objectives";

type HeaderProps = {
	onOpenAgents?: () => void;
	onOpenLiveFeed?: () => void;
	currentView?: ViewMode;
	onViewChange?: (view: ViewMode) => void;
};

const Header: React.FC<HeaderProps> = ({ onOpenAgents, onOpenLiveFeed, currentView = "tasks", onViewChange }) => {
	const [time, setTime] = useState(new Date());
	const [showNotifications, setShowNotifications] = useState(false);
	const notificationRef = useRef<HTMLDivElement>(null);
	
	// Fetch data for dynamic counts
	const agents = useQuery(api.queries.listAgents);
	const tasks = useQuery(api.queries.listTasks);

	// Get current user (Sami)
	const currentUser = agents?.find(a => a.name === "Sami");
	
	// Fetch notifications for current user
	const notifications = useQuery(
		api.notifications.listForAgent,
		currentUser ? { agentId: currentUser._id } : "skip"
	);
	const unreadCount = notifications?.filter(n => !n.delivered).length ?? 0;
	const markAllRead = useMutation(api.notifications.markAllRead);
	
	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
				setShowNotifications(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Calculate counts
	const activeAgentsCount = agents ? agents.filter(a => a.status === "active").length : 0;
	const tasksInQueueCount = tasks ? tasks.filter(t => t.status !== "done").length : 0;

	useEffect(() => {
		const timer = setInterval(() => setTime(new Date()), 1000);
		return () => clearInterval(timer);
	}, []);

	const formatTime = (date: Date) => {
		return date.toLocaleTimeString("en-US", {
			hour12: false,
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	};

	const formatDate = (date: Date) => {
		return date
			.toLocaleDateString("en-US", {
				weekday: "short",
				month: "short",
				day: "numeric",
			})
			.toUpperCase();
	};

	return (
		<header className="[grid-area:header] flex items-center justify-between px-3 md:px-6 bg-white border-b border-border z-10">
			<div className="flex items-center gap-2 md:gap-4 min-w-0">
				<div className="flex md:hidden items-center gap-2">
					<button
						type="button"
						className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted hover:bg-accent transition-colors"
						onClick={onOpenAgents}
						aria-label="Open agents sidebar"
					>
						<span aria-hidden="true">☰</span>
					</button>
				</div>
				<div className="flex items-center gap-2 min-w-0">
					<span className="text-2xl text-[var(--accent-orange)]">◇</span>
					<h1 className="text-base md:text-lg font-semibold tracking-wider text-foreground truncate">
						MISSION CONTROL
					</h1>
				</div>
				{currentUser && (
					<div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full font-medium">
						<span>{currentUser.avatar}</span>
						<span>{currentUser.email || currentUser.name}</span>
					</div>
				)}
			</div>

			{/* View Navigation */}
			<div className="hidden md:flex items-center gap-1 bg-muted rounded-lg p-1">
				<button
					onClick={() => onViewChange?.("tasks")}
					className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
						currentView === "tasks"
							? "bg-white text-foreground shadow-sm"
							: "text-muted-foreground hover:text-foreground"
					}`}
				>
					📋 Tasks
				</button>
				<button
					onClick={() => onViewChange?.("agents")}
					className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
						currentView === "agents"
							? "bg-white text-foreground shadow-sm"
							: "text-muted-foreground hover:text-foreground"
					}`}
				>
					👥 Agents
				</button>
				<button
					onClick={() => onViewChange?.("objectives")}
					className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
						currentView === "objectives"
							? "bg-white text-foreground shadow-sm"
							: "text-muted-foreground hover:text-foreground"
					}`}
				>
					🎯 Objectives
				</button>
			</div>

			{/* Stats */}
			<div className="hidden lg:flex items-center gap-6">
				<div className="flex flex-col items-center">
					<div className="text-xl font-bold text-foreground">
						{agents ? activeAgentsCount : "-"}
					</div>
					<div className="text-[10px] font-semibold text-muted-foreground tracking-tighter">
						AGENTS
					</div>
				</div>
				<div className="w-px h-6 bg-border" />
				<div className="flex flex-col items-center">
					<div className="text-xl font-bold text-foreground">
						{tasks ? tasksInQueueCount : "-"}
					</div>
					<div className="text-[10px] font-semibold text-muted-foreground tracking-tighter">
						TASKS
					</div>
				</div>
			</div>

			{/* Planner Widget */}
			<div className="hidden xl:block">
				<PlannerWidget variant="header" />
			</div>

			<div className="flex items-center gap-2 md:gap-6">
				{/* Mobile view selector */}
				<select
					value={currentView}
					onChange={(e) => onViewChange?.(e.target.value as ViewMode)}
					className="md:hidden px-2 py-1.5 bg-muted text-foreground text-sm font-medium rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
				>
					<option value="tasks">📋 Tasks</option>
					<option value="agents">👥 Agents</option>
					<option value="objectives">🎯 Objectives</option>
				</select>
				<button
					type="button"
					className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted hover:bg-accent transition-colors"
					onClick={onOpenLiveFeed}
					aria-label="Open live feed sidebar"
				>
					<span aria-hidden="true">☰</span>
				</button>
				
				{/* Notification Bell */}
				<div className="relative" ref={notificationRef}>
					<button
						type="button"
						onClick={() => setShowNotifications(!showNotifications)}
						className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted hover:bg-accent transition-colors"
						aria-label="Notifications"
					>
						<span className="text-lg">🔔</span>
						{unreadCount > 0 && (
							<span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
								{unreadCount > 9 ? "9+" : unreadCount}
							</span>
						)}
					</button>
					
					{/* Notifications Dropdown */}
					{showNotifications && (
						<div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-auto bg-white border border-border rounded-lg shadow-lg z-50">
							<div className="flex items-center justify-between px-4 py-3 border-b border-border">
								<h3 className="font-semibold text-foreground">Notifications</h3>
								{unreadCount > 0 && currentUser && (
									<button
										onClick={() => {
											markAllRead({ agentId: currentUser._id });
										}}
										className="text-xs text-[var(--accent-orange)] hover:underline"
									>
										Mark all read
									</button>
								)}
							</div>
							<div className="divide-y divide-border">
								{notifications && notifications.length > 0 ? (
									notifications.slice(0, 10).map((notification) => (
										<div
											key={notification._id}
											className={`px-4 py-3 hover:bg-muted/50 transition-colors ${
												!notification.delivered ? "bg-orange-50" : ""
											}`}
										>
											<p className="text-sm text-foreground line-clamp-2">
												{notification.content}
											</p>
											<p className="text-[10px] text-muted-foreground mt-1">
												{new Date(notification._creationTime).toLocaleString()}
											</p>
										</div>
									))
								) : (
									<div className="px-4 py-6 text-center text-sm text-muted-foreground">
										No notifications
									</div>
								)}
							</div>
						</div>
					)}
				</div>
				
				<div className="text-right">
					<div className="text-xl font-semibold text-foreground tabular-nums">
						{formatTime(time)}
					</div>
					<div className="text-[10px] font-medium text-muted-foreground tracking-[0.5px]">
						{formatDate(time)}
					</div>
				</div>
				<div className="flex items-center gap-2 bg-[#e6fcf5] text-[#0ca678] px-3 py-1.5 rounded-full text-[11px] font-bold tracking-[0.5px]">
					<span className="w-2 h-2 bg-[#0ca678] rounded-full" />
					ONLINE
				</div>
				<SignOutButton />
			</div>
		</header>
	);
};

export default Header;

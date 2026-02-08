"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Id } from "../convex/_generated/dataModel";
import Header, { ViewMode } from "./components/Header";
import AgentsSidebar from "./components/AgentsSidebar";
import MissionQueue from "./components/MissionQueue";
import RightSidebar from "./components/RightSidebar";
import TrayContainer from "./components/Trays/TrayContainer";
import SignInForm from "./components/SignIn";
import TaskDetailPanel from "./components/TaskDetailPanel";
import AddTaskModal from "./components/AddTaskModal";
import AddAgentModal from "./components/AddAgentModal";
import AgentDetailTray from "./components/AgentDetailTray";
import AgentWorkloadView from "./components/AgentWorkloadView";
import ObjectivesView from "./components/ObjectivesView";

export default function App() {
	const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
	const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
	const [currentView, setCurrentView] = useState<ViewMode>("tasks");

	const closeSidebars = useCallback(() => {
		setIsLeftSidebarOpen(false);
		setIsRightSidebarOpen(false);
	}, []);

	const isAnySidebarOpen = useMemo(
		() => isLeftSidebarOpen || isRightSidebarOpen,
		[isLeftSidebarOpen, isRightSidebarOpen],
	);

	useEffect(() => {
		if (!isAnySidebarOpen) return;

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				closeSidebars();
			}
		};

		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [closeSidebars, isAnySidebarOpen]);
	const [selectedTaskId, setSelectedTaskId] = useState<Id<"tasks"> | null>(null);
	const [showAddTaskModal, setShowAddTaskModal] = useState(false);
	const [addTaskPreselectedAgentId, setAddTaskPreselectedAgentId] = useState<string | undefined>(undefined);
	const [selectedAgentId, setSelectedAgentId] = useState<Id<"agents"> | null>(null);
	const [showAddAgentModal, setShowAddAgentModal] = useState(false);

	// Document tray state
	const [selectedDocumentId, setSelectedDocumentId] = useState<Id<"documents"> | null>(null);
	const [showConversationTray, setShowConversationTray] = useState(false);
	const [showPreviewTray, setShowPreviewTray] = useState(false);

	const handleSelectDocument = useCallback((id: Id<"documents"> | null) => {
		if (id === null) {
			// Close trays
			setSelectedDocumentId(null);
			setShowConversationTray(false);
			setShowPreviewTray(false);
		} else {
			// Open both trays
			setSelectedDocumentId(id);
			setShowConversationTray(true);
			setShowPreviewTray(true);
		}
	}, []);

	const handlePreviewDocument = useCallback((id: Id<"documents">) => {
		setSelectedDocumentId(id);
		setShowConversationTray(true);
		setShowPreviewTray(true);
	}, []);

	const handleCloseConversation = useCallback(() => {
		setShowConversationTray(false);
		setShowPreviewTray(false);
		setSelectedDocumentId(null);
	}, []);

	const handleClosePreview = useCallback(() => {
		setShowPreviewTray(false);
	}, []);

	const handleOpenPreview = useCallback(() => {
		setShowPreviewTray(true);
	}, []);

	return (
		<>
			<Authenticated>
				<main className="app-container">
					<Header
						onOpenAgents={() => {
							setIsLeftSidebarOpen(true);
							setIsRightSidebarOpen(false);
						}}
						onOpenLiveFeed={() => {
							setIsRightSidebarOpen(true);
							setIsLeftSidebarOpen(false);
						}}
						currentView={currentView}
						onViewChange={setCurrentView}
					/>

					{isAnySidebarOpen && (
						<div
							className="drawer-backdrop"
							onClick={closeSidebars}
							aria-hidden="true"
						/>
					)}

					{/* Left sidebar - show agents sidebar on tasks view, compact on other views */}
					{currentView === "tasks" ? (
						<AgentsSidebar
							isOpen={isLeftSidebarOpen}
							onClose={() => setIsLeftSidebarOpen(false)}
							onAddTask={(preselectedAgentId) => {
								setAddTaskPreselectedAgentId(preselectedAgentId);
								setShowAddTaskModal(true);
							}}
							onAddAgent={() => setShowAddAgentModal(true)}
							onSelectAgent={(agentId) => setSelectedAgentId(agentId as Id<"agents">)}
						/>
					) : (
						<aside className="[grid-area:left-sidebar] bg-white border-r border-border flex-col overflow-hidden hidden md:flex">
							<div className="px-4 py-3 border-b border-border">
								<div className="text-[11px] font-bold tracking-widest text-muted-foreground">
									QUICK ACCESS
								</div>
							</div>
							<div className="p-4 space-y-4">
								<AgentWorkloadView compact onSelectAgent={(agentId) => setSelectedAgentId(agentId)} />
							</div>
						</aside>
					)}

					{/* Main content area - switches based on view */}
					{currentView === "tasks" && (
						<MissionQueue
							selectedTaskId={selectedTaskId}
							onSelectTask={setSelectedTaskId}
						/>
					)}
					{currentView === "agents" && (
						<main className="[grid-area:main] bg-[#0a0a0a] flex flex-col overflow-hidden">
							<AgentWorkloadView
								onSelectAgent={(agentId) => setSelectedAgentId(agentId)}
							/>
						</main>
					)}
					{currentView === "objectives" && (
						<main className="[grid-area:main] bg-[#0a0a0a] flex flex-col overflow-hidden">
							<ObjectivesView />
						</main>
					)}

					<RightSidebar
						isOpen={isRightSidebarOpen}
						onClose={() => setIsRightSidebarOpen(false)}
						selectedDocumentId={selectedDocumentId}
						onSelectDocument={handleSelectDocument}
						onPreviewDocument={handlePreviewDocument}
					/>
					<TrayContainer
						selectedDocumentId={selectedDocumentId}
						showConversation={showConversationTray}
						showPreview={showPreviewTray}
						onCloseConversation={handleCloseConversation}
						onClosePreview={handleClosePreview}
						onOpenPreview={handleOpenPreview}
					/>
					{showAddTaskModal && (
						<AddTaskModal
							onClose={() => {
								setShowAddTaskModal(false);
								setAddTaskPreselectedAgentId(undefined);
							}}
							onCreated={(taskId) => {
								setShowAddTaskModal(false);
								setAddTaskPreselectedAgentId(undefined);
								setSelectedTaskId(taskId);
							}}
							initialAssigneeId={addTaskPreselectedAgentId}
						/>
					)}
					{selectedAgentId && (
						<div
							className="fixed inset-0 z-[99]"
							onClick={() => setSelectedAgentId(null)}
							aria-hidden="true"
						/>
					)}
					<AgentDetailTray
						agentId={selectedAgentId}
						onClose={() => setSelectedAgentId(null)}
					/>
					{showAddAgentModal && (
						<AddAgentModal
							onClose={() => setShowAddAgentModal(false)}
							onCreated={() => setShowAddAgentModal(false)}
						/>
					)}
          {selectedTaskId && (
						<>
							<div
								className="fixed inset-0 z-40"
								onClick={() => setSelectedTaskId(null)}
								aria-hidden="true"
							/>
							<TaskDetailPanel
								taskId={selectedTaskId}
								onClose={() => setSelectedTaskId(null)}
								onPreviewDocument={handlePreviewDocument}
							/>
						</>
					)}
				</main>
			</Authenticated>
			<Unauthenticated>
				<SignInForm />
			</Unauthenticated>
		</>
	);
}

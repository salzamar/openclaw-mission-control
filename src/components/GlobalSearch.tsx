import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery } from "convex/react";
import { IconSearch, IconX, IconChevronRight, IconFile, IconMessageCircle, IconChecklist, IconBolt } from "@tabler/icons-react";
import { api } from "../../convex/_generated/api";

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  type: "task" | "document" | "message" | "activity";
  title: string;
  description: string;
  metadata: Record<string, any>;
  score: number;
}

interface SearchResults {
  tasks: SearchResult[];
  documents: SearchResult[];
  messages: SearchResult[];
  activities: SearchResult[];
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<"all" | "tasks" | "documents" | "messages" | "activities">("all");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Fetch data for search
  const tasks = useQuery(api.queries.listTasks, {});
  const documents = useQuery(api.documents.listAll, {});
  const activities = useQuery(api.queries.listActivities, { agentId: undefined, type: undefined, taskId: undefined });
  const agents = useQuery(api.queries.listAgents, {});

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("recentSearches");
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = useCallback((search: string) => {
    const updated = [search, ...recentSearches.filter(s => s !== search)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  }, [recentSearches]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Search function
  const searchResults = useMemo((): SearchResults => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      return { tasks: [], documents: [], messages: [], activities: [] };
    }

    const results: SearchResults = {
      tasks: [],
      documents: [],
      messages: [],
      activities: []
    };

    const searchTerm = debouncedQuery.toLowerCase();

    // Search tasks
    if (tasks) {
      tasks.forEach(task => {
        const titleMatch = task.title.toLowerCase().includes(searchTerm);
        const descMatch = task.description.toLowerCase().includes(searchTerm);
        
        if (titleMatch || descMatch) {
          results.tasks.push({
            id: task._id,
            type: "task",
            title: task.title,
            description: task.description,
            metadata: {
              status: task.status,
              priority: task.priority,
              assignees: task.assigneeIds ? task.assigneeIds.map((id: any) => agents?.find((a: any) => a._id === id)?.name || "Unknown") : []
            },
            score: titleMatch ? 2 : 1
          });
        }
      });
    }

    // Search documents
    if (documents) {
      documents.forEach((doc: any) => {
        const titleMatch = doc.title.toLowerCase().includes(searchTerm);
        const contentMatch = doc.content.toLowerCase().includes(searchTerm);
        
        if (titleMatch || contentMatch) {
          results.documents.push({
            id: doc._id,
            type: "document",
            title: doc.title,
            description: doc.content.substring(0, 150) + "...",
            metadata: {
              type: doc.type,
              createdBy: agents?.find((a: any) => a._id === doc.createdByAgentId)?.name || "Unknown"
            },
            score: titleMatch ? 2 : 1
          });
        }
      });
    }

    // Search activities (treating them as messages/tasks)
    if (activities?.activities) {
      activities.activities.forEach((activity: any) => {
        const messageMatch = activity.message.toLowerCase().includes(searchTerm);
        
        if (messageMatch) {
          results.messages.push({
            id: activity._id,
            type: "message",
            title: `Activity: ${activity.type}`,
            description: activity.message,
            metadata: {
              from: agents?.find((a: any) => a._id === activity.agentId)?.name || "Unknown",
              taskId: activity.targetId
            },
            score: 1
          });
        }
      });
    }

    // Sort by score
    Object.keys(results).forEach(key => {
      results[key as keyof SearchResults].sort((a, b) => b.score - a.score);
    });

    return results;
  }, [debouncedQuery, tasks, documents, activities, agents]);

  // Get filtered results based on active category
  const filteredResults = useMemo(() => {
    if (activeCategory === "all") {
      return searchResults;
    }
    return {
      tasks: activeCategory === "tasks" ? searchResults.tasks : [],
      documents: activeCategory === "documents" ? searchResults.documents : [],
      messages: activeCategory === "messages" ? searchResults.messages : [],
      activities: activeCategory === "activities" ? searchResults.activities : []
    };
  }, [searchResults, activeCategory]);

  // Flatten results for keyboard navigation
  const flattenedResults = useMemo(() => {
    const results: SearchResult[] = [];
    if (filteredResults.tasks.length > 0) results.push(...filteredResults.tasks);
    if (filteredResults.documents.length > 0) results.push(...filteredResults.documents);
    if (filteredResults.messages.length > 0) results.push(...filteredResults.messages);
    if (filteredResults.activities.length > 0) results.push(...filteredResults.activities);
    return results;
  }, [filteredResults]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, flattenedResults.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (flattenedResults[selectedIndex]) {
            handleResultSelect(flattenedResults[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        case "Tab":
          e.preventDefault();
          const categories = ["all", "tasks", "documents", "messages", "activities"] as const;
          const currentIndex = categories.indexOf(activeCategory);
          const nextIndex = (currentIndex + 1) % categories.length;
          setActiveCategory(categories[nextIndex]);
          setSelectedIndex(0);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, flattenedResults, selectedIndex, activeCategory, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsContainerRef.current && selectedIndex >= 0) {
      const selectedElement = resultsContainerRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedIndex]);

  const handleResultSelect = (result: SearchResult) => {
    saveRecentSearch(query);
    
    // Navigate to the result
    switch (result.type) {
      case "task":
        // Navigate to task - this will be handled by the parent component
        window.dispatchEvent(new CustomEvent('navigateToTask', { detail: { taskId: result.id } }));
        break;
      case "document":
        // Navigate to document
        window.dispatchEvent(new CustomEvent('navigateToDocument', { detail: { documentId: result.id } }));
        break;
      case "message":
        if (result.metadata.taskId) {
          window.dispatchEvent(new CustomEvent('navigateToTask', { detail: { taskId: result.metadata.taskId } }));
        }
        break;
      case "activity":
        if (result.metadata.targetId) {
          window.dispatchEvent(new CustomEvent('navigateToTask', { detail: { taskId: result.metadata.targetId } }));
        }
        break;
    }
    
    onClose();
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-gray-900">{part}</mark>
      ) : part
    );
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "task": return <IconChecklist size={18} className="text-blue-500" />;
      case "document": return <IconFile size={18} className="text-green-500" />;
      case "message": return <IconMessageCircle size={18} className="text-purple-500" />;
      case "activity": return <IconBolt size={18} className="text-orange-500" />;
      default: return <IconSearch size={18} />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
      
      <div className="flex min-h-full items-start justify-center p-4 pt-20">
        <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl transition-all">
          {/* Search Input */}
          <div className="relative border-b border-gray-200">
            <IconSearch size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search across tasks, documents, messages, and activities..."
              className="w-full pl-12 pr-12 py-4 text-lg bg-transparent focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <IconX size={20} />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-100">
            {["all", "tasks", "documents", "messages", "activities"].map((category) => (
              <button
                key={category}
                onClick={() => {
                  setActiveCategory(category as any);
                  setSelectedIndex(0);
                }}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  activeCategory === category
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
                {category !== "all" && (
                  <span className="ml-1.5 text-xs opacity-60">
                    {searchResults[category as keyof SearchResults].length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto" ref={resultsContainerRef}>
            {query.length < 2 ? (
              <div className="p-8 text-center text-gray-500">
                <IconSearch size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Start typing to search across all your content</p>
                <p className="text-sm mt-2 text-gray-400">
                  Try searching for task names, document content, or messages
                </p>
              </div>
            ) : flattenedResults.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <IconSearch size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No results found for "{query}"</p>
                <p className="text-sm mt-2 text-gray-400">
                  Try adjusting your search terms
                </p>
              </div>
            ) : (
              <div className="p-2">
                {/* Recent Searches */}
                {query.length === 0 && recentSearches.length > 0 && (
                  <div className="mb-4">
                    <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Recent Searches</h3>
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => setQuery(search)}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2"
                      >
                        <IconSearch size={16} className="text-gray-400" />
                        {search}
                      </button>
                    ))}
                  </div>
                )}

                {/* Search Results by Category */}
                {Object.entries(filteredResults).map(([category, items]) => 
                  items.length > 0 ? (
                    <div key={category} className="mb-4 last:mb-0">
                      <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase flex items-center justify-between">
                        <span>{category}</span>
                        <span className="text-gray-400">{items.length} results</span>
                      </h3>
                      {items.map((result: any, index: number) => (
                        <button
                          key={`${category}-${index}`}
                          onClick={() => handleResultSelect(result)}
                          className={`w-full px-3 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors flex items-start gap-3 ${
                            flattenedResults[selectedIndex] === result ? "bg-blue-50" : ""
                          }`}
                        >
                          {getIcon(result.type)}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {highlightMatch(result.title, debouncedQuery)}
                            </div>
                            <div className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                              {highlightMatch(result.description, debouncedQuery)}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              {result.type === "task" && result.metadata.priority && (
                                <span className={`px-1.5 py-0.5 rounded ${
                                  result.metadata.priority === "critical" ? "bg-red-100 text-red-700" :
                                  result.metadata.priority === "high" ? "bg-orange-100 text-orange-700" :
                                  result.metadata.priority === "normal" ? "bg-green-100 text-green-700" :
                                  "bg-gray-100 text-gray-700"
                                }`}>
                                  {result.metadata.priority}
                                </span>
                              )}
                              {result.metadata.assignees && result.metadata.assignees.length > 0 && (
                                <span>👤 {result.metadata.assignees.join(", ")}</span>
                              )}
                              {result.metadata.from && (
                                <span>👤 {result.metadata.from}</span>
                              )}
                              {result.metadata.agent && (
                                <span>👤 {result.metadata.agent}</span>
                              )}
                            </div>
                          </div>
                          <IconChevronRight size={16} className="text-gray-400 mt-1" />
                        </button>
                      ))}
                    </div>
                  ) : null
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-4">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
                <span>Tab Switch Category</span>
              </div>
              <div className="flex items-center gap-4">
                <span>⌘K to close</span>
                <button
                  onClick={onClose}
                  className="px-2 py-1 hover:bg-gray-200 rounded transition-colors"
                >
                  Esc to close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
import React, { useState, useMemo } from "react";
import { IconX, IconCode, IconEye } from "@tabler/icons-react";
import ReactMarkdown from "react-markdown";

type ContentType = "html" | "markdown" | "text";

interface PreviewPaneProps {
  content: string;
  title?: string;
  onClose: () => void;
}

function detectContentType(content: string): ContentType {
  const trimmed = content.trim();
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html") || trimmed.startsWith("<HTML")) {
    return "html";
  }
  if (content.includes("# ") || content.includes("```") || content.includes("**") || content.includes("- ")) {
    return "markdown";
  }
  return "text";
}

// Basic HTML sanitization - strips dangerous elements and attributes
function sanitizeHtml(html: string): string {
  // Remove script tags and their contents
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  // Remove event handlers
  sanitized = sanitized.replace(/\s*on\w+="[^"]*"/gi, "");
  sanitized = sanitized.replace(/\s*on\w+='[^']*'/gi, "");
  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, "");
  return sanitized;
}

const PreviewPane: React.FC<PreviewPaneProps> = ({ content, title, onClose }) => {
  const [activeTab, setActiveTab] = useState<"code" | "preview">("preview");
  
  const contentType = useMemo(() => detectContentType(content), [content]);
  
  const renderPreview = () => {
    switch (contentType) {
      case "html":
        return (
          <div className="preview-html-container">
            <iframe
              srcDoc={sanitizeHtml(content)}
              sandbox="allow-same-origin"
              className="w-full h-full min-h-[400px] border-0 rounded bg-white"
              title="HTML Preview"
            />
          </div>
        );
      case "markdown":
        return (
          <div className="preview-markdown prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        );
      case "text":
      default:
        return (
          <pre className="whitespace-pre-wrap text-sm font-mono text-foreground">
            {content}
          </pre>
        );
    }
  };

  const contentTypeLabel = {
    html: "HTML",
    markdown: "Markdown",
    text: "Plain Text",
  };

  return (
    <div className="preview-pane fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="preview-pane-inner bg-card border border-border rounded-lg shadow-2xl w-[90vw] max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-foreground text-sm">
              {title || "Preview"}
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground uppercase font-medium">
              {contentTypeLabel[contentType]}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close preview"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-muted/30">
          <button
            onClick={() => setActiveTab("code")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors ${
              activeTab === "code"
                ? "text-foreground border-b-2 border-[var(--accent-blue)] bg-card"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <IconCode size={14} />
            Code
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors ${
              activeTab === "preview"
                ? "text-foreground border-b-2 border-[var(--accent-blue)] bg-card"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <IconEye size={14} />
            Preview
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === "code" ? (
            <pre className="preview-code-view bg-[#1e1e1e] text-[#d4d4d4] p-4 rounded-lg overflow-auto text-xs font-mono leading-relaxed max-h-[60vh]">
              <code>{content}</code>
            </pre>
          ) : (
            <div className="preview-render-view bg-white dark:bg-[#fefefe] rounded-lg p-6 min-h-[200px] max-h-[60vh] overflow-auto text-[#1a1a1a]">
              {renderPreview()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreviewPane;

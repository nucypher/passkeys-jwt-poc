"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { useEffect, useState, useRef } from "react";
import mermaid from "mermaid";
import "highlight.js/styles/github-dark.css";

// Add global styles to override mermaid's default message text color
const mermaidStyles = `
  .mermaid-diagram .messageText {
    fill: #fff !important;
    stroke: none !important;
  }
`;

// Mermaid component to render diagrams
function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    if (ref.current && chart) {
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        securityLevel: "loose",
        themeVariables: {
          primaryColor: "#f0f0f0",
          primaryTextColor: "#1a1a1a",
          primaryBorderColor: "#666",
          lineColor: "#666",
          secondaryColor: "#e8e8e8",
          tertiaryColor: "#fafafa",
          actorTextColor: "#fafafa",
          noteBkgColor: "#fff4cc",
          noteTextColor: "#222020ff",
          noteBorderColor: "#999",
          signalTextColor: "#000000",
        },
      });

      const renderChart = async () => {
        try {
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await mermaid.render(id, chart);
          setSvg(svg);
        } catch (error) {
          console.error("Error rendering mermaid chart:", error);
          setSvg(`<pre>Error rendering diagram: ${error}</pre>`);
        }
      };

      renderChart();
    }
  }, [chart]);

  return (
    <div
      ref={ref}
      className="mermaid-diagram"
      dangerouslySetInnerHTML={{ __html: svg }}
      style={{
        // Override mermaid's default message text color
        // @ts-expect-error CSS custom property
        "--mermaid-message-text-color": "#000000",
      }}
    />
  );
}

export default function SequenceDiagramPage() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/docs/sequence-diagram")
      .then((res) => res.text())
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load SEQUENCE-DIAGRAM.md:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <style dangerouslySetInnerHTML={{ __html: mermaidStyles }} />
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm underline"
          >
            ← Back to Home
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <article className="prose prose-slate dark:prose-invert max-w-none prose-code:before:content-none prose-code:after:content-none">
            <ReactMarkdown
              rehypePlugins={[rehypeHighlight]}
              remarkPlugins={[remarkGfm]}
              components={{
                code(props) {
                  const { inline, className, children, ...rest } =
                    props as React.ComponentProps<"code"> & {
                      inline?: boolean;
                    };
                  const match = /language-(\w+)/.exec(className || "");
                  const language = match ? match[1] : "";

                  if (!inline && language === "mermaid") {
                    return <Mermaid chart={String(children).trim()} />;
                  }

                  return (
                    <code className={className} {...rest}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </article>
        </div>
      </div>
    </div>
  );
}

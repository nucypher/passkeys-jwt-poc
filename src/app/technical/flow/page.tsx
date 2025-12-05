"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import { useEffect, useState } from "react";
import "highlight.js/styles/github-dark.css";

export default function FlowPage() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/docs/flow")
      .then((res) => res.text())
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load FLOW.md:", err);
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
            <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
              {content}
            </ReactMarkdown>
          </article>
        </div>
      </div>
    </div>
  );
}

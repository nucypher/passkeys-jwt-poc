"use client";

import { useState } from "react";

interface StatementCreatorProps {
  userId: string;
  onStatementCreated: () => void;
}

const getSampleJson = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  const closingDate = date.toISOString().split("T")[0]; // Format as YYYY-MM-DD

  return {
    investment: {
      amount: 1000000,
      currency: "USD",
    },
    terms: {
      closingDate,
      lockUpPeriod: "5 years",
    },
  };
};

const generateDefaultTitle = () => {
  const randomNum = Math.floor(1000 + Math.random() * 9000); // Generate 4-digit number
  return `Expression of Interest #${randomNum}`;
};

export default function StatementCreator({
  userId,
  onStatementCreated,
}: StatementCreatorProps) {
  const [title, setTitle] = useState(generateDefaultTitle());
  const [content, setContent] = useState(
    JSON.stringify(getSampleJson(), null, 2),
  );
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    try {
      setError(null);
      setIsCreating(true);

      // Validate JSON
      JSON.parse(content);

      const response = await fetch("/api/statements/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          creatorId: userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create statement");
      }

      // Reset form
      setTitle(generateDefaultTitle());
      setContent(JSON.stringify(getSampleJson(), null, 2));
      onStatementCreated();

      alert("Statement created successfully!");
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("Invalid JSON format. Please check your syntax.");
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to create statement",
        );
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="w-full max-w-4xl">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Create New Statement</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
          Edit the JSON below to create a new statement for signing.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Statement Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            disabled={isCreating}
            placeholder="Enter statement title"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Statement Content (JSON)
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-64 px-4 py-3 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            disabled={isCreating}
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={handleCreate}
            disabled={isCreating || !content.trim()}
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-blue-600 text-white gap-2 hover:bg-blue-700 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? "Creating..." : "Create Statement"}
          </button>

          <button
            onClick={() => setContent(JSON.stringify(getSampleJson(), null, 2))}
            disabled={isCreating}
            className="rounded-full border border-solid border-gray-300 dark:border-gray-600 transition-colors flex items-center justify-center bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset to Sample
          </button>
        </div>
      </div>
    </div>
  );
}

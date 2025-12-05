"use client";

import { useState } from "react";

interface UserSetupProps {
  role: "creator" | "investor";
  onComplete: (name: string) => void;
}

export default function UserSetup({ role, onComplete }: UserSetupProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    onComplete(name.trim());
  };

  return (
    <div className="max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">
        Welcome, {role === "creator" ? "Creator" : "Investor"}!
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Please enter your name to continue.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2">
            Your Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Alice, Jeff, Michael..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            required
            disabled={isSubmitting}
          />
        </div>
        <button
          type="submit"
          disabled={!name.trim() || isSubmitting}
          className="w-full rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-blue-600 text-white gap-2 hover:bg-blue-700 font-medium text-base h-12 px-5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Setting up..." : "Continue"}
        </button>
      </form>
    </div>
  );
}

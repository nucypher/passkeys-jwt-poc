"use client";

import { useState, useEffect } from "react";
import SignatureIndicator from "./signature-indicator";
import Link from "next/link";
import { StatementStatus } from "@/lib/statements";

interface StatementSignature {
  id: number;
  statementId: string;
  userId: string;
  userName: string;
  userRole: string;
  signature: string;
  jwt: string;
  signedAt: number;
}

interface Statement {
  statementId: string;
  title?: string;
  content: string;
  creatorId: string;
  createdAt: number;
  signatures: StatementSignature[];
  signatureCount: number;
  status: StatementStatus;
  creatorName: string;
}

interface StatementListProps {
  currentUserId?: string;
  canSign?: boolean;
  onSignStatement?: (statementId: string) => void;
  refreshTrigger?: number;
}

export default function StatementList({
  currentUserId,
  canSign = false,
  onSignStatement,
  refreshTrigger = 0,
}: StatementListProps) {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStatements, setExpandedStatements] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    loadStatements();
  }, [refreshTrigger]);

  const loadStatements = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/statements");
      if (!response.ok) throw new Error("Failed to load statements");

      const data = await response.json();
      setStatements(data.statements);
    } catch (error) {
      console.error("Error loading statements:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (statementId: string) => {
    const newExpanded = new Set(expandedStatements);
    if (newExpanded.has(statementId)) {
      newExpanded.delete(statementId);
    } else {
      newExpanded.add(statementId);
    }
    setExpandedStatements(newExpanded);
  };

  const hasUserSigned = (statement: Statement) => {
    if (!currentUserId) return false;
    return statement.signatures.some((sig) => sig.userId === currentUserId);
  };

  const renderStatementCard = (statement: Statement) => {
    const isExpanded = expandedStatements.has(statement.statementId);
    const userSigned = hasUserSigned(statement);

    return (
      <div
        key={statement.statementId}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold">
                {statement.title ||
                  `Statement #${statement.statementId.substring(0, 8)}`}
              </h3>
              <div
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  statement.status === "approved"
                    ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                    : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200"
                }`}
              >
                {statement.signatureCount}/3 signatures
                {statement.status === "approved" && " ✓"}
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Created by {statement.creatorName} on{" "}
              {new Date(statement.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="mb-4">
          <button
            onClick={() => toggleExpanded(statement.statementId)}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium mb-2"
          >
            {isExpanded ? "Hide" : "Show"} Statement Content
          </button>
          {isExpanded && (
            <pre className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm overflow-x-auto border border-gray-200 dark:border-gray-700">
              <code className="text-gray-800 dark:text-gray-200">
                {JSON.stringify(JSON.parse(statement.content), null, 2)}
              </code>
            </pre>
          )}
        </div>

        {/* Signatures */}
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Signed by:</h4>
          {statement.signatures.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {statement.signatures.map((sig) => (
                <SignatureIndicator
                  key={sig.id}
                  userName={sig.userName}
                  signature={sig.signature}
                  signedAt={sig.signedAt}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No signatures yet
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {canSign &&
            !userSigned &&
            onSignStatement &&
            statement.signatureCount < 3 && (
              <button
                onClick={() => onSignStatement(statement.statementId)}
                className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-green-600 text-white gap-2 hover:bg-green-700 font-medium text-sm h-10 px-4"
              >
                Sign Statement
              </button>
            )}
          {statement.signatureCount >= 3 && !userSigned && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>Maximum signatures reached (3/3)</span>
            </div>
          )}
          {userSigned && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <span>✓</span>
              <span>You signed this statement</span>
            </div>
          )}
          <Link
            href={`/technical/statement/${statement.statementId}`}
            className="rounded-full border border-solid border-gray-300 dark:border-gray-600 transition-colors flex items-center justify-center bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm h-10 px-4"
          >
            Technical Details
          </Link>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-600 dark:text-gray-400">
        Loading statements...
      </div>
    );
  }

  // Split statements into own and others
  const myStatements = statements.filter(
    (statement) => statement.creatorId === currentUserId,
  );
  const otherStatements = statements.filter(
    (statement) => statement.creatorId !== currentUserId,
  );

  if (statements.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600 dark:text-gray-400">
        No statements yet. Create your first statement to get started.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* My Statements Section - only show if user has created statements */}
      {myStatements.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">My Statements</h2>
          <div className="w-full max-w-4xl space-y-4">
            {myStatements.map(renderStatementCard)}
          </div>
        </div>
      )}

      {/* Available Statements Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Available Statements</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Review statements from other users and add your signature. A statement
          requires 2 out of 3 signatures to be valid.
        </p>
        {otherStatements.length > 0 ? (
          <div className="w-full max-w-4xl space-y-4">
            {otherStatements.map(renderStatementCard)}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            No statements from other users available.
          </div>
        )}
      </div>
    </div>
  );
}

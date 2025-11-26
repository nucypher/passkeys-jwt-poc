"use server";

import {
  saveStatement,
  getStatement,
  getAllStatements,
  saveStatementSignature,
  getStatementSignatures,
  hasUserSignedStatement,
  getUser,
} from "./database";
import crypto from "crypto";

export interface Statement {
  statementId: string;
  content: string;
  creatorId: string;
  createdAt: number;
}

export interface StatementSignature {
  id: number;
  statementId: string;
  userId: string;
  userName: string;
  userRole: string;
  signature: string;
  jwt: string;
  signedAt: number;
}

export interface StatementWithSignatures extends Statement {
  signatures: StatementSignature[];
  signatureCount: number;
  isValid: boolean; // true if 2 or more signatures
  creatorName: string;
}

/**
 * Create a new statement (Creator only)
 */
export async function createStatement(
  content: string,
  creatorId: string
): Promise<Statement> {
  // Verify creator exists
  const creator = await getUser(creatorId);
  if (!creator) {
    throw new Error("Creator not found");
  }
  
  if (creator.role !== "creator") {
    throw new Error("Only creators can create statements");
  }
  
  const statementId = crypto.randomBytes(16).toString("hex");
  
  // Validate JSON content
  try {
    JSON.parse(content);
  } catch {
    throw new Error("Statement content must be valid JSON");
  }
  
  await saveStatement(statementId, content, creatorId);
  
  const statement = await getStatement(statementId);
  if (!statement) {
    throw new Error("Failed to create statement");
  }
  
  return {
    statementId: statement.statementId,
    content: statement.content,
    creatorId: statement.creatorId,
    createdAt: statement.createdAt,
  };
}

/**
 * Get all statements with their signatures
 */
export async function getStatements(): Promise<StatementWithSignatures[]> {
  const statements = await getAllStatements();
  
  const statementsWithSignatures = await Promise.all(
    statements.map(async (stmt) => {
      const signatures = await getStatementSignatures(stmt.statement_id);
      const creator = await getUser(stmt.creator_id);
      
      return {
        statementId: stmt.statement_id,
        content: stmt.content,
        creatorId: stmt.creator_id,
        createdAt: stmt.created_at,
        signatures: signatures.map(sig => ({
          id: sig.id,
          statementId: sig.statement_id,
          userId: sig.user_id,
          userName: sig.name,
          userRole: sig.role,
          signature: sig.signature,
          jwt: sig.jwt,
          signedAt: sig.signed_at,
        })),
        signatureCount: signatures.length,
        isValid: signatures.length >= 2,
        creatorName: creator?.name || "Unknown",
      };
    })
  );
  
  return statementsWithSignatures;
}

/**
 * Get a specific statement with signatures
 */
export async function getStatementById(
  statementId: string
): Promise<StatementWithSignatures | null> {
  const statement = await getStatement(statementId);
  if (!statement) return null;
  
  const signatures = await getStatementSignatures(statementId);
  const creator = await getUser(statement.creatorId);
  
  return {
    statementId: statement.statementId,
    content: statement.content,
    creatorId: statement.creatorId,
    createdAt: statement.createdAt,
    signatures: signatures.map(sig => ({
      id: sig.id,
      statementId: sig.statement_id,
      userId: sig.user_id,
      userName: sig.name,
      userRole: sig.role,
      signature: sig.signature,
      jwt: sig.jwt,
      signedAt: sig.signed_at,
    })),
    signatureCount: signatures.length,
    isValid: signatures.length >= 2,
    creatorName: creator?.name || "Unknown",
  };
}

/**
 * Sign a statement
 */
export async function signStatement(
  statementId: string,
  userId: string,
  signature: string,
  jwt: string
): Promise<number | bigint> {
  // Verify statement exists
  const statement = await getStatement(statementId);
  if (!statement) {
    throw new Error("Statement not found");
  }
  
  // Verify user exists
  const user = await getUser(userId);
  if (!user) {
    throw new Error("User not found");
  }
  
  // Check if user already signed
  const alreadySigned = await hasUserSignedStatement(statementId, userId);
  if (alreadySigned) {
    throw new Error("User has already signed this statement");
  }
  
  return await saveStatementSignature(statementId, userId, signature, jwt);
}

/**
 * Check if a statement is valid (has 2 or more signatures)
 */
export async function isStatementValid(statementId: string): Promise<boolean> {
  const signatures = await getStatementSignatures(statementId);
  return signatures.length >= 2;
}

/**
 * Check if a user has signed a statement
 */
export async function checkUserSignedStatement(
  statementId: string,
  userId: string
): Promise<boolean> {
  return await hasUserSignedStatement(statementId, userId);
}


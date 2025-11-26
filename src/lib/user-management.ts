"use server";

import { saveUser, getUser, getUserByCredentialId, getAllUsers } from "./database";
import crypto from "crypto";

export interface User {
  userId: string;
  name: string;
  role: "creator" | "investor";
  credentialId: string;
  createdAt: number;
}

/**
 * Create or update a user profile
 */
export async function createOrUpdateUser(
  name: string,
  role: "creator" | "investor",
  credentialId: string
): Promise<User> {
  // Check if user already exists with this credential
  const existingUser = await getUserByCredentialId(credentialId);
  
  const userId = existingUser?.userId || crypto.randomBytes(16).toString("hex");
  
  await saveUser(userId, name, role, credentialId);
  
  const user = await getUser(userId);
  if (!user) {
    throw new Error("Failed to create/update user");
  }
  
  return {
    userId: user.userId,
    name: user.name,
    role: user.role as "creator" | "investor",
    credentialId: user.credentialId,
    createdAt: user.createdAt,
  };
}

/**
 * Get user by credential ID
 */
export async function getUserInfo(credentialId: string): Promise<User | null> {
  const user = await getUserByCredentialId(credentialId);
  if (!user) return null;
  
  return {
    userId: user.userId,
    name: user.name,
    role: user.role as "creator" | "investor",
    credentialId: user.credentialId,
    createdAt: user.createdAt,
  };
}

/**
 * Get all users in the system (Creator, Investor 1, Investor 2)
 */
export async function listAllUsers(): Promise<User[]> {
  const users = await getAllUsers();
  return users.map(u => ({
    userId: u.user_id,
    name: u.name,
    role: u.role as "creator" | "investor",
    credentialId: u.credential_id,
    createdAt: u.created_at,
  }));
}


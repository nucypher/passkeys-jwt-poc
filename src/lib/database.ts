"use server";

import Database from "better-sqlite3";
import { type PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/server";
import * as fs from "fs";
import * as path from "path";

// Use absolute path to ensure consistency across different execution contexts
const DB_PATH = path.join(process.cwd(), "passkeys.db");

let db: Database.Database | null = null;

export const getDatabase = async (): Promise<Database.Database> => {
  if (!db) {
    // Ensure the directory exists with write permissions
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true, mode: 0o755 });
    }

    // Check if database file exists, if not it will be created
    const dbExists = fs.existsSync(DB_PATH);

    // Create database (better-sqlite3 will create the file if it doesn't exist)
    db = new Database(DB_PATH, {
      verbose: process.env.NODE_ENV === "development" ? console.log : undefined,
      fileMustExist: false,
    });

    // Ensure the database file has write permissions
    if (!dbExists) {
      try {
        fs.chmodSync(DB_PATH, 0o666); // rw-rw-rw-
      } catch (error) {
        console.warn("Could not set database file permissions:", error);
      }
    }

    initializeDatabase(db);
  }
  return db;
};

const initializeDatabase = (database: Database.Database) => {
  // Create credentials table
  database.exec(`
    CREATE TABLE IF NOT EXISTS credentials (
      credential_id TEXT PRIMARY KEY,
      public_key TEXT NOT NULL,
      algorithm INTEGER NOT NULL DEFAULT -7,
      counter INTEGER NOT NULL,
      transports TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  // Create signatures table
  database.exec(`
    CREATE TABLE IF NOT EXISTS signatures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      credential_id TEXT NOT NULL,
      jwt_payload TEXT NOT NULL,
      signature TEXT NOT NULL,
      jwt TEXT,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (credential_id) REFERENCES credentials(credential_id)
    )
  `);

  // Create registration_options table for temporary storage
  database.exec(`
    CREATE TABLE IF NOT EXISTS registration_options (
      user_id TEXT PRIMARY KEY,
      options TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
};

// Credential operations
export const saveCredential = async (
  credentialId: string,
  publicKey: string,
  counter: number,
  transports: string[] | undefined,
  algorithm?: number
) => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO credentials (credential_id, public_key, algorithm, counter, transports, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    credentialId,
    publicKey,
    algorithm || -7, // Default to ES256 if not provided
    counter,
    JSON.stringify(transports || []),
    Date.now()
  );
};

export const getCredential = async (credentialId: string) => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    SELECT credential_id, public_key, algorithm, counter, transports
    FROM credentials
    WHERE credential_id = ?
  `);
  const row = stmt.get(credentialId) as
    | {
        credential_id: string;
        public_key: string;
        algorithm: number;
        counter: number;
        transports: string;
      }
    | undefined;

  if (!row) return null;

  return {
    credentialId: row.credential_id,
    publicKey: row.public_key,
    algorithm: row.algorithm,
    counter: row.counter,
    transports: JSON.parse(row.transports),
  };
};

export const updateCredentialCounter = async (
  credentialId: string,
  counter: number
) => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    UPDATE credentials
    SET counter = ?
    WHERE credential_id = ?
  `);
  stmt.run(counter, credentialId);
};

// Signature operations
export const saveSignature = async (
  credentialId: string,
  jwtPayload: string,
  signature: string,
  jwt?: string
) => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    INSERT INTO signatures (credential_id, jwt_payload, signature, jwt, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    credentialId,
    jwtPayload,
    signature,
    jwt || null,
    Date.now()
  );
  return info.lastInsertRowid;
};

export const getSignaturesByCredentialId = async (credentialId: string) => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    SELECT id, jwt_payload, signature, jwt, timestamp
    FROM signatures
    WHERE credential_id = ?
    ORDER BY timestamp DESC
  `);
  return stmt.all(credentialId) as Array<{
    id: number;
    jwt_payload: string;
    signature: string;
    jwt: string | null;
    timestamp: number;
  }>;
};

export const getSignaturesByCredentialIdWithCredentials = async (
  credentialId: string
) => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    SELECT 
      s.id,
      s.credential_id,
      s.jwt_payload,
      s.signature,
      s.jwt,
      s.timestamp,
      c.public_key,
      c.counter,
      c.transports,
      c.created_at as credential_created_at
    FROM signatures s
    INNER JOIN credentials c ON s.credential_id = c.credential_id
    WHERE s.credential_id = ?
    ORDER BY s.timestamp DESC
  `);
  return stmt.all(credentialId) as Array<{
    id: number;
    credential_id: string;
    jwt_payload: string;
    signature: string;
    jwt: string | null;
    timestamp: number;
    public_key: string;
    counter: number;
    transports: string;
    credential_created_at: number;
  }>;
};

export const getAllSignaturesWithCredentials = async () => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    SELECT 
      s.id,
      s.credential_id,
      s.jwt_payload,
      s.signature,
      s.jwt,
      s.timestamp,
      c.public_key,
      c.counter,
      c.transports,
      c.created_at as credential_created_at
    FROM signatures s
    INNER JOIN credentials c ON s.credential_id = c.credential_id
    ORDER BY c.public_key, s.timestamp DESC
  `);
  return stmt.all() as Array<{
    id: number;
    credential_id: string;
    jwt_payload: string;
    signature: string;
    jwt: string | null;
    timestamp: number;
    public_key: string;
    counter: number;
    transports: string;
    credential_created_at: number;
  }>;
};

// Registration options operations
export const saveRegistrationOptions = async (
  userId: string,
  registrationOptions: PublicKeyCredentialCreationOptionsJSON
) => {
  const db = await getDatabase();
  // Use the original userId string, not the encoded user.id from registrationOptions
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO registration_options (user_id, options, created_at)
    VALUES (?, ?, ?)
  `);
  stmt.run(userId, JSON.stringify(registrationOptions), Date.now());
};

export const getRegistrationOptions = async (
  userID: string
): Promise<PublicKeyCredentialCreationOptionsJSON | null> => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    SELECT options
    FROM registration_options
    WHERE user_id = ?
  `);
  const row = stmt.get(userID) as { options: string } | undefined;

  if (!row) return null;

  return JSON.parse(row.options);
};

export const removeRegistrationOptions = async (userID: string) => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    DELETE FROM registration_options
    WHERE user_id = ?
  `);
  stmt.run(userID);
};

// Utility function to close and reset the database connection
export const closeDatabase = async () => {
  if (db) {
    try {
      await db.close();
    } catch (error) {
      console.error("Error closing database:", error);
    } finally {
      db = null;
    }
  }
};

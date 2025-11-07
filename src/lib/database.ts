"use server";

import Database from "better-sqlite3";
import { type PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/server";
import * as fs from "fs";
import * as path from "path";

// Use absolute path to ensure consistency across different execution contexts
// Use a separate database file for tests
const DB_FILENAME =
  process.env.NODE_ENV === "test" ? "passkeys.test.db" : "passkeys.db";
const DB_PATH = path.join(process.cwd(), DB_FILENAME);

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
  // Create passkey credentials table
  database.exec(`
    CREATE TABLE IF NOT EXISTS passkey_credentials (
      credential_id TEXT PRIMARY KEY,
      public_key_cose_format TEXT NOT NULL,
      algorithm INTEGER NOT NULL DEFAULT -7,
      counter INTEGER NOT NULL,
      transports TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  // Create attested JWT keys table
  // This stores JWT signing keys that are attested by passkeys
  // 1:1 relationship between passkey and JWT key
  database.exec(`
    CREATE TABLE IF NOT EXISTS attested_jwt_keys (
      key_id TEXT PRIMARY KEY,
      credential_id TEXT NOT NULL UNIQUE,
      public_key_jwk TEXT NOT NULL,
      public_key_fingerprint TEXT NOT NULL,
      passkey_attestation TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (credential_id) REFERENCES passkey_credentials (credential_id)
    )
  `);

  // Create signed JWTs table
  database.exec(`
    CREATE TABLE IF NOT EXISTS signed_jwts (
      signature_id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_id TEXT NOT NULL,
      jwt_payload TEXT NOT NULL,
      signature TEXT NOT NULL,
      jwt TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (key_id) REFERENCES attested_jwt_keys (key_id)
    )
  `);

  // Create pending passkey registrations table for temporary storage
  database.exec(`
    CREATE TABLE IF NOT EXISTS pending_passkey_registrations (
      user_id TEXT PRIMARY KEY,
      options TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
};

// Passkey credential operations
export const saveCredential = async (
  credentialId: string,
  publicKey: string,
  counter: number,
  transports: string[] | undefined,
  algorithm?: number
) => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO passkey_credentials (credential_id, public_key_cose_format, algorithm, counter, transports, created_at)
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
    SELECT credential_id, public_key_cose_format, algorithm, counter, transports
    FROM passkey_credentials
    WHERE credential_id = ?
  `);
  const row = stmt.get(credentialId) as
    | {
        credential_id: string;
        public_key_cose_format: string;
        algorithm: number;
        counter: number;
        transports: string;
      }
    | undefined;

  if (!row) return null;

  return {
    credentialId: row.credential_id,
    publicKey: row.public_key_cose_format,
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
    UPDATE passkey_credentials
    SET counter = ?
    WHERE credential_id = ?
  `);
  stmt.run(counter, credentialId);
};

// Attested JWT Key operations
export const saveJWTKey = async (
  keyId: string,
  credentialId: string,
  publicKeyJWK: string,
  publicKeyFingerprint: string,
  passkeyAttestation: string
) => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO attested_jwt_keys (key_id, credential_id, public_key_jwk, public_key_fingerprint, passkey_attestation, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    keyId,
    credentialId,
    publicKeyJWK,
    publicKeyFingerprint,
    passkeyAttestation,
    Date.now()
  );
};

export const getJWTKey = async (keyId: string) => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    SELECT key_id, credential_id, public_key_jwk, public_key_fingerprint, passkey_attestation, created_at
    FROM attested_jwt_keys
    WHERE key_id = ?
  `);
  const row = stmt.get(keyId) as
    | {
        key_id: string;
        credential_id: string;
        public_key_jwk: string;
        public_key_fingerprint: string;
        passkey_attestation: string;
        created_at: number;
      }
    | undefined;

  if (!row) return null;

  return {
    keyId: row.key_id,
    credentialId: row.credential_id,
    publicKeyJWK: JSON.parse(row.public_key_jwk),
    publicKeyFingerprint: row.public_key_fingerprint,
    passkeyAttestation: JSON.parse(row.passkey_attestation),
    createdAt: row.created_at,
  };
};

export const getJWTKeyByCredentialId = async (credentialId: string) => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    SELECT key_id, credential_id, public_key_jwk, public_key_fingerprint, passkey_attestation, created_at
    FROM attested_jwt_keys
    WHERE credential_id = ?
  `);
  const row = stmt.get(credentialId) as
    | {
        key_id: string;
        credential_id: string;
        public_key_jwk: string;
        public_key_fingerprint: string;
        passkey_attestation: string;
        created_at: number;
      }
    | undefined;

  if (!row) return null;

  return {
    keyId: row.key_id,
    credentialId: row.credential_id,
    publicKeyJWK: JSON.parse(row.public_key_jwk),
    publicKeyFingerprint: row.public_key_fingerprint,
    passkeyAttestation: JSON.parse(row.passkey_attestation),
    createdAt: row.created_at,
  };
};

export const deleteJWTKey = async (keyId: string) => {
  const db = await getDatabase();
  const stmt = db.prepare(`DELETE FROM attested_jwt_keys WHERE key_id = ?`);
  stmt.run(keyId);
};

// Signed JWT operations
export const saveSignature = async (
  keyId: string,
  jwtPayload: string,
  signature: string,
  jwt?: string
) => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    INSERT INTO signed_jwts (key_id, jwt_payload, signature, jwt, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const info = stmt.run(keyId, jwtPayload, signature, jwt || null, Date.now());
  return info.lastInsertRowid;
};

export const getSignaturesByCredentialId = async (credentialId: string) => {
  const db = await getDatabase();
  // Get JWT key for this credential first
  const jwtKey = await getJWTKeyByCredentialId(credentialId);
  if (!jwtKey) {
    return [];
  }

  const stmt = db.prepare(`
    SELECT signature_id, jwt_payload, signature, jwt, created_at
    FROM signed_jwts
    WHERE key_id = ?
    ORDER BY created_at DESC
  `);
  return stmt.all(jwtKey.keyId) as Array<{
    signature_id: number;
    jwt_payload: string;
    signature: string;
    jwt: string | null;
    created_at: number;
  }>;
};

export const getSignaturesByCredentialIdWithCredentials = async (
  credentialId: string
) => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    SELECT 
      s.signature_id,
      jk.credential_id,
      jk.key_id,
      jk.public_key_jwk,
      s.jwt_payload,
      s.signature,
      s.jwt,
      s.created_at,
      c.public_key_cose_format,
      c.counter,
      c.transports,
      c.created_at as credential_created_at
    FROM signed_jwts s
    INNER JOIN attested_jwt_keys jk ON s.key_id = jk.key_id
    INNER JOIN passkey_credentials c ON jk.credential_id = c.credential_id
    WHERE jk.credential_id = ?
    ORDER BY s.created_at DESC
  `);
  return stmt.all(credentialId) as Array<{
    signature_id: number;
    credential_id: string;
    key_id: string;
    public_key_jwk: string;
    jwt_payload: string;
    signature: string;
    jwt: string | null;
    created_at: number;
    public_key_cose_format: string;
    counter: number;
    transports: string;
    credential_created_at: number;
  }>;
};

export const getAllSignaturesWithCredentials = async () => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    SELECT 
      s.signature_id,
      jk.credential_id,
      jk.key_id,
      jk.public_key_jwk,
      s.jwt_payload,
      s.signature,
      s.jwt,
      s.created_at,
      c.public_key_cose_format,
      c.counter,
      c.transports,
      c.created_at as credential_created_at
    FROM signed_jwts s
    INNER JOIN attested_jwt_keys jk ON s.key_id = jk.key_id
    INNER JOIN passkey_credentials c ON jk.credential_id = c.credential_id
    ORDER BY c.public_key_cose_format, s.created_at DESC
  `);
  return stmt.all() as Array<{
    signature_id: number;
    credential_id: string;
    key_id: string;
    public_key_jwk: string;
    jwt_payload: string;
    signature: string;
    jwt: string | null;
    created_at: number;
    public_key_cose_format: string;
    counter: number;
    transports: string;
    credential_created_at: number;
  }>;
};

// Pending passkey registration operations
export const saveRegistrationOptions = async (
  userId: string,
  registrationOptions: PublicKeyCredentialCreationOptionsJSON
) => {
  const db = await getDatabase();
  // Use the original userId string, not the encoded user.id from registrationOptions
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO pending_passkey_registrations (user_id, options, created_at)
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
    FROM pending_passkey_registrations
    WHERE user_id = ?
  `);
  const row = stmt.get(userID) as { options: string } | undefined;

  if (!row) return null;

  return JSON.parse(row.options);
};

export const removeRegistrationOptions = async (userID: string) => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    DELETE FROM pending_passkey_registrations
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

// Utility function to delete the test database file
// Only works in test environment for safety
export const deleteTestDatabase = async () => {
  if (process.env.NODE_ENV !== "test") {
    throw new Error(
      "deleteTestDatabase can only be called in test environment"
    );
  }

  await closeDatabase();

  if (fs.existsSync(DB_PATH)) {
    try {
      fs.unlinkSync(DB_PATH);
      console.log(`✅ Deleted test database: ${DB_PATH}`);
    } catch (error) {
      console.error("Error deleting test database:", error);
    }
  }
};

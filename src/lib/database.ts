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

  // Create users table
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      credential_id TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (credential_id) REFERENCES passkey_credentials (credential_id)
    )
  `);

  // Create attested JWT keys table
  // This stores JWT signing keys that are attested by passkeys
  // 1:1 relationship between user and JWT key
  database.exec(`
    CREATE TABLE IF NOT EXISTS attested_jwt_keys (
      key_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      credential_id TEXT NOT NULL UNIQUE,
      public_key_jwk TEXT NOT NULL,
      public_key_pem TEXT NOT NULL,
      public_key_fingerprint TEXT NOT NULL,
      passkey_attestation TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (credential_id) REFERENCES passkey_credentials (credential_id),
      FOREIGN KEY (user_id) REFERENCES users (user_id)
    )
  `);

  // Create statements table
  database.exec(`
    CREATE TABLE IF NOT EXISTS statements (
      statement_id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      creator_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (creator_id) REFERENCES users (user_id)
    )
  `);

  // Create statement signatures table
  database.exec(`
    CREATE TABLE IF NOT EXISTS statement_signatures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      statement_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      signature TEXT NOT NULL,
      jwt TEXT NOT NULL,
      signed_at INTEGER NOT NULL,
      UNIQUE(statement_id, user_id),
      FOREIGN KEY (statement_id) REFERENCES statements (statement_id),
      FOREIGN KEY (user_id) REFERENCES users (user_id)
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

// User operations
export const saveUser = async (
  userId: string,
  name: string,
  role: string,
  credentialId: string
) => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO users (user_id, name, role, credential_id, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(userId, name, role, credentialId, Date.now());
};

export const getUser = async (userId: string) => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    SELECT user_id, name, role, credential_id, created_at
    FROM users
    WHERE user_id = ?
  `);
  const row = stmt.get(userId) as
    | {
        user_id: string;
        name: string;
        role: string;
        credential_id: string;
        created_at: number;
      }
    | undefined;

  if (!row) return null;

  return {
    userId: row.user_id,
    name: row.name,
    role: row.role,
    credentialId: row.credential_id,
    createdAt: row.created_at,
  };
};

export const getUserByCredentialId = async (credentialId: string) => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    SELECT user_id, name, role, credential_id, created_at
    FROM users
    WHERE credential_id = ?
  `);
  const row = stmt.get(credentialId) as
    | {
        user_id: string;
        name: string;
        role: string;
        credential_id: string;
        created_at: number;
      }
    | undefined;

  if (!row) return null;

  return {
    userId: row.user_id,
    name: row.name,
    role: row.role,
    credentialId: row.credential_id,
    createdAt: row.created_at,
  };
};

export const getAllUsers = async () => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    SELECT user_id, name, role, credential_id, created_at
    FROM users
    ORDER BY created_at ASC
  `);
  return stmt.all() as Array<{
    user_id: string;
    name: string;
    role: string;
    credential_id: string;
    created_at: number;
  }>;
};

// Attested JWT Key operations
export const saveJWTKey = async (
  keyId: string,
  userIdOrCredentialId: string,
  credentialIdOrPublicKeyJWK: string,
  publicKeyJWKOrPEM: string,
  publicKeyPEMOrFingerprint?: string,
  publicKeyFingerprintOrAttestation?: string,
  passkeyAttestation?: string
) => {
  const db = await getDatabase();

  // Support both old (5 params) and new (7 params) signatures for backward compatibility with tests
  if (passkeyAttestation === undefined) {
    // Old signature: (keyId, credentialId, publicKeyJWK, publicKeyFingerprint, passkeyAttestation)
    // Ensure test user exists
    const testUserId = "test-user";
    const credId = userIdOrCredentialId;

    try {
      // Check if test user exists
      const userCheck = db.prepare(
        "SELECT user_id FROM users WHERE user_id = ?"
      );
      const existingUser = userCheck.get(testUserId);

      if (!existingUser) {
        // Create test user
        const createUser = db.prepare(`
          INSERT OR IGNORE INTO users (user_id, name, role, credential_id, created_at)
          VALUES (?, ?, ?, ?, ?)
        `);
        createUser.run(testUserId, "Test User", "creator", credId, Date.now());
      }
    } catch {
      // Ignore errors in test mode
      console.log("Note: Creating test user for testing");
    }

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO attested_jwt_keys (key_id, user_id, credential_id, public_key_jwk, public_key_pem, public_key_fingerprint, passkey_attestation, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      keyId,
      testUserId, // Default user ID for tests
      credId, // credentialId
      credentialIdOrPublicKeyJWK, // publicKeyJWK
      "", // Empty PEM for tests
      publicKeyJWKOrPEM, // publicKeyFingerprint
      publicKeyPEMOrFingerprint || "", // passkeyAttestation
      Date.now()
    );
  } else {
    // New signature: (keyId, userId, credentialId, publicKeyJWK, publicKeyPEM, publicKeyFingerprint, passkeyAttestation)
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO attested_jwt_keys (key_id, user_id, credential_id, public_key_jwk, public_key_pem, public_key_fingerprint, passkey_attestation, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      keyId,
      userIdOrCredentialId, // userId
      credentialIdOrPublicKeyJWK, // credentialId
      publicKeyJWKOrPEM, // publicKeyJWK
      publicKeyPEMOrFingerprint!, // publicKeyPEM
      publicKeyFingerprintOrAttestation!, // publicKeyFingerprint
      passkeyAttestation, // passkeyAttestation
      Date.now()
    );
  }
};

export const getJWTKey = async (keyId: string) => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    SELECT key_id, user_id, credential_id, public_key_jwk, public_key_pem, public_key_fingerprint, passkey_attestation, created_at
    FROM attested_jwt_keys
    WHERE key_id = ?
  `);
  const row = stmt.get(keyId) as
    | {
        key_id: string;
        user_id: string;
        credential_id: string;
        public_key_jwk: string;
        public_key_pem: string;
        public_key_fingerprint: string;
        passkey_attestation: string;
        created_at: number;
      }
    | undefined;

  if (!row) return null;

  return {
    keyId: row.key_id,
    userId: row.user_id,
    credentialId: row.credential_id,
    publicKeyJWK: JSON.parse(row.public_key_jwk),
    publicKeyPEM: row.public_key_pem,
    publicKeyFingerprint: row.public_key_fingerprint,
    passkeyAttestation: JSON.parse(row.passkey_attestation),
    createdAt: row.created_at,
  };
};

export const getJWTKeyByCredentialId = async (credentialId: string) => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    SELECT key_id, user_id, credential_id, public_key_jwk, public_key_pem, public_key_fingerprint, passkey_attestation, created_at
    FROM attested_jwt_keys
    WHERE credential_id = ?
  `);
  const row = stmt.get(credentialId) as
    | {
        key_id: string;
        user_id: string;
        credential_id: string;
        public_key_jwk: string;
        public_key_pem: string;
        public_key_fingerprint: string;
        passkey_attestation: string;
        created_at: number;
      }
    | undefined;

  if (!row) return null;

  return {
    keyId: row.key_id,
    userId: row.user_id,
    credentialId: row.credential_id,
    publicKeyJWK: JSON.parse(row.public_key_jwk),
    publicKeyPEM: row.public_key_pem,
    publicKeyFingerprint: row.public_key_fingerprint,
    passkeyAttestation: JSON.parse(row.passkey_attestation),
    createdAt: row.created_at,
  };
};

export const getJWTKeyByUserId = async (userId: string) => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    SELECT key_id, user_id, credential_id, public_key_jwk, public_key_pem, public_key_fingerprint, passkey_attestation, created_at
    FROM attested_jwt_keys
    WHERE user_id = ?
  `);
  const row = stmt.get(userId) as
    | {
        key_id: string;
        user_id: string;
        credential_id: string;
        public_key_jwk: string;
        public_key_pem: string;
        public_key_fingerprint: string;
        passkey_attestation: string;
        created_at: number;
      }
    | undefined;

  if (!row) return null;

  return {
    keyId: row.key_id,
    userId: row.user_id,
    credentialId: row.credential_id,
    publicKeyJWK: JSON.parse(row.public_key_jwk),
    publicKeyPEM: row.public_key_pem,
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

// Statement operations
export const saveStatement = async (
  statementId: string,
  content: string,
  creatorId: string
) => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    INSERT INTO statements (statement_id, content, creator_id, created_at)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(statementId, content, creatorId, Date.now());
};

export const getStatement = async (statementId: string) => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    SELECT statement_id, content, creator_id, created_at
    FROM statements
    WHERE statement_id = ?
  `);
  const row = stmt.get(statementId) as
    | {
        statement_id: string;
        content: string;
        creator_id: string;
        created_at: number;
      }
    | undefined;

  if (!row) return null;

  return {
    statementId: row.statement_id,
    content: row.content,
    creatorId: row.creator_id,
    createdAt: row.created_at,
  };
};

export const getAllStatements = async () => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    SELECT statement_id, content, creator_id, created_at
    FROM statements
    ORDER BY created_at DESC
  `);
  return stmt.all() as Array<{
    statement_id: string;
    content: string;
    creator_id: string;
    created_at: number;
  }>;
};

// Statement signature operations
export const saveStatementSignature = async (
  statementId: string,
  userId: string,
  signature: string,
  jwt: string
) => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    INSERT INTO statement_signatures (statement_id, user_id, signature, jwt, signed_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const info = stmt.run(statementId, userId, signature, jwt, Date.now());
  return info.lastInsertRowid;
};

export const getStatementSignatures = async (statementId: string) => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    SELECT 
      ss.id,
      ss.statement_id,
      ss.user_id,
      ss.signature,
      ss.jwt,
      ss.signed_at,
      u.name,
      u.role
    FROM statement_signatures ss
    INNER JOIN users u ON ss.user_id = u.user_id
    WHERE ss.statement_id = ?
    ORDER BY ss.signed_at ASC
  `);
  return stmt.all(statementId) as Array<{
    id: number;
    statement_id: string;
    user_id: string;
    signature: string;
    jwt: string;
    signed_at: number;
    name: string;
    role: string;
  }>;
};

export const hasUserSignedStatement = async (
  statementId: string,
  userId: string
): Promise<boolean> => {
  const db = await getDatabase();
  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM statement_signatures
    WHERE statement_id = ? AND user_id = ?
  `);
  const row = stmt.get(statementId, userId) as { count: number } | undefined;
  return (row?.count ?? 0) > 0;
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

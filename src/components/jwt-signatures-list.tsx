"use client";

import { useEffect, useState } from "react";
import { type JWTPayload } from "@/lib/jwt-signing";
import { decodeProtectedHeader, decodeJwt } from "jose";

interface Credential {
  publicKey: string;
  counter: number;
  transports: string[];
  createdAt: number;
}

interface Signature {
  id: number;
  credentialId: string;
  payload: JWTPayload;
  signature: string;
  jwt: string | null;
  timestamp: number;
  credential: Credential;
}

interface GroupedSignatures {
  publicKey: string;
  credentialId: string;
  credential: Credential;
  signatures: Signature[];
}

interface JWTSignaturesListProps {
  credentialId?: string;
  refreshTrigger: number;
  showTitle?: boolean;
}

interface DecodedJWT {
  header: any;
  payload: any;
  signaturePreview: string;
}

function decodeJWTSafe(jwt: string): DecodedJWT | null {
  try {
    const header = decodeProtectedHeader(jwt);
    const payload = decodeJwt(jwt);
    const parts = jwt.split(".");
    const signaturePreview = parts[2]
      ? `${parts[2].substring(0, 40)}...`
      : "N/A";

    return { header, payload, signaturePreview };
  } catch (error) {
    console.error("Error decoding JWT:", error);
    return null;
  }
}

export default function JWTSignaturesList({
  credentialId,
  refreshTrigger,
  showTitle = true,
}: JWTSignaturesListProps) {
  const [groupedSignatures, setGroupedSignatures] = useState<
    GroupedSignatures[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSigs, setExpandedSigs] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchSignatures = async () => {
      try {
        setIsLoading(true);
        // Build URL with optional credentialId filter
        const url = credentialId
          ? `/api/signatures?credentialId=${encodeURIComponent(credentialId)}`
          : "/api/signatures";

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Failed to fetch signatures");
        }

        const result = await response.json();
        const allSignatures: Signature[] = result.signatures || [];

        // Group signatures by public key
        const grouped = allSignatures.reduce((acc, sig) => {
          const existingGroup = acc.find(
            (g) => g.publicKey === sig.credential.publicKey
          );
          if (existingGroup) {
            existingGroup.signatures.push(sig);
          } else {
            acc.push({
              publicKey: sig.credential.publicKey,
              credentialId: sig.credentialId,
              credential: sig.credential,
              signatures: [sig],
            });
          }
          return acc;
        }, [] as GroupedSignatures[]);

        setGroupedSignatures(grouped);
      } catch (error) {
        console.error("Error fetching signatures:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignatures();
  }, [credentialId, refreshTrigger]);

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mt-8">
        <h2 className="text-xl font-semibold mb-4">Signed JWTs</h2>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const totalSignatures = groupedSignatures.reduce(
    (sum, group) => sum + group.signatures.length,
    0
  );

  if (totalSignatures === 0) {
    return (
      <div className="w-full max-w-2xl mt-8">
        <h2 className="text-xl font-semibold mb-4">Signed JWTs</h2>
        <p className="text-gray-500">No signatures yet. Sign your first JWT!</p>
      </div>
    );
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const truncateKey = (key: string, length: number = 16) => {
    if (key.length <= length) return key;
    return `${key.substring(0, length)}...${key.substring(key.length - 8)}`;
  };

  return (
    <div className="w-full max-w-4xl mt-8">
      {showTitle && (
        <h2 className="text-xl font-semibold mb-4">
          Signed JWTs ({totalSignatures} total, {groupedSignatures.length}{" "}
          passkey{groupedSignatures.length !== 1 ? "s" : ""})
        </h2>
      )}
      <div className="space-y-6">
        {groupedSignatures.map((group) => (
          <div
            key={group.publicKey}
            className="border-2 border-purple-300 dark:border-purple-700 rounded-lg p-5 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950"
          >
            {/* Passkey Header */}
            <div className="mb-4 pb-4 border-b-2 border-purple-200 dark:border-purple-800">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-bold text-purple-700 dark:text-purple-300">
                  Passkey Information
                </h3>
                <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full">
                  {group.signatures.length} signature
                  {group.signatures.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-2 mt-3">
                <div className="text-sm">
                  <span className="font-semibold text-purple-800 dark:text-purple-200">
                    Public Key:
                  </span>{" "}
                  <button
                    onClick={() => copyToClipboard(group.publicKey)}
                    className="font-mono text-xs text-purple-600 dark:text-purple-400 hover:underline break-all"
                    title={group.publicKey}
                  >
                    {truncateKey(group.publicKey, 32)}
                  </button>
                </div>
                <div className="text-sm">
                  <span className="font-semibold text-purple-800 dark:text-purple-200">
                    Credential ID:
                  </span>{" "}
                  <span className="font-mono text-xs text-purple-600 dark:text-purple-400 break-all">
                    {truncateKey(group.credentialId, 24)}
                  </span>
                </div>
                <div className="text-sm">
                  {/* <span className="font-semibold text-purple-800 dark:text-purple-200">
                    Counter:
                  </span>{" "}
                  <span className="text-purple-600 dark:text-purple-400">
                    {group.credential.counter}
                  </span>
                  {" | "} */}
                  <span className="font-semibold text-purple-800 dark:text-purple-200">
                    Created:
                  </span>{" "}
                  <span className="text-purple-600 dark:text-purple-400">
                    {new Date(group.credential.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Signatures for this passkey */}
            <div className="space-y-4">
              {group.signatures.map((sig) => {
                const decoded = sig.jwt ? decodeJWTSafe(sig.jwt) : null;
                const isExpanded = expandedSigs.has(sig.id);

                return (
                  <div
                    key={sig.id}
                    className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            JWT ID: {sig.id}
                          </span>
                          {decoded && (
                            <code className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded font-semibold">
                              {decoded.header.alg}
                            </code>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {new Date(sig.timestamp).toLocaleString()}
                          </span>
                          {sig.jwt && (
                            <button
                              onClick={() => {
                                const newExpanded = new Set(expandedSigs);
                                if (isExpanded) {
                                  newExpanded.delete(sig.id);
                                } else {
                                  newExpanded.add(sig.id);
                                }
                                setExpandedSigs(newExpanded);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                            >
                              {isExpanded ? "Hide Details" : "Show All Details"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Quick Summary */}
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            Message:
                          </span>{" "}
                          <span className="text-gray-600 dark:text-gray-400">
                            {sig.payload.message}
                          </span>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && decoded && sig.jwt && (
                        <div className="space-y-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                          {/* JWT Header */}
                          <div>
                            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                              <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
                                JWT HEADER
                              </span>
                            </div>
                            <div className="text-xs font-mono bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                              <pre className="whitespace-pre-wrap">
                                {JSON.stringify(decoded.header, null, 2)}
                              </pre>
                            </div>
                          </div>

                          {/* JWT Payload */}
                          <div>
                            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                              <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                                JWT PAYLOAD
                              </span>
                            </div>
                            <div className="space-y-3">
                              {/* User Data */}
                              <div>
                                <div className="text-xs font-medium text-gray-500 mb-1">
                                  📋 User Data
                                </div>
                                <div className="text-xs font-mono bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 space-y-1">
                                  <div>
                                    <span className="text-gray-500">
                                      message:
                                    </span>{" "}
                                    {decoded.payload.message}
                                  </div>
                                  <div>
                                    <span className="text-gray-500">
                                      nonce:
                                    </span>{" "}
                                    {decoded.payload.nonce}
                                  </div>
                                  <div>
                                    <span className="text-gray-500">
                                      timestamp:
                                    </span>{" "}
                                    {decoded.payload.timestamp}
                                  </div>
                                  {decoded.payload.iat && (
                                    <div>
                                      <span className="text-gray-500">
                                        iat:
                                      </span>{" "}
                                      {decoded.payload.iat}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Ephemeral Public Key */}
                              {decoded.payload.epk && (
                                <div>
                                  <div className="text-xs font-medium text-gray-500 mb-1">
                                    🔑 Ephemeral Public Key (EPK)
                                  </div>
                                  <div className="text-xs font-mono bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                                    <pre className="whitespace-pre-wrap">
                                      {JSON.stringify(
                                        decoded.payload.epk,
                                        null,
                                        2
                                      )}
                                    </pre>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1 italic">
                                    This ephemeral key was used to sign the JWT
                                  </div>
                                </div>
                              )}

                              {/* Passkey Attestation */}
                              {decoded.payload.passkey_attestation && (
                                <div>
                                  <div className="text-xs font-medium text-gray-500 mb-1">
                                    🔐 Passkey Attestation
                                  </div>
                                  <div className="text-xs font-mono bg-orange-50 dark:bg-orange-900/20 p-3 rounded border border-orange-200 dark:border-orange-800 space-y-2">
                                    <div>
                                      <span className="text-gray-500">
                                        Credential ID:
                                      </span>{" "}
                                      <span className="text-orange-700 dark:text-orange-300 break-all">
                                        {
                                          decoded.payload.passkey_attestation
                                            .credential_id
                                        }
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">
                                        Fingerprint:
                                      </span>{" "}
                                      <span className="text-orange-700 dark:text-orange-300 break-all">
                                        {
                                          decoded.payload.passkey_attestation
                                            .fingerprint
                                        }
                                      </span>
                                    </div>
                                    <div className="pt-2 border-t border-orange-200 dark:border-orange-800">
                                      <div className="text-gray-500 mb-1">
                                        WebAuthn Signature:
                                      </div>
                                      <pre className="whitespace-pre-wrap text-[10px] max-h-40 overflow-y-auto">
                                        {JSON.stringify(
                                          decoded.payload.passkey_attestation
                                            .signature,
                                          null,
                                          2
                                        )}
                                      </pre>
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1 italic">
                                    The passkey signed the ephemeral public key
                                    fingerprint
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* JWT Signature */}
                          <div>
                            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                              <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded">
                                JWT SIGNATURE
                              </span>
                            </div>
                            <div className="text-xs font-mono bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 break-all">
                              {decoded.signaturePreview}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 italic">
                              Standard EdDSA signature - verifiable with
                              jose.jwtVerify()
                            </div>
                          </div>

                          {/* Full JWT */}
                          <div>
                            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                              <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">
                                FULL JWT
                              </span>
                              <button
                                onClick={() => copyToClipboard(sig.jwt!)}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                📋 Copy
                              </button>
                            </div>
                            <div className="text-xs font-mono bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 break-all max-h-32 overflow-y-auto">
                              {sig.jwt}
                            </div>
                          </div>

                          {/* Security Info */}
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                            <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">
                              🔒 Security Properties
                            </div>
                            <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                              <div>
                                ✅ Standard JWT signature (verifiable with any
                                JWT library)
                              </div>
                              <div>
                                ✅ Ephemeral key attested by hardware-backed
                                passkey
                              </div>
                              <div>
                                ✅ Two-stage verification (JWT + passkey
                                attestation)
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Basic info when collapsed */}
                      {!isExpanded && (
                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              Nonce:
                            </span>{" "}
                            <span className="font-mono text-xs text-gray-600 dark:text-gray-400 break-all">
                              {sig.payload.nonce}
                            </span>
                          </div>
                          {sig.jwt && (
                            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                  JWT Token
                                </span>
                                <button
                                  onClick={() => copyToClipboard(sig.jwt!)}
                                  className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-0.5 rounded"
                                >
                                  Copy
                                </button>
                              </div>
                              <div className="font-mono text-[10px] text-gray-600 dark:text-gray-400 break-all">
                                {sig.jwt.substring(0, 120)}...
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

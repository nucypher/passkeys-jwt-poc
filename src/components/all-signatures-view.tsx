"use client";

import JWTSignaturesList from "./jwt-signatures-list";

export default function AllSignaturesView() {
  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">All Signed JWTs</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          View all signed JWTs from all passkeys
        </p>
      </div>

      {/* Pass undefined credentialId to show all signatures */}
      <JWTSignaturesList refreshTrigger={0} />
    </div>
  );
}

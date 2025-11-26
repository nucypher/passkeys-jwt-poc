"use client";

interface SignatureIndicatorProps {
  userName: string;
  signature: string;
  signedAt: number;
  showDetails?: boolean;
}

export default function SignatureIndicator({
  userName,
  signature,
  signedAt,
  showDetails = false,
}: SignatureIndicatorProps) {
  const formattedDate = new Date(signedAt).toLocaleString();

  if (showDetails) {
    return (
      <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <div className="flex items-start gap-2">
          <span className="text-green-600 dark:text-green-400 text-xl">✓</span>
          <div className="flex-1">
            <div className="font-medium text-green-900 dark:text-green-100">
              {userName}
            </div>
            <div className="text-xs text-green-700 dark:text-green-300 mt-1">
              Signed on {formattedDate}
            </div>
            <details className="mt-2">
              <summary className="text-xs text-green-600 dark:text-green-400 cursor-pointer hover:underline">
                View signature
              </summary>
              <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border border-green-200 dark:border-green-700">
                <p className="font-mono text-xs break-all text-gray-700 dark:text-gray-300">
                  {signature.substring(0, 100)}...
                </p>
              </div>
            </details>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-md text-sm"
      title={`Signed by ${userName} on ${formattedDate}`}
    >
      <span className="text-green-600 dark:text-green-400">✓</span>
      <span>{userName}</span>
      
      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
        <div className="bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap">
          <div>Signed: {formattedDate}</div>
          <div className="mt-1 text-gray-400">Hover for details</div>
        </div>
      </div>
    </div>
  );
}


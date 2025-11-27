"use client";

import Link from "next/link";
import Image from "next/image";

export default function RoleSelector() {
  return (
    <div className="flex flex-col items-center gap-12 w-full max-w-5xl">
      {/* Header with Logo */}
      <div className="flex flex-col items-center gap-6">
        <Image
          className="dark:invert"
          src="/taco.svg"
          alt="TACo logo"
          width={300}
          height={128}
          priority
        />

        <div className="text-center max-w-2xl">
          <h1 className="text-4xl font-bold mb-3">
            Multi-Signature Statement Approval
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Collaborative approval through threshold signatures
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            No passwords • Biometric authentication • Cryptographic signatures
          </p>
        </div>
      </div>

      {/* New Users Section */}
      <div className="w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900">
            <span className="text-xl">✨</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              New User? Create Your Account
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choose your role, create a passkey and attested a JWT key to get
              started
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Link
            href="/creator"
            className="group relative p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl shadow-lg hover:shadow-2xl transition-all border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 hover:scale-[1.02]"
          >
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                CREATE ACCOUNT
              </span>
            </div>
            <div className="text-5xl mb-4">📝</div>
            <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
              Creator
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">
              Create JSON statements for collaborative signing
            </p>
            <div className="flex flex-col gap-2 text-s text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Create passkey with your device</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Setup: Passkey attests your signing key</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Create statements for others to sign</span>
              </div>
            </div>
          </Link>

          <Link
            href="/investor"
            className="group relative p-8 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl shadow-lg hover:shadow-2xl transition-all border-2 border-amber-200 dark:border-amber-800 hover:border-amber-400 dark:hover:border-amber-600 hover:scale-[1.02]"
          >
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-amber-500 text-white text-xs font-semibold rounded-full">
                CREATE ACCOUNT
              </span>
            </div>
            <div className="text-5xl mb-4">✍️</div>
            <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100 group-hover:text-amber-600 dark:group-hover:text-amber-400">
              Investor
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">
              Review and approve statements by signing them
            </p>
            <div className="flex flex-col gap-2 text-s text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Create passkey with your device</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Setup: Passkey attests your signing key</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Review and sign existing statements</span>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Divider */}
      <div className="w-full flex items-center gap-4">
        <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700"></div>
        <span className="text-sm text-gray-500 dark:text-gray-500 font-medium">
          OR
        </span>
        <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700"></div>
      </div>

      {/* Returning Users Section */}
      <div className="w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900">
            <span className="text-xl">🔑</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Already Registered?
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Access your account with your existing passkey
            </p>
          </div>
        </div>

        <Link
          href="/users"
          className="group block p-8 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl shadow-lg hover:shadow-2xl transition-all border-2 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 hover:scale-[1.01]"
        >
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-purple-500 dark:bg-purple-600 flex items-center justify-center text-3xl">
                👤
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                Login as Existing User
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Select your account and authenticate with your passkey - no
                password needed
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-gray-800 rounded-full border border-purple-200 dark:border-purple-700">
                  <span className="text-purple-500">⚡</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    Quick access
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-gray-800 rounded-full border border-purple-200 dark:border-purple-700">
                  <span className="text-purple-500">🔒</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    Secure authentication
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-gray-800 rounded-full border border-purple-200 dark:border-purple-700">
                  <span className="text-purple-500">🚀</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    Resume where you left off
                  </span>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 text-purple-400 dark:text-purple-500 text-2xl transform group-hover:translate-x-2 transition-transform">
              →
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

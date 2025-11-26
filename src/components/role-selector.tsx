"use client";

import Link from "next/link";
import Image from "next/image";

export default function RoleSelector() {
  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-2xl">
      <Image
        className="dark:invert"
        src="/taco.svg"
        alt="TACo logo"
        width={300}
        height={128}
        priority
      />
      
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">
          Multi-Signature Statement System
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Secure statement signing with passkey-attested JWT keys
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full mt-4">
        <Link
          href="/creator"
          className="group p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-blue-500"
        >
          <div className="text-4xl mb-4">📝</div>
          <h2 className="text-xl font-bold mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
            I am Creator
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Create and manage JSON statements for signing
          </p>
        </Link>

        <Link
          href="/investor"
          className="group p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-green-500"
        >
          <div className="text-4xl mb-4">✍️</div>
          <h2 className="text-xl font-bold mb-2 group-hover:text-green-600 dark:group-hover:text-green-400">
            I am an Investor
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Review and sign statements
          </p>
        </Link>
      </div>

      <Link
        href="/technical"
        className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline mt-4"
      >
        View Technical Details →
      </Link>
    </div>
  );
}


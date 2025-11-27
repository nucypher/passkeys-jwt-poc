import Link from "next/link";
import RoleSelector from "../components/role-selector";

export default function Home() {
  return (
    <div className="grid grid-rows-[0px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-8 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-center w-full">
        <RoleSelector />
      </main>
      <footer className="row-start-3 flex gap-4 flex-wrap items-center justify-center text-xs text-gray-500 dark:text-gray-400">
        <Link
          href="/technical"
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          Technical Dashboard
        </Link>
        <span> -&gt; </span>
        <Link
          href="/technical/statements"
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          Statements
        </Link>
        <span>·</span>
        <Link
          href="/technical/keys"
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          Users & Keys
        </Link>
        <span>|</span>
        <Link
          href="/technical/flow"
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          Flow Diagram
        </Link>
        <span>·</span>
        <Link
          href="/technical/verification"
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          Verification Guide
        </Link>
      </footer>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import AllSignaturesView from "@/components/all-signatures-view";

export default function AllSignaturesPage() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-center">
        <Image
          className="dark:invert"
          src="/taco.svg"
          alt="TACo logo"
          width={300}
          height={128}
          priority
        />
        <div className="flex gap-4 mb-4">
          <Link
            href="/"
            className="rounded-full border border-solid border-gray-300 dark:border-gray-700 transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
          >
            ← Back to Home
          </Link>
        </div>
        <AllSignaturesView />
      </main>
    </div>
  );
}

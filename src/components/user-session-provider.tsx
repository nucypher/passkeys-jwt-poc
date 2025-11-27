"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";

interface UserInfo {
  name: string;
  role: "creator" | "investor";
  credentialId: string;
  userId: string;
}

interface UserSessionContextType {
  userInfo: UserInfo | null;
  isLoading: boolean;
  logout: () => void;
  refreshUserInfo: () => void;
}

const UserSessionContext = createContext<UserSessionContextType | undefined>(
  undefined,
);

export function useUserSession() {
  const context = useContext(UserSessionContext);
  if (context === undefined) {
    throw new Error("useUserSession must be used within a UserSessionProvider");
  }
  return context;
}

export function UserSessionProvider({ children }: { children: ReactNode }) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setIsMounted(true);
    checkLoginStatus();

    // Listen for custom login events
    const handleLoginEvent = () => {
      checkLoginStatus();
    };

    window.addEventListener("userLoggedIn", handleLoginEvent);

    return () => {
      window.removeEventListener("userLoggedIn", handleLoginEvent);
    };
  }, [pathname]);

  async function checkLoginStatus() {
    try {
      const session = localStorage.getItem("userSession");

      if (!session) {
        setUserInfo(null);
        setIsLoading(false);
        return;
      }

      const sessionData = JSON.parse(session);

      // Extract user info directly from session (role is stored in session data)
      setUserInfo({
        name: sessionData.name,
        role: sessionData.role,
        credentialId: sessionData.credentialId,
        userId: sessionData.userId,
      });
    } catch (error) {
      console.error("Failed to check login status:", error);
      setUserInfo(null);
    } finally {
      setIsLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("userSession");
    setUserInfo(null);
    router.push("/");
    router.refresh();
  }

  function refreshUserInfo() {
    checkLoginStatus();
  }

  // User Status Indicator Component (shown in top-right)
  function UserStatusIndicator() {
    if (!isMounted || isLoading) {
      return null;
    }

    if (!userInfo) {
      return null;
    }

    const roleColor =
      userInfo.role === "creator"
        ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
        : "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200";

    return (
      <div className="fixed top-4 right-4 flex items-center gap-3 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {userInfo.name}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${roleColor} capitalize font-medium inline-block w-fit`}
            >
              {userInfo.role}
            </span>
          </div>
          <div className="h-8 w-px bg-gray-300 dark:bg-gray-600" />
          <button
            onClick={logout}
            className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium transition-colors"
            title="Logout"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <UserSessionContext.Provider
      value={{ userInfo, isLoading, logout, refreshUserInfo }}
    >
      <UserStatusIndicator />
      {children}
    </UserSessionContext.Provider>
  );
}

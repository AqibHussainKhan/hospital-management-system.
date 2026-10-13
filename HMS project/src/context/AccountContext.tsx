import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "../App";

const AccountContext = createContext<User | null>(null);

export function AccountProvider({
  user,
  children
}: {
  user: User;
  children: ReactNode
}) {
  return (
    <AccountContext.Provider value={user}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const user = useContext(AccountContext);

  if (!user) throw new Error("AccountProvider must wrap AppRoutes");

  return user;
}

export function AccountAvatar({
  user,
  className = ""
}: {
  user: User;
  className?: string
}) {
  const [failedUrl, setFailedUrl] = useState<string | undefined>(undefined);

  const initials = (user.name || user.email || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(v => v[0])
    .join("")
    .toUpperCase();

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-blue-500/10 font-semibold text-blue-500 ${className}`}
    >
      {user.picture && failedUrl !== user.picture ? (
        <img
          src={user.picture}
          alt=""
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setFailedUrl(user.picture)}
        />
      ) : initials}
    </span>
  );
}
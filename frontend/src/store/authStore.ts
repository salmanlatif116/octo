import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "admin" | "user";

export interface SessionUser {
    user_id: string;
    name: string;
    role: Role;
    /** 1 = blocked, 0 = active (as of login) */
    status: number;
}

/** What /auth/login and /auth/refresh return. */
export interface Tokens {
    access_token: string;
    refresh_token: string;
    user: SessionUser;
}

interface AuthStore {
    accessToken: string | null;
    refreshToken: string | null;
    user: SessionUser | null;
    /** Store a fresh login / refresh result. */
    setTokens: (tokens: Tokens) => void;
    /** Forget the session (does not call the server; use signOut() from lib/api for that). */
    clear: () => void;
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set) => ({
            accessToken: null,
            refreshToken: null,
            user: null,
            setTokens: (t) => set({ accessToken: t.access_token, refreshToken: t.refresh_token, user: t.user }),
            clear: () => set({ accessToken: null, refreshToken: null, user: null }),
        }),
        { name: "octo-auth" }
    )
);

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
    name: string;
    email: string;
    dueDate: string;
}

interface AuthStore {
    accessToken: string | null;
    refreshToken: string | null;
    user: User | null;
    login: (accessToken: string, refreshToken: string, user: User) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set) => ({
            accessToken: null,
            refreshToken: null,
            user: null,
            
            login: (accessToken, refreshToken, user) => {
                set({
                    accessToken,
                    refreshToken,
                    user,
                })
            },

            logout: () => {
                set({
                    accessToken: null,
                    refreshToken: null,
                    user: null,
                })
            }
        }),
        {
            name: "auth-storage"
        }
    )
)
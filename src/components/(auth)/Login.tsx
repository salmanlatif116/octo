import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { Lock, Mail } from "lucide-react";
import octoLogo from "../../assets/octo-logo.png";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../../store/authStore";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const login = useAuthStore((state) => state.login);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);

        if (!email || !password) {
            setError("Enter your email and password to continue.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_BASE_URL}/api/v1/auth/login/`,

                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "ngrok-skip-browser-warning": "true",
                    },
                    body: JSON.stringify({
                        email,
                        password,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error.message || "Login failed")
            }

            const user = {email: data.user.email, name: data.user.full_name, dueDate: data.user.date_joined}

            login(data.access, data.refresh, user);
        }
        catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            }
            else {
                setError("Something went wrong");
            }
        }
        finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center px-6">
            <motion.div
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                    duration: 0.5,
                    type: "spring",
                }}
                className="w-full max-w-sm rounded-xl bg-[#88afed19] py-10 shadow-lg"
            >
                {/* Logo & Heading */}
                <div className="flex flex-col items-center justify-center">
                    <motion.img
                        src={octoLogo}
                        alt="octo logo"
                        className="mb-4 w-20"
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                            delay: 0.15,
                            type: "spring",
                            stiffness: 180,
                        }}
                    />

                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="text-2xl font-bold text-[#083174]"
                    >
                        Welcome Back!
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.35 }}
                        className="mt-1 text-sm text-gray-500"
                    >
                        Login to your account
                    </motion.p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="space-y-4 rounded-3xl p-6"
                >
                    <AnimatePresence>
                        {error && (
                            <motion.p
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600"
                            >
                                {error}
                            </motion.p>
                        )}
                    </AnimatePresence>

                    {/* Email */}
                    <motion.div
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.45 }}
                    >
                        <label className="mb-1.5 block text-sm font-semibold text-[#083174]">
                            Email
                        </label>

                        <motion.div
                            whileFocus={{ scale: 1.01 }}
                            className="flex items-center gap-2 rounded-xl border border-[#0831748a] px-3 py-3 focus-within:border-[#083174] focus-within:ring-2 focus-within:ring-[#083174]/20"
                        >
                            <Mail size={18} className="text-slate-400" />

                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full outline-none placeholder:text-[#0831748a]"
                            />
                        </motion.div>
                    </motion.div>

                    {/* Password */}
                    <motion.div
                        initial={{ opacity: 0, x: 15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.55 }}
                    >
                        <label className="mb-1.5 block text-sm font-semibold text-[#083174]">
                            Password
                        </label>

                        <motion.div
                            whileFocus={{ scale: 1.01 }}
                            className="flex items-center gap-2 rounded-xl border border-[#0831748a] px-3 py-3 focus-within:border-[#083174] focus-within:ring-2 focus-within:ring-[#083174]/20"
                        >
                            <Lock size={18} className="text-slate-400" />

                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full outline-none placeholder:text-[#0831748a]"
                            />
                        </motion.div>
                    </motion.div>

                    {/* Login Button */}
                    <motion.button
                        type="submit"
                        disabled={loading}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.65 }}
                        whileHover={{
                            scale: 1.02,
                            boxShadow: "0px 10px 25px rgba(8,49,116,.25)",
                        }}
                        whileTap={{ scale: 0.97 }}
                        className="w-full rounded-xl bg-[#083174] py-3.5 font-bold text-white shadow-sm disabled:opacity-60"
                    >
                        {loading ? "Signing in..." : "Log in"}
                    </motion.button>
                </form>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="mt-6 text-center text-sm"
                >
                    Don't have an account?{" "}
                    <Link
                        to="/signup"
                        className="font-semibold text-[#083174]"
                    >
                        Sign Up
                    </Link>
                </motion.p>
            </motion.div>
        </div>
    );
}
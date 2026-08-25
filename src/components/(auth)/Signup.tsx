import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Mail, User } from "lucide-react";
import octoLogo from "../../assets/octo-logo.png";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../../store/authStore";


export default function Signup() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const login = useAuthStore((state) => state.login);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);

        if (!name || !email || !password) {
            setError("Fill in every field to create your account.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_BASE_URL}/api/v1/auth/register/`,

                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "ngrok-skip-browser-warning": "true",
                    },
                    body: JSON.stringify({
                        full_name:name,
                        email,
                        password,
                    }),
                }
            );
            
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error.message || "Signup failed")
            }
            
            const user = {email: data.user.email, name: data.user.full_name, dueDate: data.user.date_joined}

            login(data.access, data.refresh, user);

            navigate("/", { replace: true });
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
        <div className="flex min-h-screen items-center justify-center px-6 ">
            <motion.div
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                    duration: 0.5,
                    type: "spring",
                }}
                className="w-full max-w-sm py-10 rounded-xl bg-[#88afed19] shadow-lg"
            >
                <div className="flex flex-col items-center justify-center">
                    <motion.img
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                            delay: 0.15,
                            type: "spring",
                            stiffness: 180,
                        }}
                        whileHover={{ scale: 1.05 }}
                        className="w-20 mb-4" src={octoLogo} alt="octo logo"
                    />

                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="text-2xl font-bold text-[#083174]"
                    >
                        Create your account
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.35 }}
                        className="mt-1 text-sm text-gray-500"
                    >
                        Sign up to get started
                    </motion.p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="space-y-4 rounded-3xl p-6 "
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

                    <motion.div
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.45 }}
                    >
                        <label className="mb-1.5 block text-sm font-semibold text-[#083174]">
                            Full name
                        </label>

                        <motion.div
                            whileFocus={{ scale: 1.01 }}
                            className="flex items-center gap-2 rounded-xl px-3 py-3 focus-within:border-[#083174] focus-within:ring-2 focus-within:ring-[#083174]/20 border border-[#0831748a]"
                        >
                            <User size={18} className="text-slate-400" />
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ahmed Khan"
                                className="w-full outline-none placeholder:text-[#0831748a]"
                            />
                        </motion.div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.55 }}
                    >
                        <label className="mb-1.5 block text-sm font-semibold text-[#083174]">
                            Email
                        </label>

                        <motion.div
                            whileFocus={{ scale: 1.01 }}
                            className="flex items-center gap-2 rounded-xl px-3 py-3 focus-within:border-[#083174] focus-within:ring-2 focus-within:ring-[#083174]/20 border border-[#0831748a]"
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

                    <motion.div
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.65 }}
                    >
                        <label className="mb-1.5 block text-sm font-semibold text-[#083174]">
                            Password
                        </label>

                        <motion.div
                            whileFocus={{ scale: 1.01 }}
                            className="flex items-center gap-2 rounded-xl px-3 py-3 focus-within:border-[#083174] focus-within:ring-2 focus-within:ring-[#083174]/20 border border-[#0831748a]"
                        >
                            <Lock size={18} className="text-slate-400" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="At least 6 characters"
                                className="w-full outline-none placeholder:text-[#0831748a]"
                            />
                        </motion.div>
                    </motion.div>

                    <motion.button
                        type="submit"
                        disabled={loading}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.75 }}
                        whileHover={{
                            scale: 1.02,
                            boxShadow: "0px 10px 25px rgba(8,49,116,.25)",
                        }}
                        whileTap={{ scale: 0.97 }}
                        className="w-full rounded-xl bg-[#083174] py-3.5 font-bold text-white shadow-sm active:scale-[0.98] disabled:opacity-60"
                    >
                        {loading ? "Creating account…" : "Sign up"}
                    </motion.button>
                </form>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="mt-6 text-center text-sm"
                >
                    Already have an account?{" "}
                    <Link to="/login" className="font-semibold text-[#083174]">
                        Log in
                    </Link>
                </motion.p>
            </motion.div>
        </div >
    );
}
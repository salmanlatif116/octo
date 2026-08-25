import { NavLink } from "react-router-dom";
import { Home as HomeIcon, FileText, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
    { to: "/", label: "Home", icon: HomeIcon },
    { to: "/transactions", label: "Transactions", icon: FileText },
    { to: "/contact", label: "Contact", icon: MessageCircle },
];

export default function Footer() {
    return (
        <motion.nav
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
                duration: 0.5,
                ease: "easeInOut"
            }}
            className="fixed w-full md:max-w-lg mx-auto inset-x-0 bottom-0 z-30 flex justify-around border-t border-slate-100 bg-white px-2 py-2"
        >
            {navItems.map(({ to, label, icon: Icon }, index) => (
                <motion.div
                    key={to}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                        delay: 0.45 + index * 0.1,
                    }}
                    className="flex-1"
                >
                    <NavLink to={to} end={to === "/"}>
                        {({ isActive }) => (
                            <motion.div
                                whileTap={{
                                    scale: 0.92,
                                }}
                                animate={{
                                    scale: isActive ? 1.08 : 1,
                                }}
                                transition={{
                                    type: "spring",
                                    stiffness: 300,
                                }}
                                className={`relative flex flex-col items-center gap-1 rounded-xl py-2 text-xs font-medium transition-colors ${
                                    isActive
                                        ? "text-[#083174]"
                                        : "text-slate-400"
                                }`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 rounded-xl bg-[#083174]/10"
                                        transition={{
                                            type: "spring",
                                            stiffness: 350,
                                            damping: 30,
                                        }}
                                    />
                                )}

                                <motion.div
                                    animate={{
                                        rotate: isActive ? [0, -5, 5, 0] : 0,
                                    }}
                                    transition={{
                                        duration: 0.4,
                                    }}
                                    className="relative z-10"
                                >
                                    <Icon
                                        size={20}
                                        strokeWidth={isActive ? 2.5 : 2}
                                    />
                                </motion.div>

                                <span className={`relative z-10 ${isActive ? "font-bold" : "font-semibold"}`}>
                                    {label}
                                </span>
                            </motion.div>
                        )}
                    </NavLink>
                </motion.div>
            ))}
        </motion.nav>
    );
}
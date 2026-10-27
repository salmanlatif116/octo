"use client";

import { Bell, LogOut } from "lucide-react";
import octoLogo from "@/assets/octo-logo.png";
import { motion } from "framer-motion";
import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { signOut } from "@/lib/api";

export default function Header() {
    const [confirming, setConfirming] = useState(false);

    return (
        <>
        <motion.header
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed w-full mx-auto md:max-w-lg inset-x-0 flex items-center justify-between bg-white px-5 py-4 shadow-sm"
        >
            {/* Logo */}
            <motion.img
                src={octoLogo.src}
                alt="octo logo"
                className="w-20"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                    delay: 0.1,
                    duration: 0.4,
                    type: "spring",
                    stiffness: 150,
                }}
            />

            {/* Buttons */}
            <motion.div
                className="flex items-center justify-center gap-6"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                    delay: 0.3,
                    duration: 0.5,
                    staggerChildren: 0.15,
                }}
            >
                {/* Notification */}
                <motion.button
                    aria-label="Notifications"
                    className="text-[#083174] bg-[#88afed19] p-2 rounded-full"
                    whileHover={{
                        scale: 1.15,
                        rotate: 10,
                        transition: { duration: 0.2 },
                    }}
                    whileTap={{ scale: 0.9 }}
                >
                    <Bell size={22} />
                </motion.button>

                {/* Logout */}
                <motion.button
                    onClick={() => setConfirming(true)}
                    aria-label="Log out"
                    className="text-red-500 bg-red-50 p-2 rounded-full"
                    whileHover={{
                        scale: 1.15,
                        rotate: -10,
                        transition: { duration: 0.2 },
                    }}
                    whileTap={{ scale: 0.9 }}
                >
                    <LogOut size={22} />
                </motion.button>
            </motion.div>
        </motion.header>
        <ConfirmDialog
            open={confirming}
            title="Log out?"
            message="You will need your User ID and password to sign in again."
            confirmLabel="Log out"
            danger
            onConfirm={() => signOut()}
            onCancel={() => setConfirming(false)}
        />
        </>
    );
}
"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, X } from "lucide-react";
import { formatDate, monthLabel } from "@/lib/format";
import type { Receipt } from "@/lib/api";

interface PaymentSuccessProps {
    payment: Receipt;
    userName: string;
    userId: string;
    onClose: () => void;
}

export default function PaymentSuccess({ payment, userName, userId, onClose }: PaymentSuccessProps) {
    // Auto-close after 7 seconds.
    useEffect(() => {
        const timer = setTimeout(onClose, 7000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const via = payment.method === "bank" ? "Bank card" : "JazzCash";

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.6, y: 40 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 180, damping: 15 }}
                    className="relative mx-auto w-80 rounded-3xl bg-white px-8 py-12 shadow-2xl"
                >
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 text-gray-400 transition-colors hover:text-gray-600"
                        aria-label="Close"
                    >
                        <X size={24} />
                    </button>

                    <div className="flex flex-col items-center text-center">
                        <BadgeCheck size={50} className="mb-3 text-green-500" strokeWidth={1.8} />
                        <h2 className="text-xl font-bold text-[#083174]">Payment Successful</h2>
                        <p className="mt-3 text-sm text-slate-600">On {formatDate(payment.uploaded_at)}</p>
                    </div>

                    <hr className="my-4 text-slate-300" />

                    <h1 className="text-center text-2xl font-bold text-[#083174]">Rs {payment.amount.toLocaleString()}</h1>

                    <hr className="my-4 text-slate-300" />

                    <div className="flex flex-col text-sm text-slate-600">
                        <div className="flex justify-between">
                            <p>From:</p>
                            <div className="flex flex-col items-end gap-2">
                                <p>{userName}</p>
                                <p>{userId}</p>
                            </div>
                        </div>
                        <hr className="my-4 text-slate-300" />
                        <div className="flex justify-between">
                            <p>To:</p>
                            <div className="flex flex-col items-end gap-2">
                                <p>Octo</p>
                                <p>via {via}</p>
                            </div>
                        </div>
                        <hr className="my-4 text-slate-300" />
                        <div className="flex justify-between">
                            <p>Month:</p>
                            <p>{monthLabel(payment.month)}</p>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

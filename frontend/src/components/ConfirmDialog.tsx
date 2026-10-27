"use client";

import { AnimatePresence, motion } from "framer-motion";

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    /** Red confirm button for destructive actions */
    danger?: boolean;
    onConfirm: () => void | Promise<void>;
    onCancel: () => void;
}

/** Small centered "are you sure?" popup. */
export default function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel,
    danger,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onCancel}
                >
                    <motion.div
                        role="alertdialog"
                        aria-modal="true"
                        aria-label={title}
                        initial={{ opacity: 0, scale: 0.9, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
                    >
                        <h2 className="text-lg font-bold text-[#083174]">{title}</h2>
                        <p className="mt-2 text-sm text-slate-500">{message}</p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={onCancel}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onConfirm}
                                autoFocus
                                className={`rounded-xl px-4 py-2 text-sm font-bold text-white ${
                                    danger ? "bg-red-600 hover:bg-red-700" : "bg-[#083174] hover:bg-[#0a3d8f]"
                                }`}
                            >
                                {confirmLabel}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

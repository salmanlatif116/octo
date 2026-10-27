"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import AuthImage from "@/components/AuthImage";
import type { Receipt } from "@/lib/api";
import { formatDateTime, monthLabel } from "@/lib/format";

interface ReceiptViewerProps {
    receipt: Receipt | null;
    /** Shown under the title, e.g. the user's name */
    subtitle?: string;
    onClose: () => void;
}

/** Full-size receipt image in a modal. */
export default function ReceiptViewer({ receipt, subtitle, onClose }: ReceiptViewerProps) {
    return (
        <AnimatePresence>
            {receipt && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative flex max-h-full w-full max-w-sm flex-col overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl"
                    >
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            className="absolute right-3 top-3 rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"
                        >
                            <X size={18} />
                        </button>
                        <h2 className="pr-8 text-base font-bold text-[#083174]">Receipt · {monthLabel(receipt.month)}</h2>
                        <p className="mb-3 text-xs text-slate-400">
                            {subtitle ? `${subtitle} · ` : ""}
                            Uploaded {formatDateTime(receipt.uploaded_at)}
                        </p>
                        <AuthImage
                            src={`/api/v1/receipts/${receipt.id}/file/`}
                            alt={`Receipt for ${monthLabel(receipt.month)}`}
                            className="min-h-48 w-full rounded-xl border border-slate-100 object-contain"
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

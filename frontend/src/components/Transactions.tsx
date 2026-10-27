"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Receipt as ReceiptIcon } from "lucide-react";
import AuthImage from "@/components/AuthImage";
import ReceiptViewer from "@/components/ReceiptViewer";
import { meApi, type Receipt } from "@/lib/api";
import { formatDateTime, monthLabel } from "@/lib/format";
import { useApi } from "@/lib/useApi";

export default function Transactions() {
    const { data: receipts, error } = useApi(() => meApi.receipts());
    const [viewing, setViewing] = useState<Receipt | null>(null);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            <main className="mx-auto md:max-w-lg w-full px-5 pt-26">
                <motion.h1
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-5 text-center text-lg font-extrabold text-[#083174]"
                >
                    Transaction History
                </motion.h1>

                {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
                {!error && receipts === null && <p className="text-center text-sm text-slate-400">Loading…</p>}
                {receipts?.length === 0 && <p className="text-center text-sm text-slate-400">No receipts uploaded yet.</p>}

                <motion.div
                    className="flex flex-col gap-3 pb-24"
                    variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } }}
                    initial="hidden"
                    animate="show"
                >
                    {receipts?.map((receipt) => (
                        <motion.button
                            key={receipt.id}
                            type="button"
                            onClick={() => setViewing(receipt)}
                            variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } }}
                            whileHover={{ y: -3, boxShadow: "0px 12px 30px rgba(0,0,0,.08)" }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-left shadow-sm"
                        >
                            <div className="flex items-center gap-3">
                                <AuthImage
                                    src={`/api/v1/receipts/${receipt.id}/file/`}
                                    alt=""
                                    className="size-12 rounded-lg border border-slate-100 object-cover"
                                />
                                <div>
                                    <h3 className="text-sm font-bold text-[#083174]">{monthLabel(receipt.month)}</h3>
                                    <p className="mt-1 text-xs text-slate-400">Uploaded {formatDateTime(receipt.uploaded_at)}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <p className="text-sm font-bold text-green-600">Rs {receipt.amount.toLocaleString()}</p>
                                <span className="flex items-center gap-1 text-xs text-blue-500">
                                    <ReceiptIcon size={12} /> View
                                </span>
                            </div>
                        </motion.button>
                    ))}
                </motion.div>
            </main>

            <ReceiptViewer receipt={viewing} onClose={() => setViewing(null)} />
        </motion.div>
    );
}

"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ImagePlus, Lock, Upload } from "lucide-react";
import WalletPaymentModal from "@/components/WalletPaymentModal";
import BankPaymentModal from "@/components/BankPayment";
import PaymentSuccess from "@/components/PaymentSuccess";
import jazzcashLogo from "@/assets/jazzcash-logo.png";
import bankLogo from "@/assets/bank-logo.png";
import { meApi, type PayRequest, type PaymentMethod, type Receipt } from "@/lib/api";
import { formatPKR, monthLabel } from "@/lib/format";
import { compressImage } from "@/lib/image";
import { useApi } from "@/lib/useApi";

export default function Home() {
    const { data: summary, error: loadError, reload } = useApi(() => meApi.summary());

    const [preview, setPreview] = useState<string | null>(null);
    const [blob, setBlob] = useState<Blob | null>(null);
    const [fileName, setFileName] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
    const [activeMethod, setActiveMethod] = useState<PaymentMethod | null>(null);
    const [paid, setPaid] = useState<Receipt | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const methodsRef = useRef<HTMLDivElement | null>(null);

    // Free the preview's memory when it is replaced or the screen closes.
    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    if (loadError && !summary) {
        return <p className="mx-auto mt-28 max-w-lg rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{loadError}</p>;
    }
    if (!summary) return <p className="mt-28 text-center text-sm text-slate-400">Loading…</p>;

    const unpaid = summary.unpaid_months;
    const outstanding = summary.outstanding_amount;
    const nextMonth = unpaid[0];
    const blocked = summary.status === 1;
    const active = summary.active;

    // Simulated payment: the server validates the details and records a receipt; no gateway is called.
    async function handlePay(body: PayRequest) {
        const receipt = await meApi.pay(body);
        setActiveMethod(null);
        setPaid(receipt);
        await reload();
    }

    async function handleFile(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        try {
            const small = await compressImage(file);
            setBlob(small);
            setPreview(URL.createObjectURL(small));
            setFileName(file.name);
            setMessage(null);
        } catch (err) {
            setMessage({ ok: false, text: err instanceof Error ? err.message : "Could not read the image." });
        }
    }

    async function handleSubmit() {
        if (!blob) return;
        setSubmitting(true);
        try {
            const receipt = await meApi.upload(blob, "receipt.jpg");
            setPreview(null);
            setBlob(null);
            setFileName("");
            setMessage({ ok: true, text: `Receipt for ${monthLabel(receipt.month)} submitted. Thank you!` });
            await reload();
        } catch (err) {
            setMessage({ ok: false, text: err instanceof Error ? err.message : "Upload failed. Please try again." });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <main className="mx-auto md:max-w-lg w-full px-5 pt-26">
                {/* Inactive banner */}
                {!active && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                    >
                        <Lock size={18} className="mt-0.5 shrink-0" />
                        <p>
                            {blocked ? (
                                <>
                                    Your account is <b>blocked</b>.{" "}
                                    {outstanding > 0
                                        ? "Pay or upload your receipt below. The admin will unblock you once it is received."
                                        : "Your payment is received. Waiting for the admin to unblock you."}
                                </>
                            ) : (
                                <>
                                    Your account is <b>inactive</b> until your outstanding payment is made. Pay or
                                    upload your receipt below.
                                </>
                            )}
                        </p>
                    </motion.div>
                )}

                {/* Profile Card */}
                <motion.section
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.15 }}
                    className="rounded-2xl bg-linear-to-r from-[#083174] to-[#0e4baf] p-5 text-white shadow-sm"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.35 }}
                                whileHover={{ scale: 1.08 }}
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/15 font-bold"
                            >
                                {summary.name[0]}
                            </motion.div>

                            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}>
                                <p className="font-semibold">{summary.name}</p>
                                <p className="text-xs text-white/60">ID · {summary.user_id}</p>
                            </motion.div>
                        </div>

                        <motion.span
                            key={String(active)}
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                                active
                                    ? "border border-green-700 bg-green-100 text-green-700"
                                    : "border border-red-700 bg-red-100 text-red-700"
                            }`}
                        >
                            ● {active ? "Active" : "Inactive"}
                        </motion.span>
                    </div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                        <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-white/60">Outstanding Amount</p>
                        <p className="text-3xl font-extrabold">Rs {formatPKR(outstanding)}</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 }}
                        className="mt-4 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs"
                    >
                        <span className="rounded-md bg-white/15 px-2 py-1 font-semibold">
                            {nextMonth ? `Due ${monthLabel(nextMonth)}` : "Paid"}
                        </span>
                        <span className="text-white/70">
                            {nextMonth
                                ? unpaid.length > 1
                                    ? `${unpaid.length} months unpaid: ${unpaid.map(monthLabel).join(", ")}`
                                    : "Upload your receipt to stay active"
                                : "All receipts received. Thank you!"}
                        </span>
                    </motion.div>
                </motion.section>

                {/* Payment */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400"
                >
                    Payment
                </motion.p>

                <motion.button
                    initial={{ opacity: 0, y: 25 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.75 }}
                    disabled={!nextMonth}
                    onClick={() => methodsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
                    className="mb-4 w-full rounded-xl bg-linear-to-r from-[#0e4baf] to-[#083174] py-3.5 font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {nextMonth ? `Pay Now · Rs ${formatPKR(summary.monthly_amount)}` : "Nothing to pay"}
                </motion.button>

                <div ref={methodsRef} className="grid grid-cols-2 gap-3">
                    {([
                        { key: "jazzcash", label: "JazzCash", logo: jazzcashLogo.src },
                        { key: "bank", label: "Bank Account", logo: bankLogo.src },
                    ] as const).map((m) => (
                        <motion.button
                            key={m.key}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.9 }}
                            whileHover={nextMonth ? { y: -6, scale: 1.03 } : undefined}
                            whileTap={nextMonth ? { scale: 0.97 } : undefined}
                            disabled={!nextMonth}
                            onClick={() => setActiveMethod(m.key)}
                            className="flex flex-col items-center gap-2 rounded-2xl bg-white py-4 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={m.logo} alt={`${m.label} logo`} className="w-10" />
                            <p className="text-xs font-medium text-slate-700">{m.label}</p>
                        </motion.button>
                    ))}
                </div>

                {/* Upload receipt */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400"
                >
                    Or upload your receipt
                </motion.p>

                {nextMonth ? (
                    <>
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.0 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm font-semibold text-slate-700 shadow-sm"
                        >
                            <ImagePlus size={18} />
                            <span>Upload receipt for {monthLabel(nextMonth)}</span>
                        </motion.button>

                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

                        {preview && (
                            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Selected Image</p>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={preview} alt="Selected receipt" className="h-48 w-full rounded-xl object-cover" />
                                <p className="mt-2 truncate text-sm font-medium text-slate-700">{fileName}</p>

                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#083174] py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    <Upload size={16} />
                                    {submitting ? "Submitting..." : "Submit Receipt"}
                                </motion.button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-4 text-sm text-slate-600 shadow-sm">
                        <CheckCircle2 size={18} className="text-green-500" />
                        Nothing to upload. You are all paid up.
                    </div>
                )}

                {message && (
                    <p
                        className={`mt-3 rounded-lg px-3 py-2 text-sm ${
                            message.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                        }`}
                    >
                        {message.text}
                    </p>
                )}
            </main>

            <AnimatePresence>
                {activeMethod === "jazzcash" && (
                    <WalletPaymentModal
                        amount={summary.monthly_amount}
                        onClose={() => setActiveMethod(null)}
                        onPay={(accountNumber) => handlePay({ method: "jazzcash", account_number: accountNumber })}
                    />
                )}
                {activeMethod === "bank" && (
                    <BankPaymentModal
                        amount={summary.monthly_amount}
                        onClose={() => setActiveMethod(null)}
                        onPay={({ cardNumber, expiry }) =>
                            handlePay({ method: "bank", card_number: cardNumber, card_expiry: expiry })
                        }
                    />
                )}
            </AnimatePresence>

            {paid && <PaymentSuccess payment={paid} userName={summary.name} userId={summary.user_id} onClose={() => setPaid(null)} />}
        </motion.div>
    );
}

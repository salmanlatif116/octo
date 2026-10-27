"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { ShieldCheck, X } from "lucide-react";
import { motion } from "framer-motion";
import jazzcashLogo from "@/assets/jazzcash-logo.png";
import { formatPKR } from "@/lib/format";

interface WalletPaymentModalProps {
    amount: number;
    onClose: () => void;
    onPay: (accountNumber: string) => Promise<void>;
}

const ACCOUNT_NUMBER_LENGTH = 11;

export default function WalletPaymentModal({ amount, onClose, onPay }: WalletPaymentModalProps) {
    const [number, setNumber] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    function handleChange(e: ChangeEvent<HTMLInputElement>) {
        setNumber(e.target.value.replace(/\D/g, "").slice(0, ACCOUNT_NUMBER_LENGTH));
        if (error) setError(null);
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (number.length !== ACCOUNT_NUMBER_LENGTH) {
            setError(`Account number must be exactly ${ACCOUNT_NUMBER_LENGTH} digits.`);
            return;
        }
        if (!number.startsWith("03")) {
            setError("Enter a valid mobile number starting with 03.");
            return;
        }
        setLoading(true);
        try {
            await onPay(number);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Payment failed. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed inset-0 z-50 flex items-end justify-center"
        >
            <div
                className="mx-auto w-full rounded-t-3xl bg-white pb-6 pt-2 shadow-2xl md:max-w-lg"
                role="dialog"
                aria-modal="true"
                aria-label="Pay with JazzCash"
            >
                <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-slate-200" />

                <div className="flex items-start justify-between px-5 pt-2">
                    <div className="flex items-center gap-3">
                        <img className="w-10" src={jazzcashLogo.src} alt="JazzCash Logo" />
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Pay Bill</h2>
                            <p className="text-sm text-slate-500">Review and confirm your payment</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="mx-5 mt-5 rounded-2xl bg-slate-50 py-4 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Payable</p>
                    <p className="mt-1 text-2xl font-extrabold text-slate-900">Rs {formatPKR(amount)}</p>
                </div>

                <div className="mt-5 px-5">
                    <label className="mb-1.5 block text-sm font-semibold text-slate-800">Paying via</label>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-slate-700">
                        <span className="font-medium">JazzCash</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mt-4 px-5">
                        <div className="mb-1.5 flex items-center justify-between">
                            <label className="block text-sm font-semibold text-slate-800">JazzCash account number</label>
                            <span className="text-xs text-slate-400">
                                {number.length}/{ACCOUNT_NUMBER_LENGTH}
                            </span>
                        </div>
                        <input
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={ACCOUNT_NUMBER_LENGTH}
                            placeholder="03XXXXXXXXX"
                            value={number}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-slate-200 px-3 py-3 text-slate-900 outline-none focus:border-[#083174] focus:ring-2 focus:ring-[#083174]/20"
                        />
                        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
                    </div>

                    <div className="mt-6 px-5">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#083174] to-[#0e4baf] py-3.5 font-bold text-white shadow-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            <ShieldCheck size={18} />
                            Pay Rs {formatPKR(amount)}
                        </button>
                        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400">
                            <ShieldCheck size={14} />
                            256-bit encrypted · Secured by Vantage Pay
                        </p>
                    </div>
                </form>
            </div>

            {loading && (
                <div className="absolute z-100 flex h-screen w-screen items-center justify-center backdrop-blur-[2px]">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-black border-t-transparent" />
                </div>
            )}
        </motion.div>
    );
}

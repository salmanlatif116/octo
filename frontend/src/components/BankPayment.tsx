"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { CreditCard, ShieldCheck, X } from "lucide-react";
import { motion } from "framer-motion";
import bankLogo from "@/assets/bank-logo.png";
import { formatPKR } from "@/lib/format";

interface BankPaymentModalProps {
    amount: number;
    onClose: () => void;
    onPay: (card: { cardNumber: string; expiry: string }) => Promise<void>;
}

interface FieldErrors {
    cardNumber?: string;
    expiry?: string;
    cvv?: string;
}

// "1234567812345678" -> "1234 5678 1234 5678"
function formatCardNumber(digits: string): string {
    return digits.match(/.{1,4}/g)?.join(" ") ?? digits;
}

// "1225" -> "12/25"
function formatExpiry(digits: string): string {
    return digits.length <= 2 ? digits : `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function isExpiryInFuture(mm: string, yy: string): boolean {
    const month = Number(mm);
    const year = 2000 + Number(yy);
    const now = new Date();
    if (year !== now.getFullYear()) return year > now.getFullYear();
    return month >= now.getMonth() + 1;
}

export default function BankPaymentModal({ amount, onClose, onPay }: BankPaymentModalProps) {
    const [cardNumber, setCardNumber] = useState("");
    const [expiry, setExpiry] = useState("");
    const [cvv, setCvv] = useState("");
    const [errors, setErrors] = useState<FieldErrors>({});
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    function clearError(field: keyof FieldErrors) {
        setErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    }

    function handleCardNumber(e: ChangeEvent<HTMLInputElement>) {
        setCardNumber(formatCardNumber(e.target.value.replace(/\D/g, "").slice(0, 16)));
        clearError("cardNumber");
    }

    function handleExpiry(e: ChangeEvent<HTMLInputElement>) {
        let digits = e.target.value.replace(/\D/g, "").slice(0, 4);
        // Clamp the month portion to 01–12 as soon as it's typed.
        if (digits.length >= 2) {
            const month = Math.min(Math.max(Number(digits.slice(0, 2)), 1), 12);
            digits = String(month).padStart(2, "0") + digits.slice(2);
        }
        setExpiry(formatExpiry(digits));
        clearError("expiry");
    }

    function handleCvv(e: ChangeEvent<HTMLInputElement>) {
        setCvv(e.target.value.replace(/\D/g, "").slice(0, 4));
        clearError("cvv");
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        const next: FieldErrors = {};

        if (cardNumber.replace(/\D/g, "").length !== 16) next.cardNumber = "Enter a valid 16-digit card number.";

        const match = expiry.match(/^(\d{2})\/(\d{2})$/);
        if (!match) next.expiry = "Enter expiry as MM/YY.";
        else if (!isExpiryInFuture(match[1], match[2])) next.expiry = "This card has expired.";

        if (cvv.length < 3) next.cvv = "Enter a valid 3 or 4-digit CVV.";

        setErrors(next);
        if (Object.keys(next).length > 0) return;

        setLoading(true);
        setFormError(null);
        try {
            await onPay({ cardNumber, expiry });
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Payment failed. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    const fieldClass = (error?: string) =>
        `w-full rounded-xl border px-3 py-3 text-slate-900 outline-none focus:ring-2 ${
            error
                ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                : "border-slate-200 focus:border-[#083174] focus:ring-[#083174]/20"
        }`;

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
                aria-label="Pay with Bank Account"
            >
                <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-slate-200" />

                <div className="flex items-start justify-between px-5 pt-2">
                    <div className="flex items-center gap-3">
                        <img className="w-10" src={bankLogo.src} alt="Bank Logo" />
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
                    <label className="mb-1.5 block text-sm font-semibold text-slate-800">Select payment method</label>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-slate-700">
                        <CreditCard size={18} />
                        <span className="font-medium">Debit / Credit Card</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mt-4 px-5">
                        <label className="mb-1.5 block text-sm font-semibold text-slate-800">Card number</label>
                        <input
                            inputMode="numeric"
                            maxLength={19}
                            placeholder="0000 0000 0000 0000"
                            value={cardNumber}
                            onChange={handleCardNumber}
                            className={fieldClass(errors.cardNumber)}
                        />
                        {errors.cardNumber && <p className="mt-1.5 text-xs text-red-600">{errors.cardNumber}</p>}
                    </div>

                    <div className="mt-4 flex gap-4 px-5">
                        <div className="flex-1">
                            <label className="mb-1.5 block text-sm font-semibold text-slate-800">Expiry</label>
                            <input
                                inputMode="numeric"
                                maxLength={5}
                                placeholder="MM/YY"
                                value={expiry}
                                onChange={handleExpiry}
                                className={fieldClass(errors.expiry)}
                            />
                            {errors.expiry && <p className="mt-1.5 text-xs text-red-600">{errors.expiry}</p>}
                        </div>
                        <div className="flex-1">
                            <label className="mb-1.5 block text-sm font-semibold text-slate-800">CVV</label>
                            <input
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="•••"
                                value={cvv}
                                onChange={handleCvv}
                                className={fieldClass(errors.cvv)}
                            />
                            {errors.cvv && <p className="mt-1.5 text-xs text-red-600">{errors.cvv}</p>}
                        </div>
                    </div>

                    <div className="mt-6 px-5">
                        {formError && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{formError}</p>}
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#083174] py-3.5 font-bold text-white shadow-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
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
                <div className="absolute z-100 flex h-screen w-screen items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-black border-t-transparent" />
                </div>
            )}
        </motion.div>
    );
}

import { useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { CreditCard, ShieldCheck, X } from "lucide-react";
import { motion } from "framer-motion";
import bank_logo from "../assets/bank-logo.png";

interface BankPaymentModalProps {
    amount: number;
    onClose: () => void;
    paidVia: () => void;
    onConfirm: () => void;
    receiverCardNumber: string;
    setReceiverCardNumber: (cardNumber: string) => void;
    receiverCardExpiry: string;
    setReceiverCardExpiry: (cardExpiry: string) => void;
    receiverCardCVV: string;
    setReceiverCardCVV: (cardCVV: string) => void;
}

interface FieldErrors {
    cardNumber?: string;
    expiry?: string;
    cvv?: string;
}

function formatPKR(amount: number): string {
    return new Intl.NumberFormat("en-PK").format(amount);
}

// "1234567812345678" -> "1234 5678 1234 5678"
function formatCardNumber(digits: string): string {
    return digits.match(/.{1,4}/g)?.join(" ") ?? digits;
}

// "1225" -> "12/25"
function formatExpiry(digits: string): string {
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function isExpiryInFuture(mm: string, yy: string): boolean {
    const month = Number(mm);
    const year = 2000 + Number(yy);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    if (year > currentYear) return true;
    if (year === currentYear) return month >= currentMonth;
    return false;
}

export default function BankPaymentModal({
    amount,
    onClose,
    paidVia,
    onConfirm,
    receiverCardNumber,
    setReceiverCardNumber,
    receiverCardExpiry,
    setReceiverCardExpiry,
    receiverCardCVV,
    setReceiverCardCVV,
}: BankPaymentModalProps) {
    const [errors, setErrors] = useState<FieldErrors>({});
    const [loading, setLoading] = useState<boolean>(false);

    function clearError(field: keyof FieldErrors) {
        setErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    }

    function handleCardNumberChange(e: ChangeEvent<HTMLInputElement>) {
        const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 16);
        setReceiverCardNumber(formatCardNumber(digitsOnly));
        clearError("cardNumber");
    }

    function handleExpiryChange(e: ChangeEvent<HTMLInputElement>) {
        let digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 4);

        // Clamp the month portion to 01–12 as soon as it's typed.
        if (digitsOnly.length >= 2) {
            const month = Math.min(Math.max(Number(digitsOnly.slice(0, 2)), 1), 12);
            digitsOnly = String(month).padStart(2, "0") + digitsOnly.slice(2);
        }

        setReceiverCardExpiry(formatExpiry(digitsOnly));
        clearError("expiry");
    }

    function handleCvvChange(e: ChangeEvent<HTMLInputElement>) {
        const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 4);
        setReceiverCardCVV(digitsOnly);
        clearError("cvv");
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();

        const nextErrors: FieldErrors = {};

        const cardDigits = receiverCardNumber.replace(/\D/g, "");
        if (cardDigits.length !== 16) {
            nextErrors.cardNumber = "Enter a valid 16-digit card number.";
        }

        const expiryMatch = receiverCardExpiry.match(/^(\d{2})\/(\d{2})$/);
        if (!expiryMatch) {
            nextErrors.expiry = "Enter expiry as MM/YY.";
        } else if (!isExpiryInFuture(expiryMatch[1], expiryMatch[2])) {
            nextErrors.expiry = "This card has expired.";
        }

        if (receiverCardCVV.length < 3) {
            nextErrors.cvv = "Enter a valid 3 or 4-digit CVV.";
        }

        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        setLoading(true)

        await setTimeout(() => {
            setLoading(false);
            onConfirm();
        }, 3000);

    }

    return (
        <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="fixed inset-0 z-50 flex items-end justify-center"
        >
            <div
                className="w-full md:max-w-lg mx-auto  rounded-t-3xl bg-white pb-6 pt-2 shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-label="Pay with Bank Account"
            >
                <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-slate-200" />

                <div className="flex items-start justify-between px-5 pt-2">
                    <div className="flex items-center gap-3">
                        <img className="w-10" src={bank_logo} alt="Bank Logo" />
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Pay Bill</h2>
                            <p className="text-sm text-slate-500">
                                Review and confirm your payment
                            </p>
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
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Total Payable
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-slate-900">
                        Rs {formatPKR(amount)}
                    </p>
                </div>

                <div className="mt-5 px-5">
                    <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                        Select payment method
                    </label>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-slate-700">
                        <CreditCard size={18} />
                        <span className="font-medium">Debit / Credit Card</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mt-4 px-5">
                        <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                            Card number
                        </label>
                        <input
                            inputMode="numeric"
                            pattern="[0-9\s]*"
                            maxLength={19}
                            placeholder="0000 0000 0000 0000"
                            value={receiverCardNumber}
                            onChange={handleCardNumberChange}
                            className={`w-full rounded-xl border px-3 py-3 text-slate-900 outline-none focus:ring-2 ${errors.cardNumber
                                    ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                                    : "border-slate-200 focus:border-[#083174] focus:ring-[#083174]/20"
                                }`}
                        />
                        {errors.cardNumber && (
                            <p className="mt-1.5 text-xs text-red-600">{errors.cardNumber}</p>
                        )}
                    </div>

                    <div className="mt-4 flex gap-4 px-5">
                        <div className="flex-1">
                            <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                                Expiry
                            </label>
                            <input
                                inputMode="numeric"
                                maxLength={5}
                                placeholder="MM/YY"
                                value={receiverCardExpiry}
                                onChange={handleExpiryChange}
                                className={`w-full rounded-xl border px-3 py-3 text-slate-900 outline-none focus:ring-2 ${errors.expiry
                                        ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                                        : "border-slate-200 focus:border-[#083174] focus:ring-[#083174]/20"
                                    }`}
                            />
                            {errors.expiry && (
                                <p className="mt-1.5 text-xs text-red-600">{errors.expiry}</p>
                            )}
                        </div>
                        <div className="flex-1">
                            <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                                CVV
                            </label>
                            <input
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={4}
                                placeholder="•••"
                                value={receiverCardCVV}
                                onChange={handleCvvChange}
                                className={`w-full rounded-xl border px-3 py-3 text-slate-900 outline-none focus:ring-2 ${errors.cvv
                                        ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                                        : "border-slate-200 focus:border-[#083174] focus:ring-[#083174]/20"
                                    }`}
                            />
                            {errors.cvv && (
                                <p className="mt-1.5 text-xs text-red-600">{errors.cvv}</p>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 px-5">
                        <button
                            type="submit"
                            onClick={paidVia}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#083174] py-3.5 font-bold text-white shadow-sm active:scale-[0.98]"
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

            {
                loading && (
                    <div className="absolute w-screen h-screen bg-black/30 backdrop-blur-sm flex items-center justify-center z-100">
                        <div className=" mx-auto border-4 border-black h-10 w-10 border-t-transparent rounded-full animate-spin duration-200">
                        </div>
                    </div>
                )
            }
        </motion.div>
    );
}
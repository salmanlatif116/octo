import { useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { ShieldCheck, X } from "lucide-react";
import { motion } from "framer-motion";
import jazzcash_logo from "../assets/jazzcash-logo.png";

interface WalletPaymentModalProps {
    amount: number;
    onClose: () => void;
    paidVia: () => void;
    onConfirm: (receiverAccountNumber: string) => void;
    receiverAccountNumber: string;
    setReceiverAccountNumber: (jazzcashNum: string) => void;
}

const ACCOUNT_NUMBER_LENGTH = 11;

function formatPKR(amount: number): string {
    return new Intl.NumberFormat("en-PK").format(amount);
}

export default function WalletPaymentModal({
    amount,
    onClose,
    paidVia,
    onConfirm,
    receiverAccountNumber,
    setReceiverAccountNumber,
}: WalletPaymentModalProps) {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    function handlereceiverAccountNumberChange(e: ChangeEvent<HTMLInputElement>) {
        // Strip anything that isn't a digit, then hard-cap at 11 digits —
        // this stops the user from ever typing past the limit in the first place.
        const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, ACCOUNT_NUMBER_LENGTH);
        setReceiverAccountNumber(digitsOnly);
        if (error) setError(null);
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();

        if (receiverAccountNumber.length !== ACCOUNT_NUMBER_LENGTH) {
            setError(`Account number must be exactly ${ACCOUNT_NUMBER_LENGTH} digits.`);
            return;
        }
        
        if (!receiverAccountNumber.startsWith("03")) {
            setError("Enter a valid mobile number starting with 03.");
            return;
        }

        setLoading(true)

        await setTimeout(() => {
            setLoading(false);
            onConfirm(receiverAccountNumber);
            setError(null);
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
                className="w-full md:max-w-lg mx-auto rounded-t-3xl bg-white pb-6 pt-2 shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-label={`Pay with JazzCash`}
            >
                <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-slate-200" />

                <div className="flex items-start justify-between px-5 pt-2">
                    <div className="flex items-center gap-3">
                        <img className="w-10" src={jazzcash_logo} alt="JazzCash Logo" />
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
                        Paying via
                    </label>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-slate-700">
                        <span className="font-medium">JazzCash</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mt-4 px-5">
                        <div className="mb-1.5 flex items-center justify-between">
                            <label className="block text-sm font-semibold text-slate-800">
                                JazzCash account number
                            </label>
                            <span className="text-xs text-slate-400">
                                {receiverAccountNumber.length}/{ACCOUNT_NUMBER_LENGTH}
                            </span>
                        </div>
                        <input
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={ACCOUNT_NUMBER_LENGTH}
                            placeholder="03XXXXXXXXX"
                            value={receiverAccountNumber}
                            onChange={handlereceiverAccountNumberChange}
                            className="w-full rounded-xl border border-slate-200 px-3 py-3 text-slate-900 outline-none focus:border-[#083174] focus:ring-2 focus:ring-[#083174]/20"
                        />
                        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}

                    </div>

                    <div className="mt-6 px-5">
                        <button
                            type="submit"
                            onClick={paidVia}
                            className={`flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#083174] to-[#0e4baf] py-3.5 font-bold text-white shadow-sm active:scale-[0.98] ${loading ? "opacity-70 cursor-not-allowed " : ""}`}
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
                    <div className="absolute w-screen h-screen backdrop-blur-[2px] flex items-center justify-center z-100">
                        <div className=" mx-auto border-4 border-black h-10 w-10 border-t-transparent rounded-full animate-spin duration-200">
                        </div>
                    </div>
                )
            }
        </motion.div>
    );
}
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Loader2, Mail, Share2, X } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import type { FormEvent } from "react";
import html2canvas from "html2canvas-pro";
import { useAuthStore } from "../store/authStore";


export type PaidVia = "jazzcash" | "bank";
type SubmitStatus = "idle" | "sending" | "success" | "error";

interface PaymentSuccessProps {
    open: boolean;
    amount: number;
    paidVia: PaidVia | null;
    dateLabel: string;
    defaultEmail?: string;
    receiverAccountNumber: string;
    receiverCardNumber: string;
    receiverCardExpiry: string;
    receiverCardCVV: string;
    onClose?: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function PaymentSuccess({
    open,
    amount,
    paidVia,
    dateLabel,
    defaultEmail = "",
    receiverAccountNumber,
    receiverCardNumber,
    receiverCardExpiry,
    receiverCardCVV,
    onClose,
}: PaymentSuccessProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [composing, setComposing] = useState(false);
    const [email, setEmail] = useState(defaultEmail);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [status, setStatus] = useState<SubmitStatus>("idle");
    const accessToken = useAuthStore((state) => state.accessToken);
    const user = useAuthStore((state) => state.user);

    useEffect(() => {
        if (status === "success" && onClose) {
            const timer = setTimeout(onClose, 7000);
            return () => clearTimeout(timer);
        }
    }, [status, onClose]);

    useEffect(() => {
        if (open && onClose) {
            const timer = setTimeout(onClose, 7000);
            return () => clearTimeout(timer);
        }
    }, [open, onClose]);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!cardRef.current || status === "sending") return;

        if (!email.trim() || !isValidEmail(email)) {
            setEmailError("Enter a valid email address.");
            return;
        }
        setEmailError(null);
        setStatus("sending");

        try {
            const canvas = await html2canvas(cardRef.current, {
                backgroundColor: "#ffffff",
                scale: 2,
            });

            const blob: Blob | null = await new Promise((resolve) =>
                canvas.toBlob(resolve, "image/png")
            );

            if (!blob) throw new Error("Could not generate receipt image.");

            const file = new File([blob], "octo-payment-receipt.png", {
                type: "image/png",
            });

            const formData = new FormData();
            formData.append("screenshot", file);
            formData.append("submitted_email", email.trim());

            const response = await fetch(
                `${API_BASE_URL}/api/v1/payments/submit/`,
                {
                    method: "POST",
                    headers: {
                        "ngrok-skip-browser-warning": "true",
                        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                    },
                    body: formData,
                }
            );

            if (!response.ok) {
                throw new Error("Upload failed");
            }

            setStatus("success");
        } catch (err) {
            console.error("Receipt submission failed:", err);
            setStatus("error");
        }
    }

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        ref={cardRef}
                        initial={{ opacity: 0, scale: 0.6, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 180, damping: 15 }}
                        className="relative w-80 mx-auto rounded-3xl bg-white px-8 py-12 shadow-2xl"
                    >
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                                aria-label="Close"
                            >
                                <X size={24} />
                            </button>
                        )}
                        <div className="flex flex-col items-center text-center">
                            <BadgeCheck
                                size={50}
                                className="mb-3 text-green-500"
                                strokeWidth={1.8}
                            />

                            <h2 className="text-xl font-bold text-[#083174]">
                                Payment Successful
                            </h2>

                            <p className="mt-3 text-slate-600 text-sm">
                                On {dateLabel}
                            </p>
                        </div>

                        <hr className="my-4 text-slate-300" />

                        <div>
                            <h1 className="text-2xl text-center font-bold text-[#083174]">
                                Rs {amount}
                            </h1>

                            <hr className="my-4 text-slate-300" />

                            {paidVia === "jazzcash" ? (
                                <div className="w-full flex flex-col items-center justify-center text-slate-600 text-sm">
                                    <div className="w-full flex justify-between">
                                        <p>From:</p>
                                        <div className="flex flex-col items-end justify-center gap-2">
                                            <p>{user?.name}</p>
                                            <p>Sender's Account Number</p>
                                        </div>
                                    </div>

                                    <hr className="my-4 w-full text-slate-300" />

                                    <div className="w-full flex justify-between">
                                        <p>To:</p>
                                        <div className="flex flex-col items-end justify-center gap-2">
                                            <p>Reciever's Name</p>
                                            <p>{receiverAccountNumber}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full flex flex-col items-center justify-center text-slate-600 text-sm">
                                    <div className="w-full flex justify-between">
                                        <p>From:</p>
                                        <div className="flex flex-col items-end justify-center gap-2">
                                            <p>Sender's Name</p>
                                            <p>Card Number</p>
                                        </div>
                                    </div>

                                    <hr className="my-4 w-full text-slate-300" />

                                    <div className="w-full flex justify-between">
                                        <p>To:</p>
                                        <div className="flex flex-col items-end justify-center gap-2">
                                            <p>Receiver's Name</p>
                                            <p>{receiverCardNumber}</p>
                                            <p>{receiverCardExpiry}</p>
                                            <p>{receiverCardCVV}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Share trigger / inline email composer */}
                    <div className="mt-6 w-80">
                        <AnimatePresence mode="wait">
                            {!composing && status !== "success" && (
                                <motion.div
                                    key="trigger"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-center justify-center"
                                >
                                    <button
                                        onClick={() => setComposing(true)}
                                        className="flex items-center justify-center gap-2 bg-linear-to-r from-[#083174] to-[#0e4baf] py-3 px-6 rounded-full text-md font-semibold text-white shadow-lg"
                                    >
                                        <Share2 size={18} /> Share
                                    </button>
                                </motion.div>
                            )}

                            {composing && status !== "success" && (
                                <motion.form
                                    key="composer"
                                    onSubmit={handleSubmit}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="rounded-2xl bg-white p-4 shadow-xl"
                                >
                                    <div className="mb-2 flex items-center justify-between">
                                        <label className="text-sm font-semibold text-slate-800">
                                            Email receipt to
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setComposing(false);
                                                setStatus("idle");
                                                setEmailError(null);
                                            }}
                                            aria-label="Cancel"
                                            className="text-slate-400 hover:text-slate-600"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>

                                    <div
                                        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 focus-within:ring-2 ${emailError
                                                ? "border-red-400 focus-within:border-red-400 focus-within:ring-red-400/20"
                                                : "border-slate-200 focus-within:border-[#083174] focus-within:ring-[#083174]/20"
                                            }`}
                                    >
                                        <Mail size={16} className="text-slate-400" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => {
                                                setEmail(e.target.value);
                                                if (emailError) setEmailError(null);
                                            }}
                                            placeholder="you@example.com"
                                            className="w-full text-sm outline-none"
                                        />
                                    </div>
                                    {emailError && (
                                        <p className="mt-1 text-xs text-red-600">{emailError}</p>
                                    )}
                                    {status === "error" && (
                                        <p className="mt-1 text-xs text-red-600">
                                            Couldn't send the receipt. Please try again.
                                        </p>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={status === "sending"}
                                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#083174] py-2.5 text-sm font-bold text-white disabled:opacity-70"
                                    >
                                        {status === "sending" ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Share2 size={16} />
                                        )}
                                        {status === "sending" ? "Sending…" : "Send"}
                                    </button>
                                </motion.form>
                            )}

                            {status === "success" && (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center justify-between gap-3 rounded-full bg-white px-5 py-3 text-sm font-semibold text-green-700 shadow-lg"
                                >
                                    <div className="flex items-center gap-2">
                                        <BadgeCheck size={18} className="text-green-500" />
                                        Receipt sent to {email}
                                    </div>
                                    {onClose && (
                                        <button
                                            onClick={onClose}
                                            className="text-green-600 hover:text-green-800"
                                            aria-label="Close"
                                        >
                                            <X size={18} />
                                        </button>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
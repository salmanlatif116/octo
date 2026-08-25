import { useRef, useState, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import WalletPaymentModal from "./WalletPaymentModal";
import BankPaymentModal from "./BankPayment";
import jazzcash_logo from "../assets/jazzcash-logo.png";
import bank_logo from "../assets/bank-logo.png";
import { useAuthStore } from "../store/authStore";
import PaymentSuccess from "./PaymentSuccess";


type PaymentMethodId = "jazzcash" | "bank";
type AccountStatus = "Active" | "Inactive";

interface HomeProps {
    userName?: string;
    userId?: string;
    accountStatus?: AccountStatus;
    outstandingAmount?: number;
    dueDate?: string;
}

function formatPKR(amount: number): string {
    return new Intl.NumberFormat("en-PK").format(amount);
}

export function formatDate(dateString?: string): string {
    if (!dateString) return "";

    const date = new Date(dateString);

    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export default function Home({
    userId = "S10500009",
    accountStatus = "Inactive",
    outstandingAmount = 4500,
}: HomeProps) {
    const [activeMethod, setActiveMethod] = useState<PaymentMethodId | null>(null);
    const [paid, setPaid] = useState(false);
    const [status, setStatus] = useState<AccountStatus>(accountStatus);
    const [paidVia, setPaidVia] = useState<PaymentMethodId | null>(null)
    const [receiverAccountNumber, setReceiverAccountNumber] = useState("");
    const [receiverCardNumber, setReceiverCardNumber] = useState("");
    const [receiverCardExpiry, setReceiverCardExpiry] = useState("");
    const [receiverCardCVV, setReceiverCardCVV] = useState("");
    const [selectedImageName, setSelectedImageName] = useState("");
    const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const user = useAuthStore((state) => state.user);
    const accessToken = useAuthStore((state) => state.accessToken);
    const todayDate = new Date();
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    function handlePaymentConfirmed() {
        setActiveMethod(null);
        setPaid(true);
        setStatus("Active");
    }

    function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        if (!file) return;

        setSelectedFile(file);
        setSelectedImageName(file.name);
        setSelectedImagePreview(URL.createObjectURL(file));
        setSubmitMessage(null);
    }

    async function handleSubmitProof() {
        if (!selectedFile) {
            setSubmitMessage("Please select an image first.");
            return;
        }

        if (!user?.email) {
            setSubmitMessage("No email found for the current user.");
            return;
        }

        setSubmitting(true);
        setSubmitMessage(null);

        try {
            const formData = new FormData();
            formData.append("screenshot", selectedFile);
            formData.append("submitted_email", user.email);

            const response = await fetch(`${API_BASE_URL}/api/v1/payments/submit/`, {
                method: "POST",
                headers: {
                    "ngrok-skip-browser-warning": "true",
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Upload failed with status ${response.status}`);
            }

            setSubmitMessage("Payment proof submitted successfully.");
        }
        catch (error) {
            console.error("Payment proof submission failed:", error);
            setSubmitMessage("Failed to submit payment proof. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >

            <main className="mx-auto md:max-w-lg w-full  px-5 pt-26">
                {/* Profile Card */}
                <motion.section
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                        duration: 0.6,
                        delay: 0.15,
                    }}
                    className="rounded-2xl  bg-linear-to-r from-[#083174] to-[#0e4baf] p-5 text-white shadow-sm"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{
                                    delay: 0.35,
                                }}
                                whileHover={{ scale: 1.08 }}
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/15 font-bold"
                            >
                                {user?.name[0]}
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.45 }}
                            >
                                <p className="font-semibold">{user?.name}</p>
                                <p className="text-xs text-white/60">
                                    ID · {userId}
                                </p>
                            </motion.div>
                        </div>

                        <motion.span
                            key={status}
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                                delay: 0.5,
                            }}
                            className={`rounded-full px-3 py-1 text-xs font-medium ${status === "Inactive"
                                ? "border border-red-700 bg-red-100 text-red-700"
                                : "border border-green-700 bg-green-100 text-green-700"
                                }`}
                        >
                            ● {status}
                        </motion.span>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-white/60">
                            Outstanding Amount
                        </p>

                        <motion.p
                            className="text-3xl font-extrabold"
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            transition={{
                                delay: 0.4,
                            }}
                        >
                            Rs {formatPKR(outstandingAmount)}
                        </motion.p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 }}
                        className="mt-4 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs"
                    >
                        <span className="rounded-md bg-white/15 px-2 py-1 font-semibold">
                            Due {formatDate(user?.dueDate)}
                        </span>

                        <span className="text-white/70">
                            Pay before due date to avoid service interruption
                        </span>
                    </motion.div>
                </motion.section>

                {/* Payment Heading */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400"
                >
                    Payment
                </motion.p>

                {/* Pay Button */}
                <motion.button
                    initial={{ opacity: 0, y: 25 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.75 }}
                    className="mb-4 w-full rounded-xl bg-linear-to-r from-[#0e4baf] to-[#083174] py-3.5 font-bold text-white shadow-sm"
                >
                    Pay Now · Rs {formatPKR(outstandingAmount)}
                </motion.button>

                {/* Payment Methods */}
                <motion.div
                    className="grid grid-cols-2 gap-3"
                    variants={{
                        hidden: {},
                        show: {
                            transition: {
                                staggerChildren: 0.15,
                                delayChildren: 0.9,
                            },
                        },
                    }}
                    initial="hidden"
                    animate="show"
                >
                    <motion.button
                        variants={{
                            hidden: {
                                opacity: 0,
                                y: 30,
                            },
                            show: {
                                opacity: 1,
                                y: 0,
                            },
                        }}
                        whileHover={{
                            y: -6,
                            scale: 1.03,
                        }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setActiveMethod("jazzcash")}
                        className="flex flex-col items-center gap-2 rounded-2xl bg-white py-4 shadow-sm"
                    >
                        <motion.img
                            src={jazzcash_logo}
                            alt="jazzcash-logo"
                            className="w-10"
                        />

                        <p className="text-xs font-medium text-slate-700">
                            JazzCash
                        </p>
                    </motion.button>

                    <motion.button
                        variants={{
                            hidden: {
                                opacity: 0,
                                y: 30,
                            },
                            show: {
                                opacity: 1,
                                y: 0,
                            },
                        }}
                        whileHover={{
                            y: -6,
                            scale: 1.03,
                        }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setActiveMethod("bank")}
                        className="flex flex-col items-center gap-2 rounded-2xl bg-white py-4 shadow-sm"
                    >
                        <motion.img
                            src={bank_logo}
                            alt="bank-logo"
                            className="w-10"
                            whileHover={{
                                rotate: [0, 8, -8, 8, 0],
                                transition: {
                                    duration: 0.5,
                                },
                            }}
                        />

                        <p className="text-xs font-medium text-slate-700">
                            Bank Account
                        </p>
                    </motion.button>
                </motion.div>

                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.0 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
                >
                    <span>📷</span>
                    <span>Upload Payment Proof</span>
                </motion.button>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                />

                {selectedImagePreview && (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Selected Image
                        </p>
                        <img
                            src={selectedImagePreview}
                            alt="Selected payment proof"
                            className="h-40 w-full rounded-xl object-cover"
                        />
                        <p className="mt-2 text-sm font-medium text-slate-700">
                            {selectedImageName}
                        </p>

                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.97 }}
                            type="button"
                            onClick={handleSubmitProof}
                            disabled={submitting}
                            className="mt-3 w-full rounded-xl bg-[#083174] py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {submitting ? "Submitting..." : "Submit Payment Proof"}
                        </motion.button>

                        {submitMessage && (
                            <p className={`mt-2 text-sm ${submitMessage.includes("success") ? "text-green-600" : "text-red-600"}`}>
                                {submitMessage}
                            </p>
                        )}
                    </div>
                )}
            </main>

            <AnimatePresence>
                {activeMethod === "jazzcash" && (
                    <WalletPaymentModal
                        amount={outstandingAmount}
                        onClose={() => setActiveMethod(null)}
                        paidVia={() => setPaidVia("jazzcash")}
                        onConfirm={handlePaymentConfirmed}
                        receiverAccountNumber={receiverAccountNumber}
                        setReceiverAccountNumber= {setReceiverAccountNumber}
                    />
                )}

                {activeMethod === "bank" && (
                    <BankPaymentModal
                        amount={outstandingAmount}
                        onClose={() => setActiveMethod(null)}
                        paidVia={() => setPaidVia("bank")}
                        onConfirm={handlePaymentConfirmed}
                        receiverCardNumber= {receiverCardNumber}
                        setReceiverCardNumber={setReceiverCardNumber}
                        receiverCardExpiry= {receiverCardExpiry}
                        setReceiverCardExpiry={setReceiverCardExpiry}
                        receiverCardCVV={receiverCardCVV}
                        setReceiverCardCVV={setReceiverCardCVV}
                    />
                )}
            </AnimatePresence>

            {
                paid && (
                    <PaymentSuccess
                        open={true}
                        amount={outstandingAmount}
                        paidVia={paidVia}
                        dateLabel={formatDate(todayDate.toString())}
                        receiverAccountNumber={receiverAccountNumber}
                        receiverCardNumber={receiverCardNumber}
                        receiverCardExpiry={receiverCardCVV}
                        receiverCardCVV={receiverCardCVV}
                        onClose={() => setPaid(false)}
                    />
                )
            }
        </motion.div>
    );
}
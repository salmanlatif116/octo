import { Download, Send } from "lucide-react";
import { motion } from "framer-motion";

interface TransactionCardProps {
    title: string;
    date: string;
    amount: number;
}

function TransactionCard({
    title,
    date,
    amount,
}: TransactionCardProps) {
    return (
        <motion.div
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
                y: -4,
                scale: 1.02,
                boxShadow: "0px 12px 30px rgba(0,0,0,.08)",
            }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm"
        >
            {/* Left */}
            <div className="flex items-center gap-3">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                        type: "spring",
                        stiffness: 250,
                    }}
                    whileHover={{
                        rotate: [0, -10, 10, -10, 0],
                    }}
                    className="flex size-10 items-center justify-center rounded-full bg-green-100"
                >
                    <Send
                        size={18}
                        className="text-green-600"
                        strokeWidth={2}
                    />
                </motion.div>

                <div>
                    <h3 className="text-sm font-bold text-[#083174]">
                        {title}
                    </h3>

                    <p className="mt-1 text-xs text-slate-400">
                        {date}
                    </p>
                </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-sm font-bold text-green-600"
                >
                    Rs {amount.toLocaleString()}
                </motion.p>

                <motion.button
                    whileHover={{
                        scale: 1.12,
                        rotate: -15,
                    }}
                    whileTap={{ scale: 0.9 }}
                    className="flex size-10 items-center justify-center rounded-full border border-blue-200 text-blue-500 hover:bg-blue-50"
                >
                    <Download size={18} />
                </motion.button>
            </div>
        </motion.div>
    );
}

export default function Transactions() {
    const transactions = [
        {
            title: "Online Payment",
            date: "08 Feb 2024 · 02:14 PM",
            amount: 5000,
        },
        {
            title: "Fund Transfer",
            date: "08 Feb 2024 · 02:14 PM",
            amount: 5000,
        },
        {
            title: "Online Payment",
            date: "08 Feb 2024 · 02:14 PM",
            amount: 5000,
        },
        {
            title: "Online Payment",
            date: "08 Feb 2024 · 02:14 PM",
            amount: 5000,
        },
        {
            title: "Fund Transfer",
            date: "08 Feb 2024 · 02:14 PM",
            amount: 5000,
        },
        {
            title: "Online Payment",
            date: "08 Feb 2024 · 02:14 PM",
            amount: 5000,
        },
        {
            title: "Fund Transfer",
            date: "08 Feb 2024 · 02:14 PM",
            amount: 5000,
        },
        {
            title: "Online Payment",
            date: "08 Feb 2024 · 02:14 PM",
            amount: 5000,
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
        >
            <main className="mx-auto md:max-w-lg w-full px-5 pt-26">
                <motion.h1
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                        duration: 0.5,
                    }}
                    className="mb-5 text-center text-lg font-extrabold text-[#083174]"
                >
                    Transaction History
                </motion.h1>

                <motion.div
                    className="flex flex-col gap-3 pb-24"
                    variants={{
                        hidden: {},
                        show: {
                            transition: {
                                staggerChildren: 0.1,
                                delayChildren: 0.15,
                            },
                        },
                    }}
                    initial="hidden"
                    animate="show"
                >
                    {transactions.map((transaction, index) => (
                        <TransactionCard
                            key={index}
                            {...transaction}
                        />
                    ))}
                </motion.div>
            </main>
        </motion.div>
    );
}
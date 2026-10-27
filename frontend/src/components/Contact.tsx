"use client";

import { useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, MessageSquare, Send, User, CheckCircle2 } from "lucide-react";
import { contactApi } from "@/lib/api";

interface FormValues {
    name: string;
    email: string;
    subject: string;
    message: string;
}

interface FieldErrors {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
}

const EMPTY_FORM: FormValues = { name: "", email: "", subject: "", message: "" };

function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const fieldVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
};

export default function Contact() {
    const [values, setValues] = useState<FormValues>(EMPTY_FORM);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [submitting, setSubmitting] = useState(false);
    const [sent, setSent] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    function clearError(field: keyof FieldErrors) {
        setErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    }

    function handleChange(field: keyof FormValues) {
        return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setValues((prev) => ({ ...prev, [field]: e.target.value }));
            clearError(field);
        };
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (submitting) return;

        const nextErrors: FieldErrors = {};
        if (!values.name.trim()) nextErrors.name = "Enter your name.";
        if (!values.email.trim()) {
            nextErrors.email = "Enter your email.";
        } else if (!isValidEmail(values.email)) {
            nextErrors.email = "Enter a valid email address.";
        }
        if (!values.subject.trim()) nextErrors.subject = "Enter a subject.";
        if (!values.message.trim()) {
            nextErrors.message = "Enter a message.";
        } else if (values.message.trim().length < 10) {
            nextErrors.message = "Message should be at least 10 characters.";
        }

        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        setSubmitting(true);
        setSubmitError(null);
        try {
            await contactApi.send({
                name: values.name.trim(),
                email: values.email.trim(),
                subject: values.subject.trim(),
                message: values.message.trim(),
            });
            setSent(true);
            setValues(EMPTY_FORM);
            setTimeout(() => setSent(false), 3000);
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-sm px-5 pt-26 pb-24"
        >
            <motion.h1
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="mb-1 text-lg font-extrabold text-[#083174]"
            >
                Contact Us
            </motion.h1>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="mb-5 text-sm text-slate-500"
            >
                Have a question about your bill or account? Send us a message
                and we'll get back to you.
            </motion.p>

            <motion.form
                onSubmit={handleSubmit}
                className="space-y-4"
                variants={{
                    hidden: {},
                    show: {
                        transition: {
                            staggerChildren: 0.1,
                            delayChildren: 0.25,
                        },
                    },
                }}
                initial="hidden"
                animate="show"
            >
                <motion.div variants={fieldVariants}>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                        Name
                    </label>
                    <div
                        className={`flex items-center gap-2 rounded-xl border px-3 py-3 transition-colors focus-within:ring-2 ${
                            errors.name
                                ? "border-red-400 focus-within:border-red-400 focus-within:ring-red-400/20"
                                : "border-slate-200 focus-within:border-[#083174] focus-within:ring-[#083174]/20"
                        }`}
                    >
                        <User size={18} className="text-slate-400" />
                        <input
                            value={values.name}
                            onChange={handleChange("name")}
                            placeholder="Ahmed Khan"
                            className="w-full outline-none"
                        />
                    </div>
                    <AnimatePresence>
                        {errors.name && (
                            <motion.p
                                initial={{ opacity: 0, y: -4, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: "auto" }}
                                exit={{ opacity: 0, y: -4, height: 0 }}
                                className="mt-1.5 text-xs text-red-600"
                            >
                                {errors.name}
                            </motion.p>
                        )}
                    </AnimatePresence>
                </motion.div>

                <motion.div variants={fieldVariants}>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                        Email
                    </label>
                    <div
                        className={`flex items-center gap-2 rounded-xl border px-3 py-3 transition-colors focus-within:ring-2 ${
                            errors.email
                                ? "border-red-400 focus-within:border-red-400 focus-within:ring-red-400/20"
                                : "border-slate-200 focus-within:border-[#083174] focus-within:ring-[#083174]/20"
                        }`}
                    >
                        <Mail size={18} className="text-slate-400" />
                        <input
                            type="email"
                            value={values.email}
                            onChange={handleChange("email")}
                            placeholder="you@example.com"
                            className="w-full outline-none"
                        />
                    </div>
                    <AnimatePresence>
                        {errors.email && (
                            <motion.p
                                initial={{ opacity: 0, y: -4, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: "auto" }}
                                exit={{ opacity: 0, y: -4, height: 0 }}
                                className="mt-1.5 text-xs text-red-600"
                            >
                                {errors.email}
                            </motion.p>
                        )}
                    </AnimatePresence>
                </motion.div>

                <motion.div variants={fieldVariants}>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                        Subject
                    </label>
                    <div
                        className={`flex items-center gap-2 rounded-xl border px-3 py-3 transition-colors focus-within:ring-2 ${
                            errors.subject
                                ? "border-red-400 focus-within:border-red-400 focus-within:ring-red-400/20"
                                : "border-slate-200 focus-within:border-[#083174] focus-within:ring-[#083174]/20"
                        }`}
                    >
                        <MessageSquare size={18} className="text-slate-400" />
                        <input
                            value={values.subject}
                            onChange={handleChange("subject")}
                            placeholder="Billing question"
                            className="w-full outline-none"
                        />
                    </div>
                    <AnimatePresence>
                        {errors.subject && (
                            <motion.p
                                initial={{ opacity: 0, y: -4, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: "auto" }}
                                exit={{ opacity: 0, y: -4, height: 0 }}
                                className="mt-1.5 text-xs text-red-600"
                            >
                                {errors.subject}
                            </motion.p>
                        )}
                    </AnimatePresence>
                </motion.div>

                <motion.div variants={fieldVariants}>
                    <div className="mb-1.5 flex items-center justify-between">
                        <label className="block text-sm font-semibold text-slate-800">
                            Message
                        </label>
                        <span className="text-xs text-slate-400">
                            {values.message.length}/500
                        </span>
                    </div>
                    <textarea
                        value={values.message}
                        onChange={handleChange("message")}
                        maxLength={500}
                        rows={5}
                        placeholder="Tell us how we can help..."
                        className={`w-full resize-none rounded-xl border px-3 py-3 outline-none transition-colors focus:ring-2 ${
                            errors.message
                                ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                                : "border-slate-200 focus:border-[#083174] focus:ring-[#083174]/20"
                        }`}
                    />
                    <AnimatePresence>
                        {errors.message && (
                            <motion.p
                                initial={{ opacity: 0, y: -4, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: "auto" }}
                                exit={{ opacity: 0, y: -4, height: 0 }}
                                className="mt-1.5 text-xs text-red-600"
                            >
                                {errors.message}
                            </motion.p>
                        )}
                    </AnimatePresence>
                </motion.div>

                {submitError && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{submitError}</p>
                )}

                <motion.button
                    variants={fieldVariants}
                    type="submit"
                    disabled={submitting}
                    whileHover={!submitting ? { scale: 1.02 } : undefined}
                    whileTap={!submitting ? { scale: 0.97 } : undefined}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#083174] to-[#0e4baf] py-3.5 font-bold text-white shadow-sm ${
                        submitting ? "cursor-not-allowed opacity-70" : ""
                    }`}
                >
                    {submitting ? (
                        <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                        <>
                            <Send size={18} />
                            Send Message
                        </>
                    )}
                </motion.button>
            </motion.form>

            <AnimatePresence>
                {sent && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        className="fixed inset-x-0 bottom-24 z-50 mx-auto flex w-fit items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#083174] shadow-xl"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
                        >
                            <CheckCircle2 size={18} className="text-green-500" />
                        </motion.div>
                        Message sent — we'll be in touch soon.
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.main>
    );
}
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronRight, Eye, Search, UserPlus, X, XCircle } from "lucide-react";
import ReceiptViewer from "@/components/ReceiptViewer";
import {
    BlockButton,
    MonthSelect,
    StatusBadge,
    TableCard,
    td,
    th,
    useMonthOptions,
} from "@/components/admin/adminShared";
import { adminApi, type Receipt } from "@/lib/api";
import { monthLabel } from "@/lib/format";
import { useApi } from "@/lib/useApi";

function AddUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [userId, setUserId] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [amount, setAmount] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!userId.trim() || !name.trim() || password.length < 4) {
            setError("Fill in User ID, name and a password of at least 4 characters.");
            return;
        }
        setSaving(true);
        try {
            await adminApi.createUser({
                user_id: userId.trim(),
                name: name.trim(),
                password,
                monthly_amount: amount ? Number(amount) : undefined,
            });
            onCreated();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not create the user.");
        } finally {
            setSaving(false);
        }
    }

    const input =
        "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#083174] focus:ring-2 focus:ring-[#083174]/20";

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.form
                onSubmit={handleSubmit}
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-md space-y-3 rounded-2xl bg-white p-6 shadow-2xl"
            >
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute right-3 top-3 rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"
                >
                    <X size={18} />
                </button>
                <h2 className="text-lg font-bold text-[#083174]">Add user</h2>
                <p className="text-sm text-slate-500">Create the login you will hand to your customer.</p>
                {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
                <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">User ID</label>
                    <input className={input} value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="e.g. S10500009" autoCapitalize="none" />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Name</label>
                    <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Password</label>
                    <input className={input} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password for this user" />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Monthly amount (Rs)</label>
                    <input
                        className={input}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                        inputMode="numeric"
                        placeholder="Leave empty for the default"
                    />
                </div>
                <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-xl bg-[#083174] py-2.5 text-sm font-bold text-white disabled:opacity-70"
                >
                    {saving ? "Creating…" : "Create user"}
                </button>
            </motion.form>
        </motion.div>
    );
}

export default function AdminUsers() {
    const months = useMonthOptions();
    const [picked, setPicked] = useState<string | null>(null);
    const month = picked ?? months[0] ?? null;

    const { data: users, error, reload } = useApi(() => (month ? adminApi.users(month) : Promise.resolve(null)), [month]);

    const [query, setQuery] = useState("");
    const [adding, setAdding] = useState(false);
    const [viewing, setViewing] = useState<Receipt | null>(null);

    if (!month) return <p className="text-sm text-slate-400">Loading…</p>;

    const all = users ?? [];
    const blockedCount = all.filter((u) => u.status === 1).length;
    const missingCount = all.filter((u) => u.owes && !u.receipt).length;

    const q = query.trim().toLowerCase();
    const shown = all.filter((u) => !q || u.user_id.toLowerCase().includes(q) || u.name.toLowerCase().includes(q));

    const stats = [
        { label: "Total users", value: all.length, color: "text-[#083174]" },
        { label: "Active (status 0)", value: all.length - blockedCount, color: "text-green-600" },
        { label: "Blocked (status 1)", value: blockedCount, color: "text-red-600" },
        { label: `No receipt · ${monthLabel(month)}`, value: missingCount, color: "text-amber-600" },
    ];

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold text-[#083174]">Users</h1>
                    <p className="text-sm text-slate-500">Block anyone who has not uploaded this month&apos;s receipt.</p>
                </div>
                <button
                    onClick={() => setAdding(true)}
                    className="flex items-center gap-2 rounded-xl bg-[#083174] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#0a3d8f]"
                >
                    <UserPlus size={16} /> Add user
                </button>
            </div>

            {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {stats.map((s, i) => (
                    <motion.div
                        key={s.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                        <p className="text-xs font-medium text-slate-500">{s.label}</p>
                        <p className={`mt-1 text-3xl font-extrabold ${s.color}`}>{s.value}</p>
                    </motion.div>
                ))}
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-3">
                <div className="flex min-w-48 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <Search size={16} className="text-slate-400" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by name or User ID"
                        className="w-full text-sm outline-none"
                    />
                </div>
                <MonthSelect value={month} onChange={setPicked} options={months} />
            </div>

            <TableCard>
                <thead>
                    <tr>
                        <th className={th}>User ID</th>
                        <th className={th}>Name</th>
                        <th className={th}>Monthly</th>
                        <th className={th}>Receipt · {monthLabel(month)}</th>
                        <th className={th}>Status</th>
                        <th className={`${th} text-right`}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users === null && (
                        <tr>
                            <td colSpan={6} className={`${td} py-8 text-center text-slate-400`}>
                                Loading…
                            </td>
                        </tr>
                    )}
                    {users !== null && shown.length === 0 && (
                        <tr>
                            <td colSpan={6} className={`${td} py-8 text-center text-slate-400`}>
                                No users found.
                            </td>
                        </tr>
                    )}
                    {shown.map((u) => (
                        <tr key={u.user_id} className="hover:bg-slate-50/60">
                            <td className={`${td} font-mono text-xs font-semibold text-[#083174]`}>{u.user_id}</td>
                            <td className={`${td} font-medium text-slate-700`}>{u.name}</td>
                            <td className={`${td} text-slate-500`}>Rs {u.monthly_amount.toLocaleString()}</td>
                            <td className={td}>
                                {!u.owes ? (
                                    <span className="text-xs text-slate-400">Not started</span>
                                ) : u.receipt ? (
                                    <button
                                        onClick={() =>
                                            setViewing({
                                                id: u.receipt!.id,
                                                month,
                                                amount: u.monthly_amount,
                                                method: u.receipt!.method,
                                                reference: null,
                                                uploaded_at: u.receipt!.uploaded_at,
                                                user_id: u.user_id,
                                                user_name: u.name,
                                            })
                                        }
                                        className="flex items-center gap-1.5 text-xs font-semibold text-green-600 hover:underline"
                                    >
                                        <CheckCircle2 size={14} /> Uploaded <Eye size={13} />
                                    </button>
                                ) : (
                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
                                        <XCircle size={14} /> Not uploaded
                                    </span>
                                )}
                            </td>
                            <td className={td}>
                                <StatusBadge blocked={u.status} />
                            </td>
                            <td className={td}>
                                <div className="flex items-center justify-end gap-3">
                                    <BlockButton
                                        blocked={u.status}
                                        userName={u.name}
                                        onToggle={async () => {
                                            await adminApi.setStatus(u.user_id, u.status ? 0 : 1);
                                            await reload();
                                        }}
                                    />
                                    <Link
                                        href={`/admin/users/${encodeURIComponent(u.user_id)}/`}
                                        prefetch={false}
                                        className="flex items-center text-xs font-semibold text-blue-600 hover:underline"
                                    >
                                        Details <ChevronRight size={14} />
                                    </Link>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </TableCard>

            <AnimatePresence>
                {adding && <AddUserModal onClose={() => setAdding(false)} onCreated={reload} />}
            </AnimatePresence>

            <ReceiptViewer receipt={viewing} subtitle={viewing?.user_name ?? undefined} onClose={() => setViewing(null)} />
        </div>
    );
}

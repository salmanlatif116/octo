"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Eye, KeyRound, XCircle } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import ReceiptViewer from "@/components/ReceiptViewer";
import { BlockButton, StatusBadge, TableCard, td, th } from "@/components/admin/adminShared";
import { adminApi, type Receipt } from "@/lib/api";
import { formatDateTime, monthLabel } from "@/lib/format";
import { useApi } from "@/lib/useApi";

/** The user id is the last part of the address: /admin/users/<id>/ */
function useUserIdFromPath(): string | null {
    const [id, setId] = useState<string | null>(null);
    useEffect(() => {
        const parts = window.location.pathname.split("/").filter(Boolean);
        setId(parts[0] === "admin" && parts[1] === "users" && parts[2] ? decodeURIComponent(parts[2]) : null);
    }, []);
    return id;
}

function ResetPassword({ userId, onClose }: { userId: string; onClose: () => void }) {
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    async function submit(e: FormEvent) {
        e.preventDefault();
        if (password.length < 4) {
            setError("Password needs at least 4 characters.");
            return;
        }
        try {
            await adminApi.resetPassword(userId, password);
            setDone(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not reset the password.");
        }
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
            <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-6 shadow-2xl">
                <h2 className="text-lg font-bold text-[#083174]">Reset password</h2>
                {done ? (
                    <>
                        <p className="text-sm text-green-700">Password changed. Give the new password to {userId}.</p>
                        <button type="button" onClick={onClose} className="w-full rounded-xl bg-[#083174] py-2.5 text-sm font-bold text-white">
                            Done
                        </button>
                    </>
                ) : (
                    <>
                        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
                        <input
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="New password"
                            autoFocus
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#083174] focus:ring-2 focus:ring-[#083174]/20"
                        />
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">
                                Cancel
                            </button>
                            <button type="submit" className="rounded-xl bg-[#083174] px-4 py-2 text-sm font-bold text-white">
                                Save
                            </button>
                        </div>
                    </>
                )}
            </form>
        </div>
    );
}

/** One user: profile, status, and a month-by-month receipt table. */
export default function AdminUserDetail() {
    const userId = useUserIdFromPath();
    const { data: user, error, reload } = useApi(() => (userId ? adminApi.user(userId) : Promise.resolve(null)), [userId]);
    const [viewing, setViewing] = useState<Receipt | null>(null);
    const [resetting, setResetting] = useState(false);

    const back = (
        <Link href="/admin/" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline">
            <ArrowLeft size={16} /> Back to users
        </Link>
    );

    if (error) {
        return (
            <div>
                {back}
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            </div>
        );
    }
    if (!user) {
        return (
            <div>
                {back}
                <p className="text-sm text-slate-400">Loading…</p>
            </div>
        );
    }

    const paidCount = user.months.filter((m) => m.receipt).length;

    return (
        <div>
            {back}

            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex size-12 items-center justify-center rounded-full bg-[#083174] text-lg font-bold text-white">
                        {user.name[0]}
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold text-[#083174]">{user.name}</h1>
                        <p className="font-mono text-xs text-slate-500">ID · {user.user_id}</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge blocked={user.status} />
                    <button
                        onClick={() => setResetting(true)}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        <KeyRound size={14} /> Reset password
                    </button>
                    <BlockButton
                        blocked={user.status}
                        userName={user.name}
                        onToggle={async () => {
                            await adminApi.setStatus(user.user_id, user.status ? 0 : 1);
                            await reload();
                        }}
                    />
                </div>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                    { label: "Monthly amount", value: `Rs ${user.monthly_amount.toLocaleString()}`, color: "text-[#083174]" },
                    { label: "Receipts uploaded", value: paidCount, color: "text-green-600" },
                    { label: "Months unpaid", value: user.unpaid_count, color: "text-red-600" },
                    { label: "Outstanding", value: `Rs ${user.outstanding_amount.toLocaleString()}`, color: "text-[#083174]" },
                ].map((s) => (
                    <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-medium text-slate-500">{s.label}</p>
                        <p className={`mt-1 text-xl font-extrabold sm:text-2xl ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            <h2 className="mb-3 text-sm font-bold text-slate-600">Monthly receipts</h2>
            <TableCard>
                <thead>
                    <tr>
                        <th className={th}>Month</th>
                        <th className={th}>Status</th>
                        <th className={th}>Uploaded on</th>
                        <th className={th}>Amount</th>
                        <th className={`${th} text-right`}>Receipt</th>
                    </tr>
                </thead>
                <tbody>
                    {user.months.map(({ month, receipt: r }) => (
                        <tr key={month} className="hover:bg-slate-50/60">
                            <td className={`${td} font-medium text-slate-700`}>{monthLabel(month)}</td>
                            <td className={td}>
                                {r ? (
                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600">
                                        <CheckCircle2 size={14} /> Uploaded
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
                                        <XCircle size={14} /> Not uploaded
                                    </span>
                                )}
                            </td>
                            <td className={`${td} text-slate-500`}>{r ? formatDateTime(r.uploaded_at) : "—"}</td>
                            <td className={`${td} font-semibold text-slate-700`}>{r ? `Rs ${r.amount.toLocaleString()}` : "—"}</td>
                            <td className={`${td} text-right`}>
                                {r && (
                                    <button
                                        onClick={() => setViewing(r)}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                                    >
                                        <Eye size={14} /> View
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </TableCard>

            {resetting && <ResetPassword userId={user.user_id} onClose={() => setResetting(false)} />}
            <ReceiptViewer receipt={viewing} subtitle={user.name} onClose={() => setViewing(null)} />
        </div>
    );
}

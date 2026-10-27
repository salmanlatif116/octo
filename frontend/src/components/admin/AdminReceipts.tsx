"use client";

import { useState } from "react";
import { AlertTriangle, Eye, Search } from "lucide-react";
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
import { formatDateTime, monthLabel } from "@/lib/format";
import { useApi } from "@/lib/useApi";

export default function AdminReceipts() {
    const months = useMonthOptions();
    const [picked, setPicked] = useState<string | null>(null);
    const month = picked ?? months[0] ?? null;

    const { data, error, reload } = useApi(() => (month ? adminApi.receipts(month) : Promise.resolve(null)), [month]);

    const [query, setQuery] = useState("");
    const [viewing, setViewing] = useState<Receipt | null>(null);

    if (!month) return <p className="text-sm text-slate-400">Loading…</p>;

    const q = query.trim().toLowerCase();
    const matches = (id: string, name: string | null) => !q || id.toLowerCase().includes(q) || (name ?? "").toLowerCase().includes(q);
    const receipts = (data?.receipts ?? []).filter((r) => matches(r.user_id ?? "", r.user_name));
    const missing = (data?.missing ?? []).filter((u) => matches(u.user_id, u.name));

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold text-[#083174]">Receipts</h1>
                    <p className="text-sm text-slate-500">Everything users uploaded for the selected month.</p>
                </div>
                <MonthSelect value={month} onChange={setPicked} options={months} />
            </div>

            {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <div className="mb-6 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <Search size={16} className="text-slate-400" />
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name or User ID"
                    className="w-full text-sm outline-none"
                />
            </div>

            {/* Not uploaded */}
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-700">
                <AlertTriangle size={16} /> Not uploaded for {monthLabel(month)} ({missing.length})
            </h2>
            <div className="mb-8">
                <TableCard>
                    <thead>
                        <tr>
                            <th className={th}>User ID</th>
                            <th className={th}>Name</th>
                            <th className={th}>Status</th>
                            <th className={`${th} text-right`}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data && missing.length === 0 && (
                            <tr>
                                <td colSpan={4} className={`${td} py-6 text-center text-slate-400`}>
                                    Everyone has uploaded their receipt.
                                </td>
                            </tr>
                        )}
                        {missing.map((u) => (
                            <tr key={u.user_id} className="hover:bg-slate-50/60">
                                <td className={`${td} font-mono text-xs font-semibold text-[#083174]`}>{u.user_id}</td>
                                <td className={`${td} font-medium text-slate-700`}>{u.name}</td>
                                <td className={td}>
                                    <StatusBadge blocked={u.status} />
                                </td>
                                <td className={`${td} text-right`}>
                                    <BlockButton
                                        blocked={u.status}
                                        userName={u.name}
                                        onToggle={async () => {
                                            await adminApi.setStatus(u.user_id, u.status ? 0 : 1);
                                            await reload();
                                        }}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </TableCard>
            </div>

            {/* Uploaded */}
            <h2 className="mb-3 text-sm font-bold text-slate-600">Uploaded ({receipts.length})</h2>
            <TableCard>
                <thead>
                    <tr>
                        <th className={th}>User ID</th>
                        <th className={th}>Name</th>
                        <th className={th}>Uploaded on</th>
                        <th className={th}>Amount</th>
                        <th className={th}>Method</th>
                        <th className={`${th} text-right`}>Receipt</th>
                    </tr>
                </thead>
                <tbody>
                    {data && receipts.length === 0 && (
                        <tr>
                            <td colSpan={6} className={`${td} py-6 text-center text-slate-400`}>
                                No receipts for this month.
                            </td>
                        </tr>
                    )}
                    {receipts.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/60">
                            <td className={`${td} font-mono text-xs font-semibold text-[#083174]`}>{r.user_id}</td>
                            <td className={`${td} font-medium text-slate-700`}>{r.user_name}</td>
                            <td className={`${td} text-slate-500`}>{formatDateTime(r.uploaded_at)}</td>
                            <td className={`${td} font-semibold text-slate-700`}>Rs {r.amount.toLocaleString()}</td>
                            <td className={`${td} text-slate-500`}>
                                {r.method === "jazzcash" ? "JazzCash" : r.method === "bank" ? "Bank card" : "Screenshot"}
                            </td>
                            <td className={`${td} text-right`}>
                                <button
                                    onClick={() => setViewing(r)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                                >
                                    <Eye size={14} /> View
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </TableCard>

            <ReceiptViewer receipt={viewing} subtitle={viewing?.user_name ?? undefined} onClose={() => setViewing(null)} />
        </div>
    );
}

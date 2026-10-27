"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import { TableCard, td, th } from "@/components/admin/adminShared";
import { adminApi } from "@/lib/api";
import { useApi } from "@/lib/useApi";

const PAGE = 25;

function formatStamp(value: string): string {
    const d = new Date(value);
    return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
}

/** Audit log: who did what and when (logins, uploads, blocks). Newest first. */
export default function AdminActivity() {
    const [query, setQuery] = useState("");
    const [search, setSearch] = useState("");
    const [failedOnly, setFailedOnly] = useState(false);
    const [page, setPage] = useState(0);

    const { data, error, loading, reload } = useApi(
        () => adminApi.logs({ q: search, failedOnly, limit: PAGE, offset: page * PAGE }),
        [search, failedOnly, page]
    );

    const total = data?.total ?? 0;
    const pages = Math.max(1, Math.ceil(total / PAGE));

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold text-[#083174]">Activity</h1>
                    <p className="text-sm text-slate-500">Every login, upload and block or unblock, with who did it.</p>
                </div>
                <button
                    onClick={() => reload()}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
                </button>
            </div>

            {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <form
                className="mb-3 flex flex-wrap items-center gap-3"
                onSubmit={(e) => {
                    e.preventDefault();
                    setPage(0);
                    setSearch(query.trim());
                }}
            >
                <div className="flex min-w-48 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <Search size={16} className="text-slate-400" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search user, action or request id, then press Enter"
                        className="w-full text-sm outline-none"
                    />
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600">
                    <input
                        type="checkbox"
                        checked={failedOnly}
                        onChange={(e) => {
                            setPage(0);
                            setFailedOnly(e.target.checked);
                        }}
                    />
                    Failed only
                </label>
            </form>

            <TableCard>
                <thead>
                    <tr>
                        <th className={th}>Time</th>
                        <th className={th}>User</th>
                        <th className={th}>Action</th>
                        <th className={th}>Target</th>
                        <th className={th}>Details</th>
                        <th className={th}>IP</th>
                        <th className={th}>Request</th>
                    </tr>
                </thead>
                <tbody>
                    {data && data.items.length === 0 && (
                        <tr>
                            <td colSpan={7} className={`${td} py-8 text-center text-slate-400`}>
                                Nothing logged yet.
                            </td>
                        </tr>
                    )}
                    {data?.items.map((i) => (
                        <tr key={i.id} className={i.success ? "hover:bg-slate-50/60" : "bg-red-50/50 hover:bg-red-50"}>
                            <td className={`${td} whitespace-nowrap text-xs text-slate-500`}>{formatStamp(i.created_at)}</td>
                            <td className={`${td} font-mono text-xs font-semibold text-[#083174]`}>{i.actor}</td>
                            <td className={td}>
                                <span
                                    className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                                        i.success ? "bg-blue-50 text-blue-700" : "bg-red-100 text-red-700"
                                    }`}
                                >
                                    {i.action}
                                </span>
                            </td>
                            <td className={`${td} font-mono text-xs text-slate-600`}>{i.target ?? "—"}</td>
                            <td className={`${td} text-xs text-slate-500`}>{i.detail ?? "—"}</td>
                            <td className={`${td} font-mono text-xs text-slate-400`}>{i.ip ?? "—"}</td>
                            <td className={`${td} font-mono text-xs text-slate-400`}>{i.request_id ?? "—"}</td>
                        </tr>
                    ))}
                </tbody>
            </TableCard>

            <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                <span>
                    {total} {total === 1 ? "entry" : "entries"}
                </span>
                <div className="flex items-center gap-2">
                    <button
                        disabled={page === 0}
                        onClick={() => setPage((p) => p - 1)}
                        aria-label="Previous page"
                        className="rounded-lg border border-slate-200 bg-white p-1.5 disabled:opacity-40"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span>
                        Page {page + 1} of {pages}
                    </span>
                    <button
                        disabled={page + 1 >= pages}
                        onClick={() => setPage((p) => p + 1)}
                        aria-label="Next page"
                        className="rounded-lg border border-slate-200 bg-white p-1.5 disabled:opacity-40"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}

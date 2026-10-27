"use client";

import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { adminApi } from "@/lib/api";
import { monthLabel } from "@/lib/format";
import { useApi } from "@/lib/useApi";

/** Status code shown to the admin: 1 = blocked, 0 = unblocked. */
export function StatusBadge({ blocked }: { blocked: 0 | 1 }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                blocked
                    ? "border-red-300 bg-red-50 text-red-700"
                    : "border-green-300 bg-green-50 text-green-700"
            }`}
        >
            <span className="font-mono">{blocked}</span>
            {blocked ? "Blocked" : "Active"}
        </span>
    );
}

/** Months the admin can pick, newest first (from the server). The first is the current month. */
export function useMonthOptions(): string[] {
    const { data } = useApi(() => adminApi.months());
    return data ?? [];
}

export function MonthSelect({
    value,
    onChange,
    options,
}: {
    value: string;
    onChange: (month: string) => void;
    options: string[];
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Month"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#083174] outline-none focus:border-[#083174] focus:ring-2 focus:ring-[#083174]/20"
        >
            {options.map((m) => (
                <option key={m} value={m}>
                    {monthLabel(m)}
                </option>
            ))}
        </select>
    );
}

/** Block / Unblock button that asks for confirmation first. */
export function BlockButton({
    blocked,
    userName,
    onToggle,
}: {
    blocked: 0 | 1;
    userName: string;
    onToggle: () => Promise<void>;
}) {
    const [confirming, setConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    return (
        <>
            <button
                type="button"
                onClick={() => {
                    setError(null);
                    setConfirming(true);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                    blocked
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-red-600 text-white hover:bg-red-700"
                }`}
            >
                {blocked ? "Unblock" : "Block"}
            </button>
            <ConfirmDialog
                open={confirming}
                title={blocked ? "Unblock user?" : "Block user?"}
                message={
                    error ??
                    (blocked
                        ? `${userName} will be set to status 0 and shown as Active.`
                        : `${userName} will be set to status 1 and shown as Inactive until you unblock them.`)
                }
                confirmLabel={blocked ? "Unblock" : "Block"}
                danger={!blocked}
                onConfirm={async () => {
                    try {
                        await onToggle();
                        setConfirming(false);
                    } catch (err) {
                        setError(err instanceof Error ? err.message : "Could not change the status.");
                    }
                }}
                onCancel={() => setConfirming(false)}
            />
        </>
    );
}

/** Shared table look: wrap <table> in this. */
export function TableCard({ children }: { children: React.ReactNode }) {
    return (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
        </div>
    );
}

export const th = "bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500";
export const td = "border-t border-slate-100 px-4 py-3 align-middle";

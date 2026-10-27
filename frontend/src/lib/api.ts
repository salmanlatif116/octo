import { useAuthStore, type SessionUser, type Tokens } from "@/store/authStore";

// Empty in production (same origin as the backend). Set for `npm run dev`.
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
const V1 = "/api/v1";

export class ApiError extends Error {
    status: number;
    requestId?: string;

    constructor(status: number, message: string, requestId?: string) {
        super(message);
        this.status = status;
        this.requestId = requestId;
    }
}

interface Options {
    method?: string;
    json?: unknown;
    form?: FormData;
    /** Send the Bearer token (default true). Login passes false. */
    auth?: boolean;
}

function errorMessage(body: unknown, fallback: string): string {
    const detail = (body as { detail?: unknown } | null)?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0]?.msg) {
        return String(detail[0].msg).replace(/^Value error, /, "");
    }
    return fallback;
}

function send(path: string, { method = "GET", json, form, auth = true }: Options, token: string | null) {
    const headers: Record<string, string> = {};
    if (json !== undefined) headers["Content-Type"] = "application/json";
    if (auth && token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: form ?? (json !== undefined ? JSON.stringify(json) : undefined),
    });
}

// One refresh at a time, even if several requests hit an expired token together.
let refreshing: Promise<string | null> | null = null;

/** Trade the refresh token for a new session. Returns the new access token, or null (and logs out). */
function refreshSession(): Promise<string | null> {
    refreshing ??= (async () => {
        const { refreshToken, setTokens, clear } = useAuthStore.getState();
        if (!refreshToken) return null;
        try {
            const res = await send(`${V1}/auth/refresh/`, { method: "POST", json: { refresh_token: refreshToken }, auth: false }, null);
            if (!res.ok) {
                clear();
                return null;
            }
            const data: Tokens = await res.json();
            setTokens(data);
            return data.access_token;
        } catch {
            return null;
        } finally {
            refreshing = null;
        }
    })();
    return refreshing;
}

/** Fetch with the auth token; on an expired token, refresh once and retry. */
async function authed(path: string, options: Options): Promise<Response> {
    let res: Response;
    try {
        res = await send(path, options, useAuthStore.getState().accessToken);
        if (res.status === 401 && options.auth !== false) {
            const token = await refreshSession();
            if (token) res = await send(path, options, token);
        }
    } catch {
        throw new ApiError(0, "Cannot reach the server. Please try again.");
    }
    return res;
}

export async function api<T>(path: string, options: Options = {}): Promise<T> {
    const res = await authed(path, options);
    const body = await res.json().catch(() => null);
    if (!res.ok) {
        throw new ApiError(res.status, errorMessage(body, `Request failed (${res.status})`), res.headers.get("x-request-id") ?? undefined);
    }
    return body as T;
}

/** Fetch a protected file (a receipt image) as a Blob. */
export async function apiBlob(path: string): Promise<Blob> {
    const res = await authed(path, {});
    if (!res.ok) throw new ApiError(res.status, `Could not load the file (${res.status})`);
    return res.blob();
}

/** Tell the server (for the audit log), then forget the tokens. */
export async function signOut(): Promise<void> {
    try {
        await api(`${V1}/auth/logout/`, { method: "POST" });
    } catch {
        // Logging out must always work, even if the server is unreachable or the token expired.
    }
    useAuthStore.getState().clear();
}

// ---- types -----------------------------------------------------------------

export type PaymentMethod = "jazzcash" | "bank";

export interface Receipt {
    id: number;
    month: string;
    amount: number;
    method: PaymentMethod | null;
    reference: string | null;
    uploaded_at: string;
    user_id: string | null;
    user_name: string | null;
}

export interface Summary {
    user_id: string;
    name: string;
    status: number;
    active: boolean;
    monthly_amount: number;
    unpaid_months: string[];
    outstanding_amount: number;
}

export interface PayRequest {
    method: PaymentMethod;
    account_number?: string;
    card_number?: string;
    card_expiry?: string;
}

export interface AdminUserRow {
    user_id: string;
    name: string;
    status: 0 | 1;
    monthly_amount: number;
    start_month: string;
    owes: boolean;
    receipt: { id: number; uploaded_at: string; method: PaymentMethod | null } | null;
}

export interface AdminUserDetail {
    user_id: string;
    name: string;
    status: 0 | 1;
    monthly_amount: number;
    start_month: string;
    unpaid_count: number;
    outstanding_amount: number;
    months: { month: string; receipt: Receipt | null }[];
}

export interface AdminReceipts {
    month: string;
    receipts: Receipt[];
    missing: AdminUserRow[];
}

export interface LogItem {
    id: number;
    created_at: string;
    actor: string;
    action: string;
    target: string | null;
    detail: string | null;
    ip: string | null;
    request_id: string | null;
    success: boolean;
}

// ---- endpoints -------------------------------------------------------------

export const authApi = {
    login: (userId: string, password: string) =>
        api<Tokens>(`${V1}/auth/login/`, { method: "POST", json: { user_id: userId, password }, auth: false }),
    me: () => api<SessionUser>(`${V1}/auth/me/`),
};

export const meApi = {
    summary: () => api<Summary>(`${V1}/me/summary/`),
    receipts: () => api<Receipt[]>(`${V1}/me/receipts/`),
    upload: (file: Blob, filename: string) => {
        const form = new FormData();
        form.append("file", file, filename);
        return api<Receipt>(`${V1}/me/receipts/`, { method: "POST", form });
    },
    pay: (body: PayRequest) => api<Receipt>(`${V1}/me/pay/`, { method: "POST", json: body }),
};

export const adminApi = {
    months: () => api<string[]>(`${V1}/admin/months/`),
    users: (month: string) => api<AdminUserRow[]>(`${V1}/admin/users/?month=${month}`),
    user: (userId: string) => api<AdminUserDetail>(`${V1}/admin/users/${encodeURIComponent(userId)}/`),
    createUser: (body: { user_id: string; name: string; password: string; monthly_amount?: number }) =>
        api<AdminUserRow>(`${V1}/admin/users/`, { method: "POST", json: body }),
    setStatus: (userId: string, status: 0 | 1) =>
        api<AdminUserRow>(`${V1}/admin/users/${encodeURIComponent(userId)}/status/`, { method: "PATCH", json: { status } }),
    resetPassword: (userId: string, password: string) =>
        api<void>(`${V1}/admin/users/${encodeURIComponent(userId)}/password/`, { method: "PUT", json: { password } }),
    receipts: (month: string) => api<AdminReceipts>(`${V1}/admin/receipts/?month=${month}`),
    logs: (params: { q?: string; failedOnly?: boolean; limit: number; offset: number }) => {
        const qs = new URLSearchParams({ limit: String(params.limit), offset: String(params.offset) });
        if (params.q) qs.set("q", params.q);
        if (params.failedOnly) qs.set("failed_only", "true");
        return api<{ total: number; items: LogItem[] }>(`${V1}/admin/logs/?${qs}`);
    },
};

export const contactApi = {
    send: (body: { name: string; email: string; subject: string; message: string }) =>
        api<{ status: string }>(`${V1}/contact/`, { method: "POST", json: body, auth: false }),
};

/** Report a browser error to the server log (best effort, never throws). */
export function reportClientError(message: string, stack?: string) {
    fetch(`${API_BASE_URL}${V1}/client-logs/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.slice(0, 2000), stack: stack?.slice(0, 8000), url: window.location.pathname }),
    }).catch(() => {});
}

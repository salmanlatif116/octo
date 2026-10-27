"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/api";

/** Sends uncaught browser errors to the server log (max a few per page load, so a loop cannot flood it). */
export default function ClientErrorReporter() {
    useEffect(() => {
        let sent = 0;
        const report = (message: string, stack?: string) => {
            if (sent++ < 5) reportClientError(message, stack);
        };
        const onError = (e: ErrorEvent) => report(e.message, e.error?.stack);
        const onRejection = (e: PromiseRejectionEvent) => {
            const reason = e.reason;
            report(reason instanceof Error ? reason.message : String(reason), reason instanceof Error ? reason.stack : undefined);
        };
        window.addEventListener("error", onError);
        window.addEventListener("unhandledrejection", onRejection);
        return () => {
            window.removeEventListener("error", onError);
            window.removeEventListener("unhandledrejection", onRejection);
        };
    }, []);
    return null;
}

"use client";

import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { apiBlob } from "@/lib/api";

interface AuthImageProps {
    /** API path of a protected image, e.g. /api/v1/receipts/12/file/ */
    src: string;
    alt: string;
    className?: string;
}

/** <img> for files that need the login token (a plain <img> cannot send it). */
export default function AuthImage({ src, alt, className = "" }: AuthImageProps) {
    const [url, setUrl] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let objectUrl: string | null = null;
        let cancelled = false;
        setUrl(null);
        setFailed(false);
        apiBlob(src)
            .then((blob) => {
                if (cancelled) return;
                objectUrl = URL.createObjectURL(blob);
                setUrl(objectUrl);
            })
            .catch(() => !cancelled && setFailed(true));
        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [src]);

    if (failed) {
        return (
            <div className={`flex items-center justify-center bg-slate-100 text-slate-400 ${className}`} role="img" aria-label={alt}>
                <ImageOff size={20} />
            </div>
        );
    }
    if (!url) return <div className={`animate-pulse bg-slate-100 ${className}`} aria-hidden />;
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={alt} className={className} />;
}

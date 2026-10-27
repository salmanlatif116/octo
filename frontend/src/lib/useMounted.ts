import { useEffect, useState } from "react";

/** False during the static render / first paint, true once running in the browser. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

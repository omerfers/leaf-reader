"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/** Android's back button: from a book back to the shelf, from the shelf out of the app. */
export function NativeShell() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!window.Capacitor?.isNativePlatform?.()) return;
    let remove: (() => void) | undefined;
    let cancelled = false;
    void import("@capacitor/app").then(({ App }) => {
      if (cancelled) return;
      void App.addListener("backButton", () => {
        if (window.location.pathname.startsWith("/read")) {
          router.push("/");
        } else {
          void App.exitApp();
        }
      }).then((handle) => {
        remove = () => void handle.remove();
      });
    });
    return () => {
      cancelled = true;
      remove?.();
    };
  }, [router, pathname]);

  return null;
}

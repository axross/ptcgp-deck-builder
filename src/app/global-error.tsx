"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/report-error";
// global-error replaces the root layout, so the token sheet must be imported
// here for the module's var() references to resolve.
import "./globals.css";
import styles from "./global-error.module.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className={styles.main}>
          <h1>Something went wrong</h1>
          <button type="button" onClick={reset}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}

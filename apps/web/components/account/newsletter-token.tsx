"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { Notice } from "@/components/auth/field";
import { confirmNewsletter, unsubscribeNewsletter } from "@/lib/api/newsletter";

/** Confirms or cancels a newsletter subscription from the emailed link. */
export function NewsletterToken({ action }: { action: "confirm" | "unsubscribe" }) {
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<"working" | "done" | "error">(token ? "working" : "error");
  const [message, setMessage] = useState("This link is incomplete.");

  useEffect(() => {
    if (!token) return;
    let live = true;
    void (action === "confirm" ? confirmNewsletter(token) : unsubscribeNewsletter(token)).then((res) => {
      if (!live) return;
      if (res.ok) setState("done");
      else {
        setMessage(res.message);
        setState("error");
      }
    });
    return () => {
      live = false;
    };
  }, [action, token]);

  if (state === "working")
    return (
      <p className="mt-6 flex items-center gap-2 text-muted-ink" role="status">
        <Spinner /> One moment…
      </p>
    );
  if (state === "error") return <Notice tone="error">{message}</Notice>;
  return (
    <Notice>
      {action === "confirm"
        ? "You're subscribed. We'll email you conference announcements and RiTECHS news, at most once a month."
        : "You've been unsubscribed and won't receive RiTECHS newsletters any more."}
    </Notice>
  );
}

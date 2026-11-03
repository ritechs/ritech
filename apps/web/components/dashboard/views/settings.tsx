"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AdminPage, Panel, fmtDate, useToast } from "@/components/admin/ui";
import { TextArea } from "@/components/admin/form";
import { ChangePasswordCard, TwoFactorCard } from "@/components/account/security-settings";
import { useMember } from "@/components/dashboard/shell";
import { send } from "@/lib/admin/use-api";

function MembershipChange() {
  const { me, refresh } = useMember();
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const other = me.profile.type === "mentor" ? "mentee" : "mentor";
  const pending = me.pendingMembershipChange;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 10) {
      setError("Tell us in a sentence or two why you would like to change.");
      document.getElementById("f-reason")?.focus();
      return;
    }
    setSaving(true);
    const res = await send("/me/membership-change", "POST", { toType: other, reason });
    setSaving(false);
    if (!res.ok) return toast("error", res.message);
    toast("success", "Request sent. Our team will review it.");
    setReason("");
    setError(undefined);
    await refresh();
  }

  return (
    <Panel title="Membership Type">
      <p className="text-[0.9375rem] text-ink">
        You are a RiTECHS <strong className="font-medium capitalize">{me.profile.type}</strong>.
      </p>
      {pending ? (
        <p className="mt-3 rounded-md bg-warning-wash px-3 py-2 text-sm text-ink">
          Your request to become a {pending.toType} was sent on {fmtDate(pending.createdAt)} and is waiting for review.
        </p>
      ) : me.profile.status !== "approved" ? (
        <p className="mt-2 text-sm text-muted-ink">You can ask to change once your membership is approved.</p>
      ) : (
        <form noValidate onSubmit={submit} className="mt-4 space-y-3">
          <TextArea id="reason" label={`Why would you like to become a ${other}?`} value={reason} onChange={setReason} errors={error ? { reason: error } : undefined} rows={3} hint={other === "mentor" ? "For example, you have completed your PhD and now supervise students." : undefined} />
          <Button type="submit" variant="outline" disabled={saving}>
            {saving && <Spinner />}
            {saving ? "Sending…" : `Ask to Become a ${other === "mentor" ? "Mentor" : "Mentee"}`}
          </Button>
        </form>
      )}
    </Panel>
  );
}

export function SettingsView() {
  const { me, refresh } = useMember();
  return (
    <AdminPage title="Settings & Security" description="Your sign-in details, password, optional two-step verification and membership type.">
      <Panel title="Sign-In Email">
        <p className="text-[0.9375rem] text-ink">{me.user.email}</p>
        <p className="mt-1 text-sm text-muted-ink">To change your email address, write to info@ritechs.org from this address.</p>
      </Panel>
      <ChangePasswordCard />
      <TwoFactorCard email={me.user.email} enabled={!!me.user.twoFactorEnabled} required={!!me.user.twoFactorRequired} onChange={() => void refresh()} />
      <MembershipChange />
    </AdminPage>
  );
}

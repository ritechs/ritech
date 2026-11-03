"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAdmin } from "@/components/admin/shell";
import { AdminPage, Badge, Confirm, DataTable, Empty, ErrorNote, Labeled, Loading, Pager, Panel, Tabs, fmtDate, label, useToast } from "@/components/admin/ui";
import { FormGrid, Select, TextInput } from "@/components/admin/form";
import { qs, send, useApi, type Paged } from "@/lib/admin/use-api";
import { useUrlState } from "@/lib/admin/url-state";

interface Overview { active_blocks: number; auto_blocks_24h: number; locked_accounts: number; locked_addresses: number; sign_ins_24h: number; lockouts_24h: number; staff_without_2fa: number }
interface Rule { id: string; cidr: string; action: "block" | "allow"; source: "manual" | "auto"; reason: string; expiresAt: string | null; hitCount: number; lastHitAt: string | null; createdAt: string }
interface Lock { key: string; kind: "account" | "address"; lockedUntil: string; lockCount: number }
interface Entry { id: number; action: string; actorName: string | null; actorEmail: string | null; entityType: string | null; entityId: string | null; ip: string | null; metadata: Record<string, unknown> | null; createdAt: string }

const ACTIONS: [string, string][] = [
  ["", "All activity"],
  ["auth.*", "Sign-ins and authentication"],
  ["auth.account_locked", "Account lockouts"],
  ["security.*", "Security changes and blocks"],
  ["member.*", "Membership decisions"],
  ["staff.*", "Staff changes"],
  ["conference.*", "Conference edits"],
  ["campaign.*", "Email campaigns"],
];

function Num({ label: text, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className="rounded-lg border border-rule bg-surface p-4">
      <p className="text-sm text-muted-ink">{text}</p>
      <p className={`mt-1 font-serif text-3xl numerals-tabular ${alert ? "text-brand" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function AddRule({ onAdded }: { onAdded: () => void }) {
  const toast = useToast();
  const [cidr, setCidr] = useState("");
  const [action, setAction] = useState("block");
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState("24");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await send("/admin/security/ip-rules", "POST", { cidr: cidr.trim(), action, reason: reason.trim(), expiresInHours: hours ? Number(hours) : null });
          if (!res.ok) {
            setErrors(res.fields ?? { cidr: res.message });
            return;
          }
          setErrors({});
          setCidr("");
          setReason("");
          toast("success", action === "block" ? "Address blocked." : "Address allowed.");
          onAdded();
        });
      }}
    >
      <FormGrid className="lg:grid-cols-4">
        <TextInput id="cidr" label="IP address or range" value={cidr} onChange={setCidr} errors={errors} placeholder="e.g. 203.0.113.7 or 203.0.113.0/24…" spellCheck={false} />
        <Select id="action" label="Rule" value={action} onChange={setAction} options={[["block", "Block"], ["allow", "Allow (skip limits)"]]} />
        <TextInput id="reason" label="Reason" value={reason} onChange={setReason} errors={errors} placeholder="e.g. Spam registrations…" />
        <Select id="hours" label="For" value={hours} onChange={setHours} options={[["1", "1 hour"], ["24", "24 hours"], ["168", "7 days"], ["720", "30 days"], ["", "Permanently"]]} />
      </FormGrid>
      <Button type="submit" className="mt-4" disabled={pending}>
        {pending && <Spinner />}
        {pending ? "Saving…" : "Add Rule"}
      </Button>
    </form>
  );
}

export function SecurityView() {
  const me = useAdmin();
  const url = useUrlState();
  const tab = url.get("tab", "overview");
  const toast = useToast();
  const overview = useApi<Overview>(tab === "overview" ? "/admin/security/overview" : null);
  const rules = useApi<Paged<Rule>>(tab === "ip-rules" ? `/admin/security/ip-rules${qs({ active: true, page: url.page })}` : null);
  const locks = useApi<Lock[]>(tab === "lockouts" ? "/admin/security/lockouts" : null);
  const audit = useApi<Paged<Entry>>(tab === "audit" ? `/admin/security/audit${qs({ action: url.get("action"), page: url.page, pageSize: 50 })}` : null);
  const [removing, setRemoving] = useState<Rule | null>(null);
  const [unlockEmail, setUnlockEmail] = useState("");

  if (me.role !== "admin") return <AdminPage title="Security"><ErrorNote message="Only administrators can open the security console." /></AdminPage>;

  return (
    <AdminPage title="Security" description="Sign-in protection, blocked addresses and the audit trail.">
      <Tabs label="Security" tabs={[["overview", "Overview"], ["ip-rules", "IP Rules"], ["lockouts", "Lockouts"], ["audit", "Audit Log"]]} value={tab} onChange={(t) => url.set({ tab: t === "overview" ? null : t, action: null })} />

      {tab === "overview" && (
        <>
          {overview.error && <ErrorNote message={overview.error.message} onRetry={overview.reload} />}
          {!overview.data && !overview.error && <Loading />}
          {overview.data && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              <Num label="Sign-ins (24 h)" value={overview.data.sign_ins_24h} />
              <Num label="Lockouts (24 h)" value={overview.data.lockouts_24h} alert={overview.data.lockouts_24h > 0} />
              <Num label="Locked accounts now" value={overview.data.locked_accounts} alert={overview.data.locked_accounts > 0} />
              <Num label="Locked addresses now" value={overview.data.locked_addresses} />
              <Num label="Blocked addresses" value={overview.data.active_blocks} />
              <Num label="Automatic blocks (24 h)" value={overview.data.auto_blocks_24h} alert={overview.data.auto_blocks_24h > 0} />
              <Num label="Admins without 2FA" value={overview.data.staff_without_2fa} alert={overview.data.staff_without_2fa > 0} />
            </div>
          )}
          <Panel title="How Protection Works">
            <ul className="max-w-[75ch] list-disc space-y-1.5 pl-5 text-[0.9375rem] text-ink">
              <li>5 wrong passwords lock an account for 15 minutes; repeat lockouts double, up to 24 hours. The owner is emailed.</li>
              <li>An address with many failures, or that keeps hitting rate limits, is blocked automatically (1 hour, then 6 h, 24 h, 7 days).</li>
              <li>Two-step verification is optional (set REQUIRE_STAFF_2FA=true to require it for admins). Staff sessions end after 12 hours.</li>
              <li>Every sign-in, lockout, block and admin change is written to the audit log, which cannot be edited.</li>
            </ul>
          </Panel>
        </>
      )}

      {tab === "ip-rules" && (
        <>
          <Panel title="Add a Rule">
            <AddRule onAdded={rules.reload} />
          </Panel>
          <Panel title="Active Rules">
            {rules.error && <ErrorNote message={rules.error.message} onRetry={rules.reload} />}
            {rules.loading && !rules.data && <Loading />}
            {rules.data && rules.data.items.length === 0 && <Empty title="No active rules" text="Blocks created automatically also appear here." />}
            {rules.data && rules.data.items.length > 0 && (
              <>
                <DataTable
                  caption="Active IP rules"
                  rows={rules.data.items}
                  rowKey={(r) => r.id}
                  columns={[
                    { key: "cidr", header: "Address", cell: (r) => <span className="font-mono text-[0.8125rem]">{r.cidr}</span> },
                    { key: "act", header: "Rule", cell: (r) => <span className="flex flex-wrap gap-1"><Badge tone={r.action === "block" ? "danger" : "success"}>{label(r.action)}</Badge>{r.source === "auto" && <Badge>Automatic</Badge>}</span> },
                    { key: "reason", header: "Reason", cell: (r) => r.reason, hideBelow: "md" },
                    { key: "exp", header: "Until", cell: (r) => (r.expiresAt ? fmtDate(r.expiresAt, true) : "Permanent"), hideBelow: "sm" },
                    { key: "hits", header: "Hits", cell: (r) => <span className="numerals-tabular">{r.hitCount}</span>, hideBelow: "lg" },
                    { key: "rm", header: "", cell: (r) => <Button size="sm" variant="ghost" onClick={() => setRemoving(r)}>Remove</Button> },
                  ]}
                />
                <Pager page={rules.data.page} pages={rules.data.pages} total={rules.data.total} onPage={(p) => url.set({ page: p })} />
              </>
            )}
          </Panel>
        </>
      )}

      {tab === "lockouts" && (
        <>
          <Panel title="Unlock by Email">
            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await send("/admin/security/lockouts/unlock-email", "POST", { email: unlockEmail.trim() });
                toast(res.ok ? "success" : "error", res.ok ? "Unlocked. They can sign in again now." : res.message);
                if (res.ok) {
                  setUnlockEmail("");
                  void locks.reload();
                }
              }}
            >
              <Labeled id="unlock-email" label="Member's email address" className="flex-1">
                <Input id="unlock-email" type="email" value={unlockEmail} onChange={(e) => setUnlockEmail(e.target.value)} spellCheck={false} placeholder="name@university.edu…" />
              </Labeled>
              <Button type="submit" variant="outline">Unlock</Button>
            </form>
            <p className="mt-2 text-xs text-faint-ink">Usually better: ask them to reset their password, which also clears the lock.</p>
          </Panel>
          <Panel title="Locked Right Now">
            {locks.error && <ErrorNote message={locks.error.message} onRetry={locks.reload} />}
            {locks.loading && !locks.data && <Loading />}
            {locks.data && locks.data.length === 0 && <Empty title="Nothing is locked" />}
            {locks.data && locks.data.length > 0 && (
              <DataTable
                caption="Current lockouts"
                rows={locks.data}
                rowKey={(r) => r.key}
                columns={[
                  { key: "kind", header: "What", cell: (r) => (r.kind === "account" ? "An account (email hidden)" : <span className="font-mono text-[0.8125rem]">{r.key.slice(3)}</span>) },
                  { key: "until", header: "Until", cell: (r) => fmtDate(r.lockedUntil, true) },
                  { key: "count", header: "Lockouts today", cell: (r) => <span className="numerals-tabular">{r.lockCount}</span>, hideBelow: "sm" },
                  {
                    key: "un",
                    header: "",
                    cell: (r) => (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          const res = await send(`/admin/security/lockouts/${encodeURIComponent(r.key)}`, "DELETE");
                          toast(res.ok ? "success" : "error", res.ok ? "Unlocked." : res.message);
                          void locks.reload();
                        }}
                      >
                        Unlock
                      </Button>
                    ),
                  },
                ]}
              />
            )}
          </Panel>
        </>
      )}

      {tab === "audit" && (
        <Panel>
          <div className="max-w-sm">
            <Labeled id="audit-filter" label="Show">
              <select id="audit-filter" className="h-12 w-full rounded-md border border-input bg-surface px-3 text-[0.9375rem]" value={url.get("action")} onChange={(e) => url.set({ action: e.target.value })}>
                {ACTIONS.map(([v, t]) => (
                  <option key={v} value={v}>{t}</option>
                ))}
              </select>
            </Labeled>
          </div>
          <div className="mt-5">
            {audit.error && <ErrorNote message={audit.error.message} onRetry={audit.reload} />}
            {audit.loading && !audit.data && <Loading />}
            {audit.data && audit.data.items.length === 0 && <Empty title="No entries" />}
            {audit.data && audit.data.items.length > 0 && (
              <>
                <DataTable
                  caption="Audit log"
                  rows={audit.data.items}
                  rowKey={(r) => String(r.id)}
                  columns={[
                    { key: "when", header: "When", cell: (r) => <span className="whitespace-nowrap">{fmtDate(r.createdAt, true)}</span> },
                    { key: "what", header: "What", cell: (r) => <span className="font-mono text-[0.8125rem]">{r.action}</span> },
                    { key: "who", header: "Who", cell: (r) => r.actorName ?? (r.actorEmail || "System"), hideBelow: "sm" },
                    { key: "ip", header: "IP", cell: (r) => <span className="font-mono text-[0.8125rem]">{r.ip ?? "—"}</span>, hideBelow: "lg" },
                    { key: "detail", header: "Details", cell: (r) => <span className="line-clamp-2 text-xs text-muted-ink">{r.metadata ? JSON.stringify(r.metadata) : (r.entityId ?? "")}</span>, hideBelow: "md" },
                  ]}
                />
                <Pager page={audit.data.page} pages={audit.data.pages} total={audit.data.total} onPage={(p) => url.set({ page: p })} />
              </>
            )}
          </div>
        </Panel>
      )}

      <Confirm
        open={!!removing}
        onOpenChange={(v) => !v && setRemoving(null)}
        title="Remove This Rule?"
        description={removing ? `${removing.cidr} will ${removing.action === "block" ? "be able to reach the site again" : "be rate-limited like everyone else"} within 10 seconds.` : ""}
        confirmLabel="Remove Rule"
        pendingLabel="Removing…"
        onConfirm={async () => {
          const res = await send(`/admin/security/ip-rules/${removing!.id}`, "DELETE");
          toast(res.ok ? "success" : "error", res.ok ? "Rule removed." : res.message);
          void rules.reload();
        }}
      />
    </AdminPage>
  );
}

/* ---------------------------------- staff --------------------------------- */

interface Staff { id: string; name: string; email: string; role: string; twoFactorEnabled: boolean | null; banned: boolean | null; lastLoginAt: string | null; createdAt: string }

export function StaffView() {
  const me = useAdmin();
  const toast = useToast();
  const list = useApi<Staff[]>(me.role === "admin" ? "/admin/staff" : null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  if (me.role !== "admin") return <AdminPage title="Staff"><ErrorNote message="Only administrators can manage staff." /></AdminPage>;

  return (
    <AdminPage title="Staff" description="Editors manage content and members. Administrators also manage security, staff and email campaigns.">
      <Panel title="Add a Staff Member">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await send("/admin/staff", "POST", { name: name.trim(), email: email.trim(), role, ...(password ? { password } : {}) });
              if (!res.ok) return setErrors(res.fields ?? { email: res.message });
              setErrors({});
              setName("");
              setEmail("");
              setPassword("");
              toast("success", password ? "Added. They can sign in now with the password you set." : "Added. New staff get an email to set their password.");
              void list.reload();
            });
          }}
        >
          <FormGrid className="lg:grid-cols-4">
            <TextInput id="name" label="Name" value={name} onChange={setName} errors={errors} autoComplete="off" />
            <TextInput id="email" label="Email" type="email" value={email} onChange={setEmail} errors={errors} spellCheck={false} autoComplete="off" />
            <Select id="role" label="Role" value={role} onChange={setRole} options={[["editor", "Editor"], ["admin", "Administrator"]]} />
            <TextInput id="password" label="Password (optional)" type="password" value={password} onChange={setPassword} errors={errors} autoComplete="new-password" hint="Set one now if email isn't set up; otherwise they get a link by email." />
          </FormGrid>
          <Button type="submit" className="mt-4" disabled={pending}>
            {pending && <Spinner />}
            {pending ? "Adding…" : "Add Staff Member"}
          </Button>
        </form>
      </Panel>
      <Panel title="Current Staff">
        {list.error && <ErrorNote message={list.error.message} onRetry={list.reload} />}
        {list.loading && !list.data && <Loading />}
        {list.data && (
          <DataTable
            caption="Staff"
            rows={list.data}
            rowKey={(r) => r.id}
            columns={[
              { key: "name", header: "Name", cell: (r) => <><span className="font-medium">{r.name}</span><span className="block text-xs break-all text-muted-ink">{r.email}</span></> },
              { key: "2fa", header: "Two-step", cell: (r) => (r.twoFactorEnabled ? <Badge tone="success">On</Badge> : <Badge>Off</Badge>) },
              { key: "last", header: "Last sign-in", cell: (r) => fmtDate(r.lastLoginAt, true), hideBelow: "md" },
              {
                key: "role",
                header: "Role",
                cell: (r) =>
                  r.id === me.id ? (
                    <span className="capitalize">{r.role} (you)</span>
                  ) : (
                    <>
                      <label htmlFor={`role-${r.id}`} className="sr-only">Role for {r.name}</label>
                      <select
                        id={`role-${r.id}`}
                        className="h-9 rounded-md border border-input bg-surface px-2 text-sm"
                        value={r.role}
                        onChange={async (e) => {
                          const res = await send(`/admin/staff/${r.id}`, "PATCH", { role: e.target.value });
                          toast(res.ok ? "success" : "error", res.ok ? (e.target.value === "user" ? `${r.name} is no longer staff.` : "Role changed. They need to sign in again.") : res.message);
                          void list.reload();
                        }}
                      >
                        <option value="editor">Editor</option>
                        <option value="admin">Administrator</option>
                        <option value="user">Remove staff access</option>
                      </select>
                    </>
                  ),
              },
            ]}
          />
        )}
      </Panel>
    </AdminPage>
  );
}

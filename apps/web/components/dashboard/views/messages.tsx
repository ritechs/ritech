"use client";

import { useEffect, useState } from "react";
import { PenLine, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPage, Confirm, Empty, ErrorNote, Loading, Pager, Panel, Tabs, fmtDate, useToast } from "@/components/admin/ui";
import { TextArea, TextInput, focusFirstError } from "@/components/admin/form";
import { EditDialog } from "@/components/admin/views/library";
import { useMember } from "@/components/dashboard/shell";
import { apiRaw } from "@/lib/api/client";
import { qs, send, useApi, type Paged } from "@/lib/admin/use-api";
import { useUrlState } from "@/lib/admin/url-state";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  subject: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  person: { id: string; name: string };
}
interface Recipient {
  id: string;
  name: string;
  type: "mentor" | "mentee";
}

export function MessagesView() {
  const { me, refreshCounts } = useMember();
  const toast = useToast();
  const url = useUrlState();
  const box = url.get("box") === "out" ? "out" : "in";
  const list = useApi<Paged<Message>>(`/me/workspace/messages${qs({ box, page: url.page, pageSize: 20 })}`);
  const [openId, setOpenId] = useState<string | null>(null);
  const [compose, setCompose] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[] | null>(null);
  const [to, setTo] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [del, setDel] = useState<Message | null>(null);
  const approved = me.profile.status === "approved";

  async function startCompose(preselect?: string, re?: string) {
    setErrors({});
    setSubject(re ? (re.startsWith("Re: ") ? re : `Re: ${re}`) : "");
    setBody("");
    setTo(preselect ? [preselect] : []);
    setCompose(true);
    if (!recipients) {
      const r = await apiRaw<Recipient[]>("/me/workspace/messages/recipients");
      setRecipients(r.ok ? r.data : []);
    }
  }

  // Arriving from "Message" on a mentee or a request opens a new message to that person.
  const preTo = url.get("to");
  useEffect(() => {
    if (!preTo) return;
    const raf = requestAnimationFrame(() => {
      void startCompose(preTo);
      url.set({ to: "" });
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preTo]);

  async function toggle(m: Message) {
    const next = openId === m.id ? null : m.id;
    setOpenId(next);
    if (next && box === "in" && !m.readAt) {
      await send(`/me/workspace/messages/${m.id}/read`, "POST");
      void list.reload();
      refreshCounts();
    }
  }

  async function sendMessage() {
    const e: Record<string, string> = {};
    if (!to.length) e.to = "Choose at least one person.";
    if (!subject.trim()) e.subject = "Add a subject, like “Draft feedback”.";
    if (!body.trim()) e.body = "Write your message.";
    setErrors(e);
    if (Object.keys(e).length) return focusFirstError(e);
    setSaving(true);
    const res = await send<{ sent: number }>("/me/workspace/messages", "POST", { to, subject, body });
    setSaving(false);
    if (!res.ok) return toast("error", res.message);
    toast("success", to.length === 1 ? "Message sent." : `Message sent to ${to.length} people.`);
    setCompose(false);
    if (box === "out") void list.reload();
  }

  return (
    <AdminPage
      title="Messages"
      description="Private messages with the mentors and mentees you are connected with. We email them when you write."
      actions={
        <Button onClick={() => void startCompose()} disabled={!approved}>
          <PenLine aria-hidden /> New Message
        </Button>
      }
    >
      <Tabs
        label="Messages"
        tabs={[
          ["in", "Inbox"],
          ["out", "Sent"],
        ]}
        value={box}
        onChange={(v) => {
          setOpenId(null);
          url.set({ box: v === "in" ? "" : v });
        }}
      />
      <Panel>
        {list.error && <ErrorNote message={list.error.message} onRetry={list.reload} />}
        {!list.data && !list.error && <Loading />}
        {list.data && list.data.items.length === 0 && <Empty title={box === "in" ? "No messages yet" : "You have not sent any messages"} text="You can write to members once a mentorship request between you is accepted." />}
        {list.data && list.data.items.length > 0 && (
          <>
            <ul className="-my-2 divide-y divide-rule">
              {list.data.items.map((m) => {
                const unread = box === "in" && !m.readAt;
                const isOpen = openId === m.id;
                return (
                  <li key={m.id} className="py-1">
                    <button type="button" aria-expanded={isOpen} onClick={() => void toggle(m)} className="flex min-h-14 w-full items-start gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-paper">
                      <span aria-hidden className={cn("mt-2 size-2 shrink-0 rounded-full", unread ? "bg-brand" : "bg-transparent")} />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <span className={cn("text-sm", unread ? "font-semibold text-ink" : "text-ink")}>
                            {box === "in" ? m.person.name : `To ${m.person.name}`}
                            {unread && <span className="sr-only"> (unread)</span>}
                          </span>
                          <span className="text-xs text-faint-ink">{fmtDate(m.createdAt, true)}</span>
                        </span>
                        <span className={cn("block truncate text-sm", unread ? "font-medium text-ink" : "text-muted-ink")}>{m.subject}</span>
                        {!isOpen && <span className="block truncate text-sm text-faint-ink">{m.body}</span>}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="mb-3 ml-7 rounded-md border border-rule bg-paper/50 p-4">
                        <p className="text-sm whitespace-pre-line text-ink">{m.body}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {box === "in" && (
                            <Button size="sm" onClick={() => void startCompose(m.person.id, m.subject)} disabled={!approved}>
                              Reply
                            </Button>
                          )}
                          {box === "in" && (
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDel(m)}>
                              <Trash2 aria-hidden /> Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <Pager page={list.data.page} pages={list.data.pages} total={list.data.total} onPage={(p) => url.set({ page: p })} />
          </>
        )}
      </Panel>

      <EditDialog open={compose} onOpenChange={setCompose} title="New Message" saving={saving} onSave={sendMessage} saveLabel="Send Message" savingLabel="Sending…">
        <fieldset>
          <legend className="text-sm font-medium text-ink">To</legend>
          {!recipients ? (
            <Loading />
          ) : recipients.length === 0 ? (
            <p className="mt-1.5 text-sm text-muted-ink">You are not connected with anyone yet. Once a mentorship request is accepted, you can write to each other here.</p>
          ) : (
            <ul className="mt-2 grid gap-1 sm:grid-cols-2" id="f-to">
              {recipients.map((r) => (
                <li key={r.id}>
                  <label className="flex min-h-11 items-center gap-2.5 rounded-md border border-rule px-3 text-sm text-ink has-[:checked]:border-brand has-[:checked]:bg-brand-wash">
                    <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={to.includes(r.id)} onChange={(e) => setTo((t) => (e.target.checked ? [...t, r.id] : t.filter((x) => x !== r.id)))} />
                    <span className="min-w-0 flex-1 truncate">{r.name}</span>
                    <span className="text-xs text-faint-ink capitalize">{r.type}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {errors.to && <p className="mt-1.5 text-sm text-destructive">{errors.to}</p>}
        </fieldset>
        <TextInput id="subject" label="Subject" value={subject} onChange={setSubject} errors={errors} placeholder="Feedback on your draft…" />
        <TextArea id="body" label="Message" value={body} onChange={setBody} errors={errors} rows={8} />
      </EditDialog>

      <Confirm
        open={!!del}
        onOpenChange={(v) => !v && setDel(null)}
        title="Delete this message?"
        description="It is removed from your inbox. The sender keeps their copy."
        confirmLabel="Delete Message"
        pendingLabel="Deleting…"
        destructive
        onConfirm={async () => {
          const res = await send(`/me/workspace/messages/${del!.id}`, "DELETE");
          toast(res.ok ? "success" : "error", res.ok ? "Message deleted." : res.message);
          if (res.ok) {
            setOpenId(null);
            void list.reload();
            refreshCounts();
          }
        }}
      />
    </AdminPage>
  );
}

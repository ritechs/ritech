"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarClock, ExternalLink, Pencil, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPage, Badge, Confirm, Empty, ErrorNote, Loading, Panel, Tabs, fmtDate, statusTone, useToast } from "@/components/admin/ui";
import { Check, FormGrid, TextArea, TextInput, focusFirstError } from "@/components/admin/form";
import { EditDialog } from "@/components/admin/views/library";
import { useMember } from "@/components/dashboard/shell";
import { send, useApi } from "@/lib/admin/use-api";
import { useUrlState } from "@/lib/admin/url-state";
import { routes } from "@/lib/site";
import { cn } from "@/lib/utils";

interface Call {
  id: string;
  title: string;
  description: string;
  deadline: string | null;
  link: string | null;
  open: boolean;
  expertiseIds: string[];
  topics: { id: string; name: string }[];
  owner: { name: string; slug: string | null };
  applications: number;
  myRequest: string | null;
}
interface Form {
  title: string;
  description: string;
  deadline: string;
  link: string;
  open: boolean;
  expertiseIds: string[];
}
const blank = (): Form => ({ title: "", description: "", deadline: "", link: "", open: true, expertiseIds: [] });

function CallCard({ c, children }: { c: Call; children: React.ReactNode }) {
  return (
    <li className="flex flex-col rounded-lg border border-rule p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-xl text-ink">{c.title}</h3>
        {!c.open && <Badge>Closed</Badge>}
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-ink">
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="size-4" aria-hidden />
          {c.deadline ? `Deadline ${fmtDate(c.deadline)}` : "No deadline"}
        </span>
        <span>
          Posted by{" "}
          {c.owner.slug ? (
            <Link href={routes.mentor(c.owner.slug)} className="text-brand underline-offset-4 hover:underline">
              {c.owner.name}
            </Link>
          ) : (
            c.owner.name
          )}
        </span>
      </p>
      {c.description && <p className="mt-3 line-clamp-4 text-sm whitespace-pre-line text-ink/85">{c.description}</p>}
      {c.topics.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {c.topics.map((t) => (
            <li key={t.id} className="rounded-full bg-paper px-2.5 py-0.5 text-xs text-muted-ink">
              {t.name}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        {c.link && (
          <Button asChild variant="ghost" size="sm">
            <a href={c.link} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden /> Details
            </a>
          </Button>
        )}
        {children}
      </div>
    </li>
  );
}

export function FundingView() {
  const { me } = useMember();
  // Mentees do not have Funding & Grants; send anyone who lands here back to the overview.
  const router = useRouter();
  const mentee = me.profile.type !== "mentor";
  useEffect(() => {
    if (mentee) router.replace("/dashboard");
  }, [mentee, router]);
  if (mentee) return null;
  return <FundingInner />;
}

function FundingInner() {
  const { me } = useMember();
  const toast = useToast();
  const url = useUrlState();
  const tab = url.get("tab") || "open";
  const calls = useApi<Call[]>(`/me/workspace/funding?scope=${tab === "mine" ? "mine" : "open"}`);
  const topics = useApi<{ id: string; name: string }[]>(tab === "mine" ? "/expertise" : null);
  const [edit, setEdit] = useState<{ id: string | null; f: Form } | null>(null);
  const [del, setDel] = useState<Call | null>(null);
  const [apply, setApply] = useState<Call | null>(null);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const approved = me.profile.status === "approved";
  const set = (patch: Partial<Form>) => setEdit((e) => (e ? { ...e, f: { ...e.f, ...patch } } : e));

  async function save() {
    if (!edit) return;
    const f = edit.f;
    const e: Record<string, string> = {};
    if (!f.title.trim()) e.title = "Enter a title, like “Fully funded PhD place in edge AI”.";
    if (f.link && !/^https?:\/\/\S+\.\S+/.test(f.link.trim())) e.link = "Enter a full web address starting with https://.";
    setErrors(e);
    if (Object.keys(e).length) return focusFirstError(e);
    setSaving(true);
    const res = await send(edit.id ? `/me/workspace/funding/${edit.id}` : "/me/workspace/funding", edit.id ? "PUT" : "POST", { ...f, deadline: f.deadline || null, link: f.link.trim() || null });
    setSaving(false);
    if (!res.ok) {
      setErrors(res.fields ?? {});
      return toast("error", res.message);
    }
    toast("success", edit.id ? "Funding call updated." : "Funding call posted.");
    setEdit(null);
    void calls.reload();
  }

  return (
    <AdminPage
      title="Funding & Grants"
      description="Scholarships, grants and funded positions shared by RiTECHS members. Apply to a call, or post one you are offering."
      actions={
        approved ? (
          <Button
            onClick={() => {
              setErrors({});
              setEdit({ id: null, f: blank() });
              if (tab !== "mine") url.set({ tab: "mine" });
            }}
          >
            <Plus aria-hidden /> Post a Call
          </Button>
        ) : undefined
      }
    >
      <Tabs
        label="Funding"
        tabs={[
          ["open", "Open Calls"],
          ["mine", "My Calls"],
        ]}
        value={tab}
        onChange={(v) => url.set({ tab: v === "open" ? "" : v })}
      />
      <Panel>
        {calls.error && <ErrorNote message={calls.error.message} onRetry={calls.reload} />}
        {!calls.data && !calls.error && <Loading />}
        {calls.data && calls.data.length === 0 && (tab === "mine" ? <Empty title="You have not posted any calls" text="Post a funding call to let mentees and other members apply." /> : <Empty title="No open calls right now" text="New calls from members will appear here." />)}
        {calls.data && calls.data.length > 0 && (
          <ul className="grid gap-4 md:grid-cols-2">
            {calls.data.map((c) => (
              <CallCard key={c.id} c={c}>
                {tab === "mine" ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setErrors({});
                        setEdit({ id: c.id, f: { title: c.title, description: c.description, deadline: c.deadline ?? "", link: c.link ?? "", open: c.open, expertiseIds: c.expertiseIds } });
                      }}
                    >
                      <Pencil aria-hidden /> Edit
                    </Button>
                    <Link href="/dashboard/requests" className="text-sm text-brand underline-offset-4 hover:underline">
                      {c.applications} {c.applications === 1 ? "application" : "applications"}
                    </Link>
                  </>
                ) : c.myRequest && c.myRequest !== "withdrawn" && c.myRequest !== "declined" ? (
                  <Badge tone={statusTone(c.myRequest)}>{c.myRequest === "pending" ? "Applied, awaiting reply" : "Application accepted"}</Badge>
                ) : (
                  <Button
                    size="sm"
                    disabled={!approved}
                    onClick={() => {
                      setNote("");
                      setErrors({});
                      setApply(c);
                    }}
                  >
                    <Send aria-hidden /> Apply
                  </Button>
                )}
              </CallCard>
            ))}
          </ul>
        )}
      </Panel>

      <EditDialog
        open={!!edit}
        onOpenChange={(v) => !v && setEdit(null)}
        title={edit?.id ? "Edit Funding Call" : "Post a Funding Call"}
        saving={saving}
        onSave={save}
        onDelete={edit?.id ? () => setDel(calls.data?.find((c) => c.id === edit.id) ?? null) : undefined}
      >
        {edit && (
          <FormGrid>
            <TextInput id="title" label="Title" value={edit.f.title} onChange={(v) => set({ title: v })} errors={errors} placeholder="Fully funded PhD place in edge AI…" className="sm:col-span-2" />
            <TextArea id="description" label="Description" value={edit.f.description} onChange={(v) => set({ description: v })} errors={errors} rows={6} hint="Who can apply, what is funded and how to apply." className="sm:col-span-2" />
            <TextInput id="deadline" label="Deadline" type="date" value={edit.f.deadline} onChange={(v) => set({ deadline: v })} errors={errors} />
            <TextInput id="link" label="More information (optional)" type="url" inputMode="url" spellCheck={false} value={edit.f.link} onChange={(v) => set({ link: v })} errors={errors} placeholder="https://…" />
            <fieldset className="sm:col-span-2">
              <legend className="text-sm font-medium text-ink">Topics</legend>
              {!topics.data ? (
                <Loading />
              ) : (
                <ul className="mt-2 flex max-h-44 flex-wrap gap-1.5 overflow-y-auto">
                  {topics.data.map((t) => {
                    const on = edit.f.expertiseIds.includes(t.id);
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          aria-pressed={on}
                          onClick={() => set({ expertiseIds: on ? edit.f.expertiseIds.filter((x) => x !== t.id) : [...edit.f.expertiseIds, t.id].slice(0, 12) })}
                          className={cn("min-h-9 rounded-full border px-3 text-sm", on ? "border-brand bg-brand-wash text-brand" : "border-rule text-ink hover:border-brand-tint")}
                        >
                          {t.name}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </fieldset>
            <div className="sm:col-span-2">
              <Check id="open" label="Open for applications" checked={edit.f.open} onChange={(v) => set({ open: v })} />
            </div>
          </FormGrid>
        )}
      </EditDialog>

      <EditDialog
        open={!!apply}
        onOpenChange={(v) => !v && setApply(null)}
        title="Apply for This Call"
        saveLabel="Send Application"
        savingLabel="Sending…"
        description={apply ? `${apply.title} — posted by ${apply.owner.name}` : undefined}
        saving={saving}
        onSave={async () => {
          if (note.trim().length < 10) {
            setErrors({ note: "Write a few lines about yourself and why you are applying." });
            return focusFirstError({ note: "x" });
          }
          setSaving(true);
          const res = await send("/me/workspace/requests", "POST", { kind: "funding", fundingId: apply!.id, message: note });
          setSaving(false);
          if (!res.ok) return toast("error", res.message);
          toast("success", "Application sent. You can follow it under Requests → Sent.");
          setApply(null);
          void calls.reload();
        }}
      >
        <TextArea id="note" label="Your message" value={note} onChange={setNote} errors={errors} rows={6} hint={`${apply?.owner.name ?? "They"} will see your name, position and organisation, and receive your email address only if they accept.`} />
      </EditDialog>

      <Confirm
        open={!!del}
        onOpenChange={(v) => !v && setDel(null)}
        title="Delete this funding call?"
        description={`“${del?.title ?? ""}” and its applications are deleted. To keep them, mark the call as closed instead.`}
        confirmLabel="Delete Call"
        pendingLabel="Deleting…"
        destructive
        onConfirm={async () => {
          const res = await send(`/me/workspace/funding/${del!.id}`, "DELETE");
          toast(res.ok ? "success" : "error", res.ok ? "Funding call deleted." : res.message);
          if (res.ok) {
            setEdit(null);
            void calls.reload();
          }
        }}
      />
    </AdminPage>
  );
}

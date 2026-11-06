"use client";

import { richToPlainText } from "@ritechs/shared";
import { useState } from "react";
import Link from "next/link";
import { Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AdminPage, Badge, ErrorNote, Loading, Panel, fmtDate, useToast } from "@/components/admin/ui";
import { RichTextArea, TextInput, focusFirstError } from "@/components/admin/form";
import { Avatar, isMentor, useMember } from "@/components/dashboard/shell";
import { send, useApi } from "@/lib/admin/use-api";
import { routes } from "@/lib/site";

interface Sent {
  id: string;
  subject: string;
  message: string;
  status: "new" | "read" | "archived";
  createdAt: string;
}
interface Person {
  id: string;
  name: string;
  email: string | null;
  position: string | null;
  affiliation: string | null;
  photoUrl: string | null;
}
const STATUS: Record<Sent["status"], { text: string; tone: "brand" | "success" | "neutral" }> = {
  new: { text: "Sent", tone: "brand" },
  read: { text: "Read by the team", tone: "success" },
  archived: { text: "Closed", tone: "neutral" },
};

export function MailView() {
  const { me } = useMember();
  const toast = useToast();
  const mentor = isMentor(me);
  const history = useApi<Sent[]>("/me/workspace/support");
  const people = useApi<{ connected: Person[] }>("/me/workspace/connections");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!subject.trim()) errs.subject = "Add a subject, like “Question about my membership”.";
    if (richToPlainText(message).length < 10) errs.message = "Write at least a sentence so the team can help.";
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirstError(errs);
    setSending(true);
    const res = await send("/me/workspace/support", "POST", { subject, message });
    setSending(false);
    if (!res.ok) return toast("error", res.message);
    toast("success", "Sent. The RiTECHS team will reply to your email address.");
    setSubject("");
    setMessage("");
    void history.reload();
  }

  const contacts = (people.data?.connected ?? []).filter((p) => p.email);
  const label = mentor ? "Mentees" : "Mentors";

  return (
    <AdminPage title={mentor ? "Mail RiTECHS" : "Mail"} description={`Write to the RiTECHS team, or email your ${label.toLowerCase()} directly from your own mail app.`}>
      <div className="grid items-start gap-6 lg:grid-cols-5">
        <Panel title="Write to the RiTECHS Team" className="lg:col-span-3">
          <form noValidate onSubmit={submit} className="space-y-5">
            <p className="text-sm text-muted-ink">
              We reply to <span className="font-medium text-ink">{me.user.email}</span>, usually within two working days.
            </p>
            <TextInput id="subject" label="Subject" value={subject} onChange={setSubject} errors={errors} placeholder="Question about finding a mentor…" />
            <RichTextArea id="message" label="Message" value={message} onChange={setMessage} errors={errors} rows={7} max={5000} />
            <Button type="submit" disabled={sending}>
              {sending ? <Spinner /> : <Send aria-hidden />}
              {sending ? "Sending…" : "Send to RiTECHS"}
            </Button>
          </form>
        </Panel>

        <Panel title={`Email My ${label}`} className="lg:col-span-2">
          {people.error && <ErrorNote message={people.error.message} onRetry={people.reload} />}
          {!people.data && !people.error && <Loading />}
          {people.data && contacts.length === 0 && (
            <div className="text-sm text-muted-ink">
              <p>{mentor ? "When you accept a mentee, their email address appears here." : "When a mentor accepts your request, their email address appears here."}</p>
              {!mentor && (
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link href={routes.mentorship}>Find a Mentor</Link>
                </Button>
              )}
            </div>
          )}
          {contacts.length > 0 && (
            <>
              <ul className="-my-2 divide-y divide-rule">
                {contacts.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-3">
                    <Avatar name={p.name} src={p.photoUrl} className="size-10 text-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                      <p className="truncate text-xs text-muted-ink">{p.email}</p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <a href={`mailto:${p.email}`} aria-label={`Email ${p.name}`}>
                        <Mail aria-hidden /> Email
                      </a>
                    </Button>
                  </li>
                ))}
              </ul>
              {contacts.length > 1 && (
                <Button asChild variant="ghost" size="sm" className="mt-3">
                  <a href={`mailto:?bcc=${contacts.map((p) => p.email).join(",")}`}>Email all {contacts.length} (as BCC)</a>
                </Button>
              )}
              <p className="mt-3 text-xs text-faint-ink">
                Prefer to keep it on RiTECHS?{" "}
                <Link href="/dashboard/messages" className="text-brand underline-offset-4 hover:underline">
                  Use Messages
                </Link>
                .
              </p>
            </>
          )}
        </Panel>
      </div>

      <Panel title="Sent to RiTECHS">
        {history.error && <ErrorNote message={history.error.message} onRetry={history.reload} />}
        {!history.data && !history.error && <Loading />}
        {history.data && history.data.length === 0 && <p className="text-sm text-muted-ink">You have not written to the team yet.</p>}
        {history.data && history.data.length > 0 && (
          <ul className="-my-2 divide-y divide-rule">
            {history.data.map((m) => (
              <li key={m.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 font-medium text-ink">{m.subject.replace(/^\[(Mentor|Mentee)\] /, "")}</p>
                  <span className="flex items-center gap-2">
                    <Badge tone={STATUS[m.status].tone}>{STATUS[m.status].text}</Badge>
                    <span className="text-xs text-faint-ink">{fmtDate(m.createdAt)}</span>
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-ink">{richToPlainText(m.message)}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </AdminPage>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { AdminPage, ErrorNote, Loading, Panel, useToast } from "@/components/admin/ui";
import { isMentor, useMember } from "@/components/dashboard/shell";
import { send, useApi } from "@/lib/admin/use-api";
import { cn } from "@/lib/utils";

const MAX = 12;

export function ExpertiseView() {
  const { me, refresh } = useMember();
  const toast = useToast();
  const topics = useApi<{ id: string; name: string }[]>("/expertise");
  const [picked, setPicked] = useState<Set<string>>(() => new Set(me.profile.expertise.map((e) => e.id)));
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const dirty = useMemo(() => {
    const before = new Set(me.profile.expertise.map((e) => e.id));
    return before.size !== picked.size || [...picked].some((id) => !before.has(id));
  }, [picked, me.profile.expertise]);

  const list = (topics.data ?? []).filter((t) => t.name.toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else if (n.size >= MAX) toast("error", `You can choose up to ${MAX} areas. Remove one first.`);
      else n.add(id);
      return n;
    });

  async function save() {
    setSaving(true);
    const res = await send("/me/profile", "PATCH", { expertiseIds: [...picked] });
    setSaving(false);
    if (!res.ok) return toast("error", res.message);
    toast("success", "Expertise saved.");
    await refresh();
  }

  const names = new Map((topics.data ?? []).map((t) => [t.id, t.name]));
  return (
    <AdminPage
      title="Expertise"
      description={isMentor(me) ? "Choose the areas you can mentor in. Mentees search the directory by these, and we suggest similar members from them." : "Choose the areas you are interested in. We use them to suggest mentors for you."}
    >
      <Panel title={`Your Areas (${picked.size} of ${MAX})`}>
        {picked.size === 0 ? (
          <p className="text-sm text-muted-ink">Nothing chosen yet. Pick from the list below.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {[...picked].map((id) => (
              <li key={id}>
                <button type="button" onClick={() => toggle(id)} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-brand bg-brand px-3.5 text-sm text-white transition-colors hover:bg-brand-deep md:min-h-9" aria-label={`Remove ${names.get(id) ?? "topic"}`}>
                  {names.get(id) ?? me.profile.expertise.find((e) => e.id === id)?.name ?? "…"}
                  <span aria-hidden>×</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={save} disabled={saving || !dirty}>
            {saving && <Spinner />}
            {saving ? "Saving…" : "Save Expertise"}
          </Button>
          {dirty && <span className="text-sm text-warning">You have unsaved changes.</span>}
        </div>
      </Panel>

      <Panel
        title="All Topics"
        actions={
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint-ink" aria-hidden />
            <label htmlFor="topic-search" className="sr-only">
              Search topics
            </label>
            <Input id="topic-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search topics, e.g. Machine learning…" className="pl-9" />
          </div>
        }
      >
        {topics.error && <ErrorNote message={topics.error.message} onRetry={topics.reload} />}
        {!topics.data && !topics.error && <Loading />}
        {topics.data && (
          <>
            {list.length === 0 && <p className="text-sm text-muted-ink">No topics match “{q}”. Ask info@ritechs.org to add a new topic.</p>}
            <ul className="flex flex-wrap gap-2">
              {list.map((t) => {
                const on = picked.has(t.id);
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(t.id)}
                      className={cn(
                        "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand md:min-h-9",
                        on ? "border-brand bg-brand-wash text-brand" : "border-rule bg-surface text-ink hover:border-brand-tint",
                      )}
                    >
                      {on && <Check className="size-3.5" aria-hidden />}
                      {t.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Panel>
    </AdminPage>
  );
}

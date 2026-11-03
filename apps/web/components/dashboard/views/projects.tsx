"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPage, Confirm, Empty, Panel, useToast } from "@/components/admin/ui";
import { FormGrid, TextInput, focusFirstError } from "@/components/admin/form";
import { EditDialog } from "@/components/admin/views/library";
import { useMember, type MemberProfile } from "@/components/dashboard/shell";
import { send } from "@/lib/admin/use-api";

type Project = MemberProfile["projects"][number];
const blank = (): Required<Project> => ({ title: "", topic: "", collaborators: "", year: String(new Date().getFullYear()) });

export function ProjectsView() {
  const { me, refresh } = useMember();
  const toast = useToast();
  const projects = me.profile.projects ?? [];
  const [edit, setEdit] = useState<{ index: number | null; f: Required<Project> } | null>(null);
  const [del, setDel] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function persist(next: Project[], ok: string) {
    const res = await send("/me/workspace/projects", "PUT", { projects: next });
    if (!res.ok) {
      toast("error", res.message);
      return false;
    }
    toast("success", ok);
    await refresh();
    return true;
  }

  async function save() {
    if (!edit) return;
    const e: Record<string, string> = {};
    if (!edit.f.title.trim()) e.title = "Enter the project title.";
    if (edit.f.year && !/^(19|20)\d{2}$/.test(edit.f.year)) e.year = "Enter a year like 2024.";
    setErrors(e);
    if (Object.keys(e).length) return focusFirstError(e);
    setSaving(true);
    const next = [...projects];
    if (edit.index === null) next.unshift(edit.f);
    else next[edit.index] = edit.f;
    const ok = await persist(next, edit.index === null ? "Project added." : "Project updated.");
    setSaving(false);
    if (ok) setEdit(null);
  }

  return (
    <AdminPage
      title="Research Projects"
      description={me.profile.type === "mentor" ? "Projects you lead or contribute to. They appear on your public profile, newest first." : "Your research or study projects. Mentors see them when you send a mentorship request."}
      actions={
        <Button
          onClick={() => {
            setErrors({});
            setEdit({ index: null, f: blank() });
          }}
        >
          <Plus aria-hidden /> Add Project
        </Button>
      }
    >
      <Panel>
        {projects.length === 0 ? (
          <Empty title="No projects yet" text="Add the research projects you are working on, with collaborators and the year they started." />
        ) : (
          <ul className="-my-2 divide-y divide-rule">
            {projects.map((x, i) => (
              <li key={`${x.title}-${i}`} className="flex items-start gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{x.title}</p>
                  <p className="mt-1 text-sm text-muted-ink">{[x.topic, x.collaborators && `with ${x.collaborators}`, x.year].filter(Boolean).join(" · ") || "No details"}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${x.title}`}
                  onClick={() => {
                    setErrors({});
                    setEdit({ index: i, f: { ...blank(), year: "", ...x } as Required<Project> });
                  }}
                >
                  <Pencil aria-hidden />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive" aria-label={`Delete ${x.title}`} onClick={() => setDel(i)}>
                  <Trash2 aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <EditDialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)} title={edit?.index === null ? "Add Project" : "Edit Project"} saving={saving} onSave={save}>
        {edit && (
          <FormGrid>
            <TextInput id="title" label="Project title" value={edit.f.title} onChange={(v) => setEdit({ ...edit, f: { ...edit.f, title: v } })} errors={errors} placeholder="Low-power sensing for smart farms…" className="sm:col-span-2" />
            <TextInput id="topic" label="Topic" value={edit.f.topic} onChange={(v) => setEdit({ ...edit, f: { ...edit.f, topic: v } })} errors={errors} placeholder="Internet of Things…" />
            <TextInput id="year" label="Year" value={edit.f.year} onChange={(v) => setEdit({ ...edit, f: { ...edit.f, year: v.replace(/\D/g, "").slice(0, 4) } })} errors={errors} inputMode="numeric" placeholder="2024…" />
            <TextInput id="collaborators" label="Collaborators" value={edit.f.collaborators} onChange={(v) => setEdit({ ...edit, f: { ...edit.f, collaborators: v } })} errors={errors} placeholder="Dr. A. Taufiq Asyhari, Md Arafatur Rahman…" hint="Names separated by commas." className="sm:col-span-2" />
          </FormGrid>
        )}
      </EditDialog>

      <Confirm
        open={del !== null}
        onOpenChange={(v) => !v && setDel(null)}
        title="Delete this project?"
        description={`“${del !== null ? projects[del]?.title : ""}” is removed from your profile.`}
        confirmLabel="Delete Project"
        pendingLabel="Deleting…"
        destructive
        onConfirm={async () => {
          await persist(
            projects.filter((_, i) => i !== del),
            "Project deleted.",
          );
        }}
      />
    </AdminPage>
  );
}

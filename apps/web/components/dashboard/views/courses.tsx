"use client";

import { richToPlainText } from "@ritechs/shared";
import { useState } from "react";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPage, Badge, Confirm, Empty, ErrorNote, Loading, Panel, useToast } from "@/components/admin/ui";
import { Check, FormGrid, RichTextArea, Select, TextInput, focusFirstError } from "@/components/admin/form";
import { EditDialog } from "@/components/admin/views/library";
import { send, useApi } from "@/lib/admin/use-api";

interface Course {
  id: string;
  title: string;
  description: string;
  duration: number | null;
  durationUnit: "hour" | "day" | "week" | "month";
  fee: string | null;
  currency: string;
  active: boolean;
  requests: number;
}
interface Form {
  title: string;
  description: string;
  duration: string;
  durationUnit: Course["durationUnit"];
  fee: string;
  currency: string;
  active: boolean;
}

const UNITS: [Course["durationUnit"], string][] = [
  ["hour", "Hours"],
  ["day", "Days"],
  ["week", "Weeks"],
  ["month", "Months"],
];
export const CURRENCIES: [string, string][] = ["GBP", "USD", "EUR", "BDT", "MYR", "INR", "AUD", "CAD"].map((c) => [c, c]);

export const courseLength = (c: { duration: number | null; durationUnit: string }) => (c.duration ? `${c.duration} ${c.durationUnit}${c.duration === 1 ? "" : "s"}` : null);
export const courseFee = (c: { fee: string | null; currency: string }) => (c.fee && Number(c.fee) > 0 ? new Intl.NumberFormat("en-GB", { style: "currency", currency: c.currency, maximumFractionDigits: 2 }).format(Number(c.fee)) : "Free");

const blank = (): Form => ({ title: "", description: "", duration: "", durationUnit: "week", fee: "", currency: "GBP", active: true });

export function CoursesView() {
  const toast = useToast();
  const list = useApi<Course[]>("/me/workspace/courses");
  const [edit, setEdit] = useState<{ id: string | null; f: Form } | null>(null);
  const [del, setDel] = useState<Course | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<Form>) => setEdit((e) => (e ? { ...e, f: { ...e.f, ...patch } } : e));

  async function save() {
    if (!edit) return;
    const f = edit.f;
    const e: Record<string, string> = {};
    if (!f.title.trim()) e.title = "Enter the course title.";
    if (f.duration && !/^\d{1,4}$/.test(f.duration)) e.duration = "Enter a whole number, like 4.";
    if (f.fee && !/^\d+(\.\d{1,2})?$/.test(f.fee)) e.fee = "Enter an amount like 150 or 49.99, or leave empty for free.";
    setErrors(e);
    if (Object.keys(e).length) return focusFirstError(e);
    setSaving(true);
    const body = { title: f.title, description: f.description, duration: f.duration ? Number(f.duration) : null, durationUnit: f.durationUnit, fee: f.fee ? Number(f.fee) : null, currency: f.currency, active: f.active };
    const res = await send(edit.id ? `/me/workspace/courses/${edit.id}` : "/me/workspace/courses", edit.id ? "PUT" : "POST", body);
    setSaving(false);
    if (!res.ok) {
      setErrors(res.fields ?? {});
      return toast("error", res.message);
    }
    toast("success", edit.id ? "Course updated." : "Course added.");
    setEdit(null);
    void list.reload();
  }

  return (
    <AdminPage
      title="My Courses"
      description="Short courses or training you offer. Mentees can ask to join from your public profile; their requests arrive under Requests."
      actions={
        <Button
          onClick={() => {
            setErrors({});
            setEdit({ id: null, f: blank() });
          }}
        >
          <Plus aria-hidden /> Add Course
        </Button>
      }
    >
      <Panel>
        {list.error && <ErrorNote message={list.error.message} onRetry={list.reload} />}
        {!list.data && !list.error && <Loading />}
        {list.data && list.data.length === 0 && <Empty title="No courses yet" text="Add a course, for example “Stepping into research: reference managers”, with its length and fee." />}
        {list.data && list.data.length > 0 && (
          <ul className="grid gap-4 md:grid-cols-2">
            {list.data.map((c) => (
              <li key={c.id} className="flex flex-col rounded-lg border border-rule p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-serif text-xl text-ink">{c.title}</h3>
                  <Badge tone={c.active ? "success" : "neutral"}>{c.active ? "Open" : "Hidden"}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-ink">{[courseLength(c), courseFee(c)].filter(Boolean).join(" · ")}</p>
                {c.description && <p className="mt-3 line-clamp-3 text-sm text-ink/85">{richToPlainText(c.description)}</p>}
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setErrors({});
                      setEdit({ id: c.id, f: { title: c.title, description: c.description, duration: c.duration ? String(c.duration) : "", durationUnit: c.durationUnit, fee: c.fee && Number(c.fee) > 0 ? String(Number(c.fee)) : "", currency: c.currency, active: c.active } });
                    }}
                  >
                    <Pencil aria-hidden /> Edit
                  </Button>
                  {c.requests > 0 && (
                    <Link href="/dashboard/requests" className="text-sm text-brand underline-offset-4 hover:underline">
                      {c.requests} {c.requests === 1 ? "request" : "requests"}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <EditDialog
        open={!!edit}
        onOpenChange={(v) => !v && setEdit(null)}
        title={edit?.id ? "Edit Course" : "Add Course"}
        saving={saving}
        onSave={save}
        onDelete={
          edit?.id
            ? () => {
                setDel(list.data!.find((c) => c.id === edit.id) ?? null);
              }
            : undefined
        }
      >
        {edit && (
          <FormGrid>
            <TextInput id="title" label="Course title" value={edit.f.title} onChange={(v) => set({ title: v })} errors={errors} placeholder="Stepping into research: reference managers…" className="sm:col-span-2" />
            <RichTextArea id="description" label="What participants will learn" value={edit.f.description} onChange={(v) => set({ description: v })} errors={errors} rows={5} max={3000} className="sm:col-span-2" />
            <TextInput id="duration" label="Length" value={edit.f.duration} onChange={(v) => set({ duration: v.replace(/\D/g, "") })} errors={errors} inputMode="numeric" placeholder="4…" />
            <Select id="durationUnit" label="Unit" value={edit.f.durationUnit} onChange={(v) => set({ durationUnit: v as Form["durationUnit"] })} options={UNITS} errors={errors} />
            <TextInput id="fee" label="Fee" value={edit.f.fee} onChange={(v) => set({ fee: v.replace(/[^\d.]/g, "") })} errors={errors} inputMode="decimal" placeholder="Leave empty if free…" />
            <Select id="currency" label="Currency" value={edit.f.currency} onChange={(v) => set({ currency: v })} options={CURRENCIES} errors={errors} />
            <div className="sm:col-span-2">
              <Check id="active" label="Show this course on my public profile" checked={edit.f.active} onChange={(v) => set({ active: v })} />
            </div>
          </FormGrid>
        )}
      </EditDialog>

      <Confirm
        open={!!del}
        onOpenChange={(v) => !v && setDel(null)}
        title="Delete this course?"
        description={`“${del?.title ?? ""}” and the requests to join it are deleted. To keep them, hide the course instead.`}
        confirmLabel="Delete Course"
        pendingLabel="Deleting…"
        destructive
        onConfirm={async () => {
          const res = await send(`/me/workspace/courses/${del!.id}`, "DELETE");
          toast(res.ok ? "success" : "error", res.ok ? "Course deleted." : res.message);
          if (res.ok) {
            setEdit(null);
            void list.reload();
          }
        }}
      />
    </AdminPage>
  );
}

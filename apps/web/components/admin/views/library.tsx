"use client";

import { useState, useTransition } from "react";
import { Check as CheckIcon, Globe, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AdminPage, Badge, Confirm, DataTable, Empty, ErrorNote, Loading, Pager, Panel, Tabs, useToast } from "@/components/admin/ui";
import { Check, FormGrid, TextArea, TextInput, focusFirstError } from "@/components/admin/form";
import { ImageField, SearchBox, Thumb } from "@/components/admin/media";
import { useAdmin } from "@/components/admin/shell";
import { qs, send, useApi, type Paged } from "@/lib/admin/use-api";
import { useUrlState } from "@/lib/admin/url-state";

type Errors = Record<string, string>;
const orNull = (v: string) => (v.trim() ? v.trim() : null);

/** A dialog holding a record's form, with Save and (for existing records) Delete. */
export function EditDialog({
  open,
  onOpenChange,
  title,
  description,
  saving,
  onSave,
  onDelete,
  children,
  saveLabel = "Save",
  savingLabel = "Saving…",
}: {
  saveLabel?: string;
  savingLabel?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  saving: boolean;
  onSave: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent className="sm:w-[min(48rem,calc(100vw-3rem))]">
        <div className="border-b border-rule px-5 pt-5 pb-4 pr-16 sm:px-7 sm:pt-6">
          <DialogTitle className="font-serif text-2xl text-ink">{title}</DialogTitle>
          {description && <DialogDescription className="mt-1 text-sm text-muted-ink">{description}</DialogDescription>}
        </div>
        <form
          noValidate
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">{children}</div>
          <div className="flex flex-col-reverse gap-2 border-t border-rule bg-surface px-5 py-4 sm:flex-row sm:items-center sm:px-7">
            {onDelete && (
              <Button type="button" variant="ghost" className="text-destructive sm:mr-auto" disabled={saving} onClick={onDelete}>
                <Trash2 aria-hidden /> Delete
              </Button>
            )}
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)} className="sm:ml-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Spinner />}
              {saving ? savingLabel : saveLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------- speakers -------------------------------- */

interface Speaker {
  id: string;
  name: string;
  designation: string | null;
  organisation: string | null;
  bio: string | null;
  website: string | null;
  photoUrl: string | null;
  conferences: number;
}
interface SpeakerForm {
  name: string;
  designation: string;
  organisation: string;
  bio: string;
  website: string;
  photo: { id: string | null; url: string | null; changed: boolean };
}

export function SpeakersView() {
  const me = useAdmin();
  const url = useUrlState();
  const toast = useToast();
  const list = useApi<Paged<Speaker>>(`/admin/speakers${qs({ q: url.get("q"), page: url.page, pageSize: 25 })}`);
  const [edit, setEdit] = useState<{
    id: string | null;
    form: SpeakerForm;
  } | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [del, setDel] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const open = (s?: Speaker) => {
    setErrors({});
    setEdit({
      id: s?.id ?? null,
      form: {
        name: s?.name ?? "",
        designation: s?.designation ?? "",
        organisation: s?.organisation ?? "",
        bio: s?.bio ?? "",
        website: s?.website ?? "",
        photo: { id: null, url: s?.photoUrl ?? null, changed: false },
      },
    });
  };

  function save() {
    if (!edit) return;
    const f = edit.form;
    startSaving(async () => {
      const res = await send(edit.id ? `/admin/speakers/${edit.id}` : "/admin/speakers", edit.id ? "PUT" : "POST", {
        name: f.name.trim(),
        designation: orNull(f.designation),
        organisation: orNull(f.organisation),
        bio: orNull(f.bio),
        website: orNull(f.website),
        ...(f.photo.changed ? { photoId: f.photo.id } : {}),
      });
      if (!res.ok) {
        setErrors(res.fields ?? {});
        focusFirstError(res.fields ?? {});
        if (!res.fields) toast("error", res.message);
        return;
      }
      toast("success", edit.id ? "Speaker updated." : "Speaker added.");
      setEdit(null);
      void list.reload();
    });
  }

  const set = (patch: Partial<SpeakerForm>) => edit && setEdit({ ...edit, form: { ...edit.form, ...patch } });

  return (
    <AdminPage
      title="Speakers"
      description="Keynote speakers and guests, chosen on each conference and event."
      actions={
        <Button onClick={() => open()}>
          <Plus aria-hidden /> Add Speaker
        </Button>
      }
    >
      <Panel actions={<SearchBox value={url.get("q")} onChange={(q) => url.set({ q })} placeholder="Name or organisation, e.g. Genoa…" label="Search speakers" />}>
        {list.error && <ErrorNote message={list.error.message} onRetry={list.reload} />}
        {list.loading && !list.data && <Loading />}
        {list.data && list.data.items.length === 0 && <Empty title={url.get("q") ? "No speakers match" : "No speakers yet"} />}
        {list.data && list.data.items.length > 0 && (
          <>
            <DataTable
              caption="Speakers"
              rows={list.data.items}
              rowKey={(r) => r.id}
              columns={[
                {
                  key: "name",
                  header: "Speaker",
                  cell: (r) => (
                    <span className="flex items-center gap-3">
                      <Thumb src={r.photoUrl} name={r.name} />
                      <span className="min-w-0">
                        <span className="block font-medium text-ink">{r.name}</span>
                        <span className="block text-xs text-muted-ink">{r.designation ?? "—"}</span>
                      </span>
                    </span>
                  ),
                },
                {
                  key: "org",
                  header: "Organisation",
                  cell: (r) => r.organisation ?? "—",
                  hideBelow: "md",
                },
                {
                  key: "conf",
                  header: "Conferences",
                  cell: (r) => <span className="numerals-tabular">{r.conferences}</span>,
                  hideBelow: "sm",
                },
                {
                  key: "edit",
                  header: "",
                  className: "text-right",
                  cell: (r) => (
                    <Button variant="ghost" size="sm" onClick={() => open(r)} aria-label={`Edit ${r.name}`}>
                      <Pencil aria-hidden /> Edit
                    </Button>
                  ),
                },
              ]}
            />
            <Pager page={list.data.page} pages={list.data.pages} total={list.data.total} onPage={(p) => url.set({ page: p })} />
          </>
        )}
      </Panel>

      {edit && (
        <EditDialog
          open
          onOpenChange={(v) => !v && setEdit(null)}
          title={edit.id ? "Edit Speaker" : "Add Speaker"}
          saving={saving}
          onSave={save}
          onDelete={edit.id && me.role === "admin" ? () => setDel(edit.id) : undefined}
        >
          <ImageField
            label="Photo"
            purpose="avatar"
            url={edit.form.photo.url}
            name={edit.form.name}
            onChange={(v) => set({ photo: { ...v, changed: true } })}
            hint="A square portrait works best. JPG, PNG or WebP up to 5 MB."
          />
          <FormGrid>
            <TextInput
              id="name"
              label="Name"
              value={edit.form.name}
              onChange={(v) => set({ name: v })}
              errors={errors}
              autoComplete="off"
              placeholder="e.g. Prof. Mario Marchese…"
              className="sm:col-span-2"
            />
            <TextInput id="designation" label="Position" value={edit.form.designation} onChange={(v) => set({ designation: v })} errors={errors} placeholder="e.g. Professor…" />
            <TextInput
              id="organisation"
              label="Organisation"
              value={edit.form.organisation}
              onChange={(v) => set({ organisation: v })}
              errors={errors}
              placeholder="e.g. University of Genoa…"
            />
            <TextInput
              id="website"
              label="Website (optional)"
              type="url"
              value={edit.form.website}
              onChange={(v) => set({ website: v })}
              errors={errors}
              placeholder="https://…"
              className="sm:col-span-2"
            />
          </FormGrid>
          <TextArea id="bio" label="Short biography (optional)" value={edit.form.bio} onChange={(v) => set({ bio: v })} errors={errors} rows={4} />
        </EditDialog>
      )}
      <Confirm
        open={!!del}
        onOpenChange={(v) => !v && setDel(null)}
        title="Delete this speaker?"
        description="They are removed from every conference and event that lists them. This cannot be undone."
        confirmLabel="Delete Speaker"
        pendingLabel="Deleting…"
        destructive
        onConfirm={async () => {
          const res = await send(`/admin/speakers/${del}`, "DELETE");
          if (!res.ok) return void toast("error", res.message);
          toast("success", "Speaker deleted.");
          setEdit(null);
          void list.reload();
        }}
      />
    </AdminPage>
  );
}

/* ------------------------- sponsors and partners ------------------------- */

interface Org {
  id: string;
  name: string;
  acronym: string | null;
  website: string | null;
  city: string | null;
  country: string | null;
  isPartner: boolean;
  partnerOrder: number;
  active: boolean;
  logoUrl: string | null;
  conferences: number;
}
interface OrgForm {
  name: string;
  acronym: string;
  website: string;
  city: string;
  country: string;
  isPartner: boolean;
  partnerOrder: string;
  active: boolean;
  logo: { id: string | null; url: string | null; changed: boolean };
}

export function OrganisationsView() {
  const me = useAdmin();
  const url = useUrlState();
  const toast = useToast();
  const list = useApi<Paged<Org>>(`/admin/organisations${qs({ q: url.get("q"), page: url.page, pageSize: 25 })}`);
  const [edit, setEdit] = useState<{ id: string | null; form: OrgForm } | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [del, setDel] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const open = (o?: Org) => {
    setErrors({});
    setEdit({
      id: o?.id ?? null,
      form: {
        name: o?.name ?? "",
        acronym: o?.acronym ?? "",
        website: o?.website ?? "",
        city: o?.city ?? "",
        country: o?.country ?? "",
        isPartner: o?.isPartner ?? false,
        partnerOrder: String(o?.partnerOrder ?? 0),
        active: o?.active ?? true,
        logo: { id: null, url: o?.logoUrl ?? null, changed: false },
      },
    });
  };
  const set = (patch: Partial<OrgForm>) => edit && setEdit({ ...edit, form: { ...edit.form, ...patch } });

  function save() {
    if (!edit) return;
    const f = edit.form;
    startSaving(async () => {
      const res = await send(edit.id ? `/admin/organisations/${edit.id}` : "/admin/organisations", edit.id ? "PUT" : "POST", {
        name: f.name.trim(),
        acronym: orNull(f.acronym),
        website: orNull(f.website),
        city: orNull(f.city),
        country: orNull(f.country.toUpperCase()),
        isPartner: f.isPartner,
        partnerOrder: Number(f.partnerOrder) || 0,
        active: f.active,
        ...(f.logo.changed ? { logoId: f.logo.id } : {}),
      });
      if (!res.ok) {
        setErrors(res.fields ?? {});
        focusFirstError(res.fields ?? {});
        if (!res.fields) toast("error", res.message);
        return;
      }
      toast("success", edit.id ? "Organisation updated." : "Organisation added.");
      setEdit(null);
      void list.reload();
    });
  }

  return (
    <AdminPage
      title="Sponsors & Partners"
      description="Universities, publishers and companies. Partners appear in the homepage strip; sponsors are chosen on each conference."
      actions={
        <Button onClick={() => open()}>
          <Plus aria-hidden /> Add Organisation
        </Button>
      }
    >
      <Panel actions={<SearchBox value={url.get("q")} onChange={(q) => url.set({ q })} placeholder="Name or acronym, e.g. IEEE…" label="Search organisations" />}>
        {list.error && <ErrorNote message={list.error.message} onRetry={list.reload} />}
        {list.loading && !list.data && <Loading />}
        {list.data && list.data.items.length === 0 && <Empty title={url.get("q") ? "No organisations match" : "No organisations yet"} />}
        {list.data && list.data.items.length > 0 && (
          <>
            <DataTable
              caption="Sponsors and partners"
              rows={list.data.items}
              rowKey={(r) => r.id}
              columns={[
                {
                  key: "name",
                  header: "Organisation",
                  cell: (r) => (
                    <span className="flex items-center gap-3">
                      <Thumb src={r.logoUrl} name={r.acronym ?? r.name} fit="contain" />
                      <span className="min-w-0">
                        <span className="block font-medium text-ink">{r.name}</span>
                        {r.website && (
                          <a href={r.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-ink hover:text-brand">
                            <Globe className="size-3" aria-hidden /> {new URL(r.website).hostname.replace(/^www\./, "")}
                          </a>
                        )}
                      </span>
                    </span>
                  ),
                },
                {
                  key: "partner",
                  header: "Homepage partner",
                  cell: (r) =>
                    r.isPartner ? (
                      <Badge tone="brand">
                        <Star className="mr-1 size-3" aria-hidden />
                        Partner
                      </Badge>
                    ) : (
                      <span className="text-faint-ink">—</span>
                    ),
                  hideBelow: "sm",
                },
                {
                  key: "conf",
                  header: "Sponsored",
                  cell: (r) => <span className="numerals-tabular">{r.conferences} conf.</span>,
                  hideBelow: "md",
                },
                {
                  key: "active",
                  header: "Status",
                  cell: (r) => (r.active ? <Badge tone="success">Active</Badge> : <Badge>Hidden</Badge>),
                  hideBelow: "md",
                },
                {
                  key: "edit",
                  header: "",
                  className: "text-right",
                  cell: (r) => (
                    <Button variant="ghost" size="sm" onClick={() => open(r)} aria-label={`Edit ${r.name}`}>
                      <Pencil aria-hidden /> Edit
                    </Button>
                  ),
                },
              ]}
            />
            <Pager page={list.data.page} pages={list.data.pages} total={list.data.total} onPage={(p) => url.set({ page: p })} />
          </>
        )}
      </Panel>

      {edit && (
        <EditDialog
          open
          onOpenChange={(v) => !v && setEdit(null)}
          title={edit.id ? "Edit Organisation" : "Add Organisation"}
          saving={saving}
          onSave={save}
          onDelete={edit.id && me.role === "admin" ? () => setDel(edit.id) : undefined}
        >
          <ImageField
            label="Logo"
            purpose="logo"
            fit="contain"
            url={edit.form.logo.url}
            name={edit.form.acronym || edit.form.name}
            onChange={(v) => set({ logo: { ...v, changed: true } })}
            hint="A logo on a transparent or white background. PNG or WebP."
          />
          <FormGrid>
            <TextInput
              id="name"
              label="Name"
              value={edit.form.name}
              onChange={(v) => set({ name: v })}
              errors={errors}
              autoComplete="organization"
              placeholder="e.g. University of Wolverhampton…"
              className="sm:col-span-2"
            />
            <TextInput id="acronym" label="Short name (optional)" value={edit.form.acronym} onChange={(v) => set({ acronym: v })} errors={errors} placeholder="e.g. UoW…" />
            <TextInput id="website" label="Website (optional)" type="url" value={edit.form.website} onChange={(v) => set({ website: v })} errors={errors} placeholder="https://…" />
            <TextInput
              id="city"
              label="City (optional)"
              value={edit.form.city}
              onChange={(v) => set({ city: v })}
              errors={errors}
              autoComplete="address-level2"
              placeholder="e.g. Leeds…"
            />
            <TextInput
              id="country"
              label="Country code (optional)"
              value={edit.form.country}
              onChange={(v) => set({ country: v.toUpperCase().slice(0, 2) })}
              errors={errors}
              hint="Two letters, e.g. GB, BD, MY."
              placeholder="GB…"
            />
          </FormGrid>
          <div className="grid gap-3 rounded-lg border border-rule bg-paper p-4 sm:grid-cols-2">
            <Check id="isPartner" label="Show in the homepage partner strip" checked={edit.form.isPartner} onChange={(v) => set({ isPartner: v })} />
            <Check id="active" label="Active (visible on the website)" checked={edit.form.active} onChange={(v) => set({ active: v })} />
            {edit.form.isPartner && (
              <TextInput
                id="partnerOrder"
                label="Position in the strip"
                inputMode="numeric"
                value={edit.form.partnerOrder}
                onChange={(v) => set({ partnerOrder: v.replace(/\D/g, "") })}
                errors={errors}
                hint="Lower numbers come first."
              />
            )}
          </div>
        </EditDialog>
      )}
      <Confirm
        open={!!del}
        onOpenChange={(v) => !v && setDel(null)}
        title="Delete this organisation?"
        description="It is removed from the partner strip and from every conference it sponsored. To keep it on past conferences, untick Active instead."
        confirmLabel="Delete Organisation"
        pendingLabel="Deleting…"
        destructive
        onConfirm={async () => {
          const res = await send(`/admin/organisations/${del}`, "DELETE");
          if (!res.ok) return void toast("error", res.message);
          toast("success", "Organisation deleted.");
          setEdit(null);
          void list.reload();
        }}
      />
    </AdminPage>
  );
}

/* ------------------------- inline lists (shared) ------------------------- */

interface InlineRow {
  id: string;
  name: string;
  active: boolean;
  extra?: React.ReactNode;
}

/** A short list edited in place: add at the top, rename, hide or delete each row. */
function InlineList({
  rows,
  noun,
  placeholder,
  onAdd,
  onSave,
  onDelete,
  canDelete,
  deleteNote,
}: {
  rows: InlineRow[];
  noun: string;
  placeholder: string;
  onAdd: (name: string) => Promise<string | null>;
  onSave: (row: InlineRow, patch: { name?: string; active?: boolean }) => Promise<string | null>;
  onDelete: (row: InlineRow) => Promise<string | null>;
  canDelete: boolean;
  deleteNote: string;
}) {
  const [name, setName] = useState("");
  const [addError, setAddError] = useState<string>();
  const [adding, startAdding] = useTransition();
  const [editing, setEditing] = useState<{
    id: string;
    name: string;
    error?: string;
  } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [del, setDel] = useState<InlineRow | null>(null);
  const [filter, setFilter] = useState("");
  const shown = rows.filter((r) => r.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div>
      <form
        noValidate
        className="flex flex-col gap-2 sm:flex-row sm:items-start"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return setAddError(`Enter a ${noun} name.`);
          startAdding(async () => {
            const err = await onAdd(name.trim());
            setAddError(err ?? undefined);
            if (!err) setName("");
          });
        }}
      >
        <div className="flex-1">
          <label htmlFor={`add-${noun}`} className="sr-only">
            New {noun}
          </label>
          <Input
            id={`add-${noun}`}
            name="name"
            value={name}
            autoComplete="off"
            placeholder={placeholder}
            aria-invalid={addError ? true : undefined}
            aria-describedby={addError ? `add-${noun}-error` : undefined}
            onChange={(e) => (setName(e.target.value), setAddError(undefined))}
          />
          {addError && (
            <p id={`add-${noun}-error`} className="mt-1.5 text-sm text-destructive">
              {addError}
            </p>
          )}
        </div>
        <Button type="submit" disabled={adding}>
          {adding ? <Spinner /> : <Plus aria-hidden />}
          {adding ? "Adding…" : `Add`}
        </Button>
      </form>

      {rows.length > 8 && (
        <div className="mt-4">
          <label htmlFor={`filter-${noun}`} className="sr-only">
            Filter
          </label>
          <Input id={`filter-${noun}`} type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter the list…" className="sm:max-w-xs" />
        </div>
      )}

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-ink">Nothing here yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-rule rounded-lg border border-rule">
          {shown.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
              {editing?.id === r.id ? (
                <form
                  noValidate
                  className="flex flex-1 flex-wrap items-start gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!editing.name.trim()) return setEditing({ ...editing, error: "Enter a name." });
                    setBusy(r.id);
                    const err = await onSave(r, { name: editing.name.trim() });
                    setBusy(null);
                    if (err) setEditing({ ...editing, error: err });
                    else setEditing(null);
                  }}
                >
                  <div className="min-w-48 flex-1">
                    <label htmlFor={`edit-${r.id}`} className="sr-only">
                      Name
                    </label>
                    <Input
                      id={`edit-${r.id}`}
                      autoFocus
                      value={editing.name}
                      onChange={(e) => setEditing({ id: r.id, name: e.target.value })}
                      aria-invalid={editing.error ? true : undefined}
                    />
                    {editing.error && <p className="mt-1 text-sm text-destructive">{editing.error}</p>}
                  </div>
                  <Button type="submit" size="sm" disabled={busy === r.id} aria-label="Save name">
                    {busy === r.id ? <Spinner /> : <CheckIcon aria-hidden />} Save
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)} aria-label="Cancel">
                    <X aria-hidden />
                  </Button>
                </form>
              ) : (
                <>
                  <span className={`min-w-0 flex-1 text-[0.9375rem] ${r.active ? "text-ink" : "text-faint-ink line-through"}`}>{r.name}</span>
                  {r.extra}
                  {!r.active && <Badge>Hidden</Badge>}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy === r.id}
                      onClick={async () => {
                        setBusy(r.id);
                        await onSave(r, { active: !r.active });
                        setBusy(null);
                      }}
                    >
                      {busy === r.id && <Spinner />}
                      {r.active ? "Hide" : "Show"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditing({ id: r.id, name: r.name })} aria-label={`Rename ${r.name}`}>
                      <Pencil aria-hidden />
                    </Button>
                    {canDelete && (
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDel(r)} aria-label={`Delete ${r.name}`}>
                        <Trash2 aria-hidden />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <Confirm
        open={!!del}
        onOpenChange={(v) => !v && setDel(null)}
        title={`Delete “${del?.name ?? ""}”?`}
        description={deleteNote}
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        destructive
        onConfirm={async () => {
          if (del) await onDelete(del);
        }}
      />
    </div>
  );
}

/* --------------------------------- expertise ------------------------------- */

interface Topic {
  id: string;
  name: string;
  active: boolean;
  members: number;
}

export function ExpertiseView() {
  const me = useAdmin();
  const toast = useToast();
  const list = useApi<Topic[]>("/admin/expertise");
  const done = (ok: boolean, msg: string, err?: string) => {
    if (!ok) return err ?? "Could not save.";
    toast("success", msg);
    void list.reload();
    return null;
  };
  return (
    <AdminPage
      title="Expertise Topics"
      description="The research topics members choose on their profile and visitors filter the mentoring directory by. Hidden topics stay on existing profiles but can't be chosen."
    >
      <Panel>
        {list.error && <ErrorNote message={list.error.message} onRetry={list.reload} />}
        {!list.data && !list.error && <Loading />}
        {list.data && (
          <InlineList
            noun="topic"
            placeholder="New topic, e.g. Edge computing…"
            rows={list.data.map((t) => ({
              ...t,
              extra: (
                <span className="text-xs text-faint-ink numerals-tabular">
                  {t.members} {t.members === 1 ? "member" : "members"}
                </span>
              ),
            }))}
            canDelete={me.role === "admin"}
            deleteNote="It is removed from every member profile that lists it. To keep it on existing profiles, hide it instead."
            onAdd={async (name) => {
              const r = await send("/admin/expertise", "POST", {
                name,
                active: true,
              });
              return done(r.ok, "Topic added.", r.ok ? undefined : r.code === "DUPLICATE" ? "That topic already exists." : r.message);
            }}
            onSave={async (row, patch) => {
              const r = await send(`/admin/expertise/${row.id}`, "PUT", {
                name: patch.name ?? row.name,
                active: patch.active ?? row.active,
              });
              const err = done(r.ok, "Topic saved.", r.ok ? undefined : r.code === "DUPLICATE" ? "That topic already exists." : r.message);
              if (err) toast("error", err);
              return err;
            }}
            onDelete={async (row) => {
              const r = await send(`/admin/expertise/${row.id}`, "DELETE");
              const err = done(r.ok, "Topic deleted.", r.ok ? undefined : r.message);
              if (err) toast("error", err);
              return err;
            }}
          />
        )}
      </Panel>
    </AdminPage>
  );
}

/* ------------------------------- form lists ------------------------------- */

interface Lookup {
  id: string;
  kind: "reference_style" | "required_area";
  name: string;
  position: number;
  active: boolean;
}
const KINDS: [Lookup["kind"], string][] = [
  ["reference_style", "Reference Styles"],
  ["required_area", "Subject Areas"],
];

export function ListsView() {
  const url = useUrlState();
  const toast = useToast();
  const kind = (url.get("kind") || "reference_style") as Lookup["kind"];
  const list = useApi<Lookup[]>(`/admin/lookups?kind=${kind}`);
  const done = (ok: boolean, msg: string, err?: string) => {
    if (!ok) {
      toast("error", err ?? "Could not save.");
      return err ?? "Could not save.";
    }
    toast("success", msg);
    void list.reload();
    return null;
  };
  return (
    <AdminPage title="Form Lists" description="The choices offered on the quote request form. Hidden options stay on past requests.">
      <Tabs label="List" tabs={KINDS} value={kind} onChange={(v) => url.set({ kind: v })} />
      <Panel>
        <p className="mb-4 text-sm text-muted-ink">
          {kind === "reference_style" ? "Citation styles a client can ask us to format their paper in." : "Subject areas a client can choose for editing and proofreading."}
        </p>
        {list.error && <ErrorNote message={list.error.message} onRetry={list.reload} />}
        {!list.data && !list.error && <Loading />}
        {list.data && (
          <InlineList
            key={kind}
            noun="option"
            placeholder={kind === "reference_style" ? "New style, e.g. Vancouver…" : "New area, e.g. Engineering…"}
            rows={list.data}
            canDelete
            deleteNote="It disappears from the form. Past quote requests keep the name they were sent with."
            onAdd={async (name) => {
              const r = await send("/admin/lookups", "POST", {
                kind,
                name,
                position: list.data?.length ?? 0,
                active: true,
              });
              return done(r.ok, "Option added.", r.ok ? undefined : r.code === "DUPLICATE" ? "That option already exists." : r.message);
            }}
            onSave={async (row, patch) => {
              const r = await send(`/admin/lookups/${row.id}`, "PUT", {
                kind,
                name: patch.name ?? row.name,
                position: (row as Lookup).position,
                active: patch.active ?? row.active,
              });
              return done(r.ok, "Option saved.", r.ok ? undefined : r.message);
            }}
            onDelete={async (row) => {
              const r = await send(`/admin/lookups/${row.id}`, "DELETE");
              return done(r.ok, "Option deleted.", r.ok ? undefined : r.message);
            }}
          />
        )}
      </Panel>
    </AdminPage>
  );
}

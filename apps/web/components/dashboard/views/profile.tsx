"use client";

import { richToPlainText } from "@ritechs/shared";
import { useRef, useState } from "react";
import Link from "next/link";
import { Camera, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AdminPage, Panel, useToast } from "@/components/admin/ui";
import { Check, FormGrid, RichTextArea, Select, TextInput, focusFirstError } from "@/components/admin/form";
import { Avatar, isMentor, useMember } from "@/components/dashboard/shell";
import { apiRaw } from "@/lib/api/client";
import type { CountryOption } from "@/lib/countries";
import { photoRules, positions, qualifications } from "@/lib/data/registration";
import { send } from "@/lib/admin/use-api";
import { routes } from "@/lib/site";

const RESEARCH_LINKS: [string, string, string][] = [
  ["scholar", "Google Scholar", "https://scholar.google.com/citations?user=…"],
  ["scopus", "Scopus", "https://www.scopus.com/authid/detail.uri?authorId=…"],
  ["orcid", "ORCID iD", "0000-0002-1825-0097 or https://orcid.org/…"],
  ["researchgate", "ResearchGate", "https://www.researchgate.net/profile/…"],
  ["website", "Personal or lab website", "https://…"],
];
const SOCIAL_LINKS: [string, string, string][] = [
  ["linkedin", "LinkedIn", "https://www.linkedin.com/in/…"],
  ["twitter", "X (Twitter)", "https://x.com/…"],
  ["facebook", "Facebook", "https://www.facebook.com/…"],
  ["instagram", "Instagram", "https://www.instagram.com/…"],
];
const BIO_MAX = 4000;

function Photo() {
  const { me, refresh } = useMember();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const name = `${me.profile.firstName} ${me.profile.lastName}`;

  async function upload(file: File) {
    if (!photoRules.types.includes(file.type) && file.type !== "image/webp") return toast("error", "Choose a JPG, PNG, GIF or WebP image.");
    if (file.size > photoRules.maxBytes) return toast("error", "The photo must be 2 MB or smaller.");
    setBusy(true);
    const form = new FormData();
    form.set("photo", file);
    const res = await apiRaw("/me/photo", { form });
    setBusy(false);
    if (!res.ok) return toast("error", res.message);
    toast("success", "Photo updated.");
    await refresh();
  }

  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      <Avatar name={name} src={me.profile.photoUrl} className="size-24 text-2xl" />
      <div>
        <input
          ref={input}
          type="file"
          accept=".jpg,.jpeg,.png,.gif,.webp"
          className="sr-only"
          id="photo-file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void upload(f);
          }}
        />
        <Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <Spinner /> : <Camera aria-hidden />}
          {busy ? "Uploading…" : me.profile.photoUrl ? "Change Photo" : "Upload Photo"}
        </Button>
        <p className="mt-2 text-xs text-faint-ink">A clear head-and-shoulders photo. JPG, PNG, GIF or WebP, up to 2 MB.</p>
      </div>
    </div>
  );
}

export type ProfileSection = "basic" | "biography" | "scholar";

const SECTIONS: Record<ProfileSection, { title: string; mentor: string; mentee: string }> = {
  basic: { title: "Basic Info", mentor: "Your name, position and contact details, as shown on your public mentor page.", mentee: "Your name, studies and contact details. Mentors see your name, role and organisation when you send them a request." },
  biography: { title: "Biography", mentor: "Tell mentees about your research and how you can help them.", mentee: "Introduce yourself to mentors: what you study, what you are working on and what help you are looking for." },
  scholar: { title: "Scholar ID", mentor: "Link your research profiles so visitors can see your publications and citations.", mentee: "Link your research profiles so mentors can see your publications. Add them when you have them." },
};

export function ProfileView({ countries, section = "basic" }: { countries: CountryOption[]; section?: ProfileSection }) {
  const { me, refresh } = useMember();
  const toast = useToast();
  const mentor = isMentor(me);
  const p = me.profile;
  const [f, setF] = useState({
    firstName: p.firstName,
    lastName: p.lastName,
    position: p.position,
    qualification: p.qualification ?? "",
    affiliation: p.affiliation,
    country: p.country ?? "",
    city: p.city ?? "",
    phone: p.phoneE164 ?? "",
    researchField: p.researchField ?? "",
    citations: p.citations == null ? "" : String(p.citations),
    bio: p.bio,
    showInDirectory: p.showInDirectory,
    links: Object.fromEntries([...RESEARCH_LINKS, ...SOCIAL_LINKS].map(([k]) => [k, p.links?.[k] ?? ""])) as Record<string, string>,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));
  const setLink = (k: string, v: string) => setF((x) => ({ ...x, links: { ...x.links, [k]: v } }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (section === "basic") {
      if (!f.firstName.trim()) local.firstName = "Enter your first name.";
      if (!f.position.trim()) local.position = mentor ? "Enter your position, like Senior Lecturer." : "Enter your position, like Student.";
      if (!f.affiliation.trim()) local.affiliation = "Enter your university or organisation.";
    }
    if (section === "scholar" && f.citations && !/^\d{1,8}$/.test(f.citations)) local.citations = "Enter a whole number, like 1520.";
    if (section === "biography" && richToPlainText(f.bio).length > BIO_MAX) local.bio = `Use ${BIO_MAX} characters or fewer.`;
    if (Object.keys(local).length) {
      setErrors(local);
      focusFirstError(local);
      return;
    }
    setSaving(true);
    const pick = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, f.links[k] ?? ""]));
    const body: Record<string, unknown> =
      section === "basic"
        ? {
            firstName: f.firstName,
            lastName: f.lastName,
            position: f.position,
            affiliation: f.affiliation,
            city: f.city,
            links: pick(SOCIAL_LINKS.map(([k]) => k)),
            ...(f.qualification ? { qualification: f.qualification } : {}),
            ...(f.country ? { country: f.country } : {}),
            ...(mentor ? { showInDirectory: f.showInDirectory } : {}),
            ...(f.phone && f.phone !== p.phoneE164 ? { phone: { country: f.country || "GB", number: f.phone } } : {}),
          }
        : section === "biography"
          ? { bio: f.bio, researchField: f.researchField }
          : { citations: f.citations ? Number(f.citations) : null, links: pick(RESEARCH_LINKS.map(([k]) => k)) };
    const res = await send("/me/profile", "PATCH", body);
    setSaving(false);
    if (!res.ok) {
      const fields = Object.fromEntries(Object.entries(res.fields ?? {}).map(([k, v]) => [k.replace(/^links\./, "link-").replace(/^phone\..*/, "phone"), v]));
      setErrors(fields);
      focusFirstError(fields);
      return toast("error", res.message);
    }
    setErrors({});
    toast("success", `${SECTIONS[section].title} saved.`);
    await refresh();
  }

  return (
    <AdminPage
      title={SECTIONS[section].title}
      description={mentor ? SECTIONS[section].mentor : SECTIONS[section].mentee}
      actions={
        mentor && p.status === "approved" ? (
          <Button asChild variant="outline">
            <Link href={routes.mentor(p.slug)} target="_blank" rel="noopener">
              <ExternalLink aria-hidden /> View Public Profile
            </Link>
          </Button>
        ) : undefined
      }
    >
      {section === "basic" && (
        <Panel title="Photo">
          <Photo />
        </Panel>
      )}

      <form noValidate onSubmit={save} className="space-y-6">
        {section === "basic" && (
          <>
            <Panel title={mentor ? "About You" : "Personal and Study Details"}>
              <FormGrid>
                <TextInput id="firstName" label="First name" value={f.firstName} onChange={(v) => set({ firstName: v })} errors={errors} autoComplete="given-name" />
                <TextInput id="lastName" label="Last name" value={f.lastName} onChange={(v) => set({ lastName: v })} errors={errors} autoComplete="family-name" />
                <TextInput id="position" label={mentor ? "Position" : "Current role"} value={f.position} onChange={(v) => set({ position: v })} errors={errors} list="positions" placeholder={mentor ? "Senior Lecturer…" : "PhD Student…"} autoComplete="organization-title" />
                <Select id="qualification" label="Highest qualification" value={f.qualification} onChange={(v) => set({ qualification: v })} options={[["", "Choose…"], ...[...new Set([...qualifications[p.type], ...(p.qualification ? [p.qualification] : [])])].map((q) => [q, q] as [string, string])]} errors={errors} />
                <TextInput id="affiliation" label="University or organisation" value={f.affiliation} onChange={(v) => set({ affiliation: v })} errors={errors} placeholder={mentor ? "University of Wolverhampton…" : "Uttara University…"} autoComplete="organization" className="sm:col-span-2" />
                <Select id="country" label="Country" value={f.country} onChange={(v) => set({ country: v })} options={[["", "Choose…"], ...countries.map((c) => [c.code, c.name] as [string, string])]} errors={errors} />
                <TextInput id="city" label="City" value={f.city} onChange={(v) => set({ city: v })} errors={errors} placeholder="Dhaka…" autoComplete="address-level2" />
                <TextInput id="phone" label="Phone" value={f.phone} onChange={(v) => set({ phone: v })} errors={errors} type="tel" inputMode="tel" autoComplete="tel" placeholder="+880 1712 345678…" hint="Only RiTECHS staff see your phone number." />
              </FormGrid>
              <datalist id="positions">
                {positions[p.type].map((x) => (
                  <option key={x} value={x} />
                ))}
              </datalist>
            </Panel>

            <Panel title="Social Links">
              <FormGrid>
                {SOCIAL_LINKS.map(([k, l, ph]) => (
                  <TextInput key={k} id={`link-${k}`} label={l} value={f.links[k] ?? ""} onChange={(v) => setLink(k, v)} errors={errors} type="url" inputMode="url" spellCheck={false} placeholder={ph} />
                ))}
              </FormGrid>
            </Panel>

            {mentor && (
              <Panel title="Visibility">
                <Check id="showInDirectory" label="Show my profile in the public mentor directory" checked={f.showInDirectory} onChange={(v) => set({ showInDirectory: v })} />
                <p className="mt-1 text-sm text-muted-ink">Turn this off to stop new mentees finding you. People you already mentor keep access.</p>
              </Panel>
            )}
          </>
        )}

        {section === "biography" && (
          <Panel>
            <div className="space-y-5">
              <TextInput id="researchField" label={mentor ? "Field of research" : "Field of study or research"} value={f.researchField} onChange={(v) => set({ researchField: v })} errors={errors} placeholder={mentor ? "Wireless networks and IoT…" : "Machine learning for healthcare…"} />
              <RichTextArea
                id="bio"
                max={BIO_MAX}
                label={mentor ? "About you and your research" : "About you"}
                value={f.bio}
                onChange={(v) => set({ bio: v })}
                errors={errors}
                rows={12}
                hint={`${mentor ? "Mention your research interests and how you can help." : "Say what you study, your goals, and what you would like a mentor to help with."}`}
              />
            </div>
          </Panel>
        )}

        {section === "scholar" && (
          <>
            <Panel title="Google Scholar">
              <FormGrid>
                <TextInput id="link-scholar" label="Google Scholar profile" value={f.links.scholar ?? ""} onChange={(v) => setLink("scholar", v)} errors={errors} type="url" inputMode="url" spellCheck={false} placeholder="https://scholar.google.com/citations?user=…" hint="Open your Scholar profile and copy the address from the browser." />
                <TextInput id="citations" label="Citations" value={f.citations} onChange={(v) => set({ citations: v.replace(/[^\d]/g, "") })} errors={errors} inputMode="numeric" placeholder="1520…" hint="Optional. The “Cited by” number on your Scholar profile." />
              </FormGrid>
            </Panel>
            <Panel title="Other Research IDs">
              <FormGrid>
                {RESEARCH_LINKS.filter(([k]) => k !== "scholar").map(([k, l, ph]) => (
                  <TextInput key={k} id={`link-${k}`} label={l} value={f.links[k] ?? ""} onChange={(v) => setLink(k, v)} errors={errors} type="url" inputMode="url" spellCheck={false} placeholder={ph} />
                ))}
              </FormGrid>
              <p className="mt-4 text-sm text-muted-ink">No research profile yet? You can create a free ORCID iD at orcid.org and a Google Scholar profile at scholar.google.com.</p>
            </Panel>
          </>
        )}

        <div className="sticky bottom-0 z-10 -mx-4 flex justify-end gap-2 border-t border-rule bg-surface/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <Button type="submit" disabled={saving}>
            {saving && <Spinner />}
            {saving ? "Saving…" : `Save ${SECTIONS[section].title}`}
          </Button>
        </div>
      </form>
    </AdminPage>
  );
}

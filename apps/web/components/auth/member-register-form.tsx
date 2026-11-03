"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { isValidPhoneNumber, type CountryCode } from "libphonenumber-js/min";
import { Eye, EyeOff, ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Notice } from "@/components/auth/field";
import { registerMember } from "@/lib/auth/client";
import type { CountryOption } from "@/lib/countries";
import { BIO_MAX, genders, photoRules, positions, qualifications, type MemberRole } from "@/lib/data/registration";
import { routes } from "@/lib/site";
import { cn } from "@/lib/utils";

type FieldName =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "gender"
  | "position"
  | "affiliation"
  | "country"
  | "bio"
  | "qualification"
  | "password"
  | "photo"
  | "privacy";
type Errors = Partial<Record<FieldName | "form", string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ORDER: FieldName[] = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "gender",
  "country",
  "position",
  "affiliation",
  "qualification",
  "bio",
  "photo",
  "password",
  "privacy",
];

/* ---------- small layout helpers ---------- */

function FormItem({
  id,
  label,
  error,
  hint,
  optional,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: React.ReactNode;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-sm font-medium text-ink">
        {label}
        {optional && <span className="text-xs font-normal text-faint-ink">Optional</span>}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-faint-ink">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Section({ title, step, children }: { title: string; step: number; children: React.ReactNode }) {
  const headingId = `section-${step}`;
  return (
    <section role="group" aria-labelledby={headingId} className="border-t border-rule pt-7 first:border-t-0 first:pt-0">
      <h2 id={headingId} className="flex items-center gap-3 font-serif text-xl text-ink">
        <span aria-hidden className="inline-flex size-7 items-center justify-center rounded-full bg-brand-wash font-sans text-sm font-medium text-brand">
          {step}
        </span>
        {title}
      </h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3; label: string } {
  if (!pw) return { score: 0, label: "" };
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[a-z]/i.test(pw) && /\d/.test(pw)) s++;
  if (pw.length >= 12 || /[^a-z0-9]/i.test(pw)) s++;
  return { score: s as 0 | 1 | 2 | 3, label: ["Too short", "Weak", "Good", "Strong"][s] };
}

/* ---------- the form ---------- */

/**
 * A record named in the URL (?mentor=slug on a profile page, ?event=slug on a
 * conference page), looked up in the database for the confirmation note.
 */
function useNamed<T>(kind: "mentors" | "conferences", slug: string | null) {
  const [found, setFound] = useState<{ slug: string; data: T } | undefined>();
  useEffect(() => {
    if (!slug || !/^[\w.-]{1,120}$/.test(slug)) return;
    let live = true;
    void fetch(`/api/${kind}/${encodeURIComponent(slug)}`, { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? (r.json() as Promise<T>) : undefined))
      .then((data) => live && data && setFound({ slug, data }))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [kind, slug]);
  return found && found.slug === slug ? found.data : undefined;
}

export function MemberRegisterForm({ role, countries }: { role: MemberRole; countries: CountryOption[] }) {
  const uid = useId();
  const id = (f: string) => `${uid}-${f}`;
  const params = useSearchParams();
  const event = useNamed<{ acronym: string; title: string }>("conferences", params.get("event"));
  const mentor = useNamed<{ name: string }>("mentors", params.get("mentor"));

  const [errors, setErrors] = useState<Errors>({});
  const [phoneCountry, setPhoneCountry] = useState<CountryCode | "">("");
  const [country, setCountry] = useState<CountryCode | "">("");
  const [bio, setBio] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const photoInput = useRef<HTMLInputElement>(null);

  const [dirty, setDirty] = useState(false);
  const strength = passwordStrength(password);

  // Warn before leaving with a half-completed form.
  useEffect(() => {
    if (!dirty || done) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, done]);
  const bioRequired = role === "mentor";

  const describedBy = (f: FieldName, hasHint = false) =>
    errors[f] ? `${id(f)}-error` : hasHint ? `${id(f)}-hint` : undefined;
  const invalid = (f: FieldName) => (errors[f] ? true : undefined);
  const clear = (f: FieldName) => errors[f] && setErrors((e) => ({ ...e, [f]: undefined }));

  function onPhoto(file: File | undefined) {
    clear("photo");
    if (!file) return;
    if (!photoRules.types.includes(file.type)) {
      setErrors((e) => ({ ...e, photo: "Choose a JPG, GIF or PNG image." }));
      return;
    }
    if (file.size > photoRules.maxBytes) {
      setErrors((e) => ({ ...e, photo: "Choose an image smaller than 2MB." }));
      return;
    }
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto({ file, url: URL.createObjectURL(file) });
  }

  function removePhoto() {
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto(null);
    if (photoInput.current) photoInput.current.value = "";
  }

  function validate(d: FormData): Errors {
    const v = (k: string) => String(d.get(k) ?? "").trim();
    const e: Errors = {};
    if (!v("firstName")) e.firstName = "Enter your first name.";
    if (!v("lastName")) e.lastName = "Enter your last name.";
    if (!v("email")) e.email = "Enter your email address.";
    else if (!EMAIL_RE.test(v("email"))) e.email = "Enter an email address like name@university.edu.";
    if (!phoneCountry) e.phone = "Select the country for your phone number.";
    else if (!v("phone")) e.phone = "Enter your phone number.";
    else if (!isValidPhoneNumber(v("phone"), phoneCountry)) e.phone = "Enter a valid phone number for the selected country.";
    if (!v("gender")) e.gender = "Select your gender.";
    if (!v("country")) e.country = "Select your country.";
    if (!v("position")) e.position = "Select your current position.";
    if (!v("affiliation")) e.affiliation = "Enter your university or organisation.";
    if (!v("qualification")) e.qualification = "Select your highest qualification.";
    if (bioRequired && bio.trim().length < 50) e.bio = "Write at least 50 characters about your research and experience.";
    if (password.length < 10) e.password = "Use at least 10 characters.";
    else if (!/[a-z]/i.test(password) || !/\d/.test(password)) e.password = "Include at least one letter and one number.";
    if (d.get("privacy") !== "on") e.privacy = "Accept the RiTECHS Privacy Policy to register.";
    return e;
  }

  function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const d = new FormData(ev.currentTarget);
    const next = { ...validate(d), ...(errors.photo ? { photo: errors.photo } : {}) };
    setErrors(next);
    const first = ORDER.find((f) => next[f]);
    if (first) {
      document.getElementById(id(first))?.focus();
      return;
    }
    startTransition(async () => {
      const res = await registerMember({
        role,
        firstName: String(d.get("firstName")).trim(),
        lastName: String(d.get("lastName")).trim(),
        email: String(d.get("email")).trim(),
        phone: { country: phoneCountry as CountryCode, number: String(d.get("phone")).trim() },
        gender: String(d.get("gender")),
        position: String(d.get("position")),
        affiliation: String(d.get("affiliation")).trim(),
        country: String(d.get("country")),
        bio: bio.trim(),
        qualification: String(d.get("qualification")),
        password,
        photo: photo?.file,
      });
      if (res.ok) {
        setDone(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      // Server-side checks (e.g. a breached password) map back onto the fields.
      const server: Errors = {};
      const map: Record<string, FieldName> = { "phone.number": "phone", "phone.country": "phone", type: "position" };
      for (const [k, msg] of Object.entries(res.fields ?? {})) {
        const f = (map[k] ?? k) as FieldName;
        if (ORDER.includes(f)) server[f] = msg;
      }
      if (res.code === "PASSWORD_COMPROMISED" || res.code === "PASSWORD_TOO_SHORT") server.password = res.message;
      if (!Object.keys(server).length) server.form = res.message;
      setErrors(server);
      const firstServer = ORDER.find((f) => server[f]);
      if (firstServer) document.getElementById(id(firstServer))?.focus();
    });
  }

  if (done) {
    return (
      <Notice>
        <p className="font-medium">Thank you for registering as a RiTECHS {role}.</p>
        <p className="mt-1">
          Check your inbox for a link to confirm your email address (it expires in 24 hours). After that, our team reviews your
          application and emails you when it is approved.
        </p>
      </Notice>
    );
  }

  return (
    <>
      {(event || mentor) && (
        <p className="mt-6 rounded-md border border-brand-tint bg-brand-wash px-4 py-3 text-sm text-ink">
          {event && (
            <>
              After registering you can book <strong className="font-medium">{event.acronym || event.title}</strong>.
            </>
          )}
          {mentor && (
            <>
              Your request will go to <strong className="font-medium">{mentor.name}</strong> once your account is active.
            </>
          )}
        </p>
      )}

      {errors.form && <Notice tone="error">{errors.form}</Notice>}
      <form onSubmit={onSubmit} onChange={() => setDirty(true)} noValidate className="mt-8 space-y-8" aria-label={`${role === "mentor" ? "Mentor" : "Mentee"} registration`}>
        <Section title="Personal details" step={1}>
          <FormItem id={id("firstName")} label="First name" error={errors.firstName}>
            <Input id={id("firstName")} name="firstName" autoComplete="given-name" className="h-12" aria-invalid={invalid("firstName")} aria-describedby={describedBy("firstName")} onChange={() => clear("firstName")} />
          </FormItem>
          <FormItem id={id("lastName")} label="Last name" error={errors.lastName}>
            <Input id={id("lastName")} name="lastName" autoComplete="family-name" className="h-12" aria-invalid={invalid("lastName")} aria-describedby={describedBy("lastName")} onChange={() => clear("lastName")} />
          </FormItem>
          <FormItem id={id("email")} label="Email" error={errors.email} className="sm:col-span-2">
            <Input id={id("email")} name="email" type="email" inputMode="email" autoComplete="email" spellCheck={false} className="h-12" aria-invalid={invalid("email")} aria-describedby={describedBy("email")} onChange={() => clear("email")} />
          </FormItem>

          <FormItem id={id("phone")} label="Phone" error={errors.phone} hint="Select the country, then enter your number." className="sm:col-span-2">
            <div className="flex gap-2">
              <label htmlFor={id("phoneCountry")} className="sr-only">
                Phone country code
              </label>
              <NativeSelect
                id={id("phoneCountry")}
                wrapperClassName="w-[8.5rem] shrink-0 sm:w-56"
                value={phoneCountry}
                aria-invalid={!!errors.phone && !phoneCountry ? true : undefined}
                onChange={(e) => {
                  setPhoneCountry(e.target.value as CountryCode);
                  clear("phone");
                }}
              >
                <option value="">No country selected</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.dialCode})
                  </option>
                ))}
              </NativeSelect>
              <div className="relative min-w-0 flex-1">
                {phoneCountry && (
                  <span aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-base text-faint-ink md:text-[0.9375rem]">
                    {countries.find((c) => c.code === phoneCountry)?.dialCode}
                  </span>
                )}
                <Input
                  id={id("phone")}
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  className={cn("h-12", phoneCountry && "pl-14")}
                  aria-invalid={invalid("phone")}
                  aria-describedby={describedBy("phone", true)}
                  onChange={() => clear("phone")}
                />
              </div>
            </div>
          </FormItem>

          <FormItem id={id("gender")} label="Gender" error={errors.gender}>
            <NativeSelect id={id("gender")} name="gender" required defaultValue="" aria-invalid={invalid("gender")} aria-describedby={describedBy("gender")} onChange={() => clear("gender")}>
              <option value="" disabled>
                Select gender
              </option>
              {genders.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </NativeSelect>
          </FormItem>
          <FormItem id={id("country")} label="Country" error={errors.country}>
            <NativeSelect
              id={id("country")}
              name="country"
              required
              value={country}
              aria-invalid={invalid("country")}
              aria-describedby={describedBy("country")}
              onChange={(e) => {
                const c = e.target.value as CountryCode;
                setCountry(c);
                if (!phoneCountry) setPhoneCountry(c);
                clear("country");
              }}
            >
              <option value="" disabled>
                Select your country
              </option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </FormItem>
        </Section>

        <Section title="Academic background" step={2}>
          <FormItem id={id("position")} label="Current position" error={errors.position}>
            <NativeSelect id={id("position")} name="position" required defaultValue="" aria-invalid={invalid("position")} aria-describedby={describedBy("position")} onChange={() => clear("position")}>
              <option value="" disabled>
                Select your position
              </option>
              {positions[role].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </NativeSelect>
          </FormItem>
          <FormItem id={id("qualification")} label="Highest level of qualification" error={errors.qualification}>
            <NativeSelect id={id("qualification")} name="qualification" required defaultValue="" aria-invalid={invalid("qualification")} aria-describedby={describedBy("qualification")} onChange={() => clear("qualification")}>
              <option value="" disabled>
                Select qualification
              </option>
              {qualifications[role].map((q) => (
                <option key={q}>{q}</option>
              ))}
            </NativeSelect>
          </FormItem>
          <FormItem id={id("affiliation")} label="Affiliation" error={errors.affiliation} hint="Your university, institute or organisation." className="sm:col-span-2">
            <Input id={id("affiliation")} name="affiliation" autoComplete="organization" placeholder="e.g. University of Wolverhampton…" className="h-12" aria-invalid={invalid("affiliation")} aria-describedby={describedBy("affiliation", true)} onChange={() => clear("affiliation")} />
          </FormItem>
          <FormItem
            id={id("bio")}
            label="Short biography"
            optional={!bioRequired}
            error={errors.bio}
            hint={
              <span className="flex justify-between gap-4">
                <span>{role === "mentor" ? "Your research interests and experience. Shown on your mentor profile." : "Your studies, interests and what you'd like help with."}</span>
                <span className="shrink-0 numerals-tabular">
                  {bio.length}/{BIO_MAX}
                </span>
              </span>
            }
            className="sm:col-span-2"
          >
            <Textarea
              id={id("bio")}
              name="bio"
              rows={5}
              maxLength={BIO_MAX}
              value={bio}
              onChange={(e) => {
                setBio(e.target.value);
                clear("bio");
              }}
              aria-invalid={invalid("bio")}
              aria-describedby={describedBy("bio", true)}
            />
          </FormItem>
        </Section>

        <Section title="Profile and account" step={3}>
          <FormItem id={id("photo")} label="Upload photo" optional error={errors.photo} hint={`Allowed ${photoRules.label}.`} className="sm:col-span-2">
            <div className="flex items-center gap-4 rounded-md border border-dashed border-rule-strong bg-paper p-4">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-brand-wash">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local preview of a not-yet-uploaded file
                  <img src={photo.url} alt="Selected profile photo" width={80} height={80} className="size-full object-cover" />
                ) : (
                  <ImagePlus aria-hidden className="absolute inset-0 m-auto size-6 text-brand/60" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <input
                  ref={photoInput}
                  id={id("photo")}
                  type="file"
                  accept={photoRules.accept}
                  className="sr-only"
                  aria-invalid={invalid("photo")}
                  aria-describedby={describedBy("photo", true)}
                  onChange={(e) => onPhoto(e.target.files?.[0])}
                />
                {photo ? (
                  <>
                    <p className="truncate text-sm font-medium text-ink">{photo.file.name}</p>
                    <p className="text-xs text-faint-ink">{(photo.file.size / 1024).toFixed(0)} KB</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-ink">A clear, recent head-and-shoulders photo works best.</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => photoInput.current?.click()}>
                    {photo ? "Change Photo" : "Choose Photo"}
                  </Button>
                  {photo && (
                    <Button type="button" variant="ghost" size="sm" onClick={removePhoto}>
                      <Trash2 aria-hidden />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </FormItem>

          <FormItem id={id("password")} label="Create password" error={errors.password} hint="At least 10 characters, with a letter and a number." className="sm:col-span-2">
            <div className="relative">
              <Input
                id={id("password")}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="h-12 pr-12"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clear("password");
                }}
                aria-invalid={invalid("password")}
                aria-describedby={[describedBy("password", true), `${id("strength")}`].filter(Boolean).join(" ")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute top-0.5 right-0.5 inline-flex size-11 items-center justify-center rounded-md text-faint-ink hover:text-ink"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            </div>
            <div id={id("strength")} className="mt-2 flex items-center gap-3" aria-live="polite">
              <div className="grid flex-1 grid-cols-3 gap-1" aria-hidden>
                {[1, 2, 3].map((n) => (
                  <span
                    key={n}
                    className={cn(
                      "h-1 rounded-full bg-rule",
                      strength.score >= n && (strength.score === 1 ? "bg-[#c47f12]" : strength.score === 2 ? "bg-brand/70" : "bg-[#2f8a57]"),
                    )}
                  />
                ))}
              </div>
              <span className="w-16 text-right text-xs text-faint-ink">{strength.label && <span className="sr-only">Password strength: </span>}{strength.label}</span>
            </div>
          </FormItem>
        </Section>

        <div>
          <label className="flex min-h-11 items-start gap-3 py-2 text-[0.9375rem] text-ink">
            <input
              id={id("privacy")}
              type="checkbox"
              name="privacy"
              aria-invalid={invalid("privacy")}
              aria-describedby={describedBy("privacy")}
              onChange={() => clear("privacy")}
              className="mt-1 size-4 shrink-0 accent-[var(--brand)]"
            />
            <span>
              I have read and accept the{" "}
              <Link href={routes.privacy} className="text-brand underline underline-offset-2">
                RiTECHS Privacy Policy
              </Link>
              .
            </span>
          </label>
          {errors.privacy && (
            <p id={`${id("privacy")}-error`} className="mt-1.5 text-sm text-destructive">
              {errors.privacy}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4 border-t border-rule pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-ink">
            <Link href={routes.login} className="tap-target font-medium text-brand underline decoration-brand/30 underline-offset-4 hover:decoration-brand">
              Already have an account?
            </Link>
            <span aria-hidden className="mx-2 text-rule-strong">|</span>
            <Link href={routes.forgotPassword} className="tap-target underline decoration-ink/20 underline-offset-4 hover:text-ink">
              Forgot password?
            </Link>
          </p>
          <Button type="submit" size="lg" disabled={pending} className="sm:min-w-48">
            {pending && <Spinner />}
            {pending ? "Registering…" : `Register as ${role === "mentor" ? "a Mentor" : "a Mentee"}`}
          </Button>
        </div>
      </form>
    </>
  );
}

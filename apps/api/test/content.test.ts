import { schema } from "@ritechs/db";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { nextIp, signedInMember, signedInStaff, startApp, WEB, type TestApp } from "./helpers.js";

let t: TestApp;
let admin: Awaited<ReturnType<typeof signedInStaff>>;
beforeAll(async () => {
  t = await startApp();
  admin = await signedInStaff(t, "admin");
});
afterAll(async () => {
  await t.close();
});
const visitor = () => t.http().set("Origin", WEB).set("X-Forwarded-For", nextIp());

const conference = (slug: string, status: "draft" | "published") => ({
  slug,
  acronym: "TEST-2030",
  title: "Test Conference",
  about: '<p>Hello <script>alert(1)</script><img src="https://x.test/a.png" onerror="alert(2)"><a href="javascript:alert(3)">x</a></p>',
  startDate: "2030-07-09",
  endDate: "2030-07-10",
  status,
  tracks: [{ title: "Track One", chairs: ["Prof A"] }],
  dates: [{ label: "Deadline", date: "2030-01-15" }],
  fees: [{ category: "Academic", earlyAmount: 450, regularAmount: "500", currency: "USD" }],
});

describe("conferences", () => {
  it("only published conferences are public, and rich text is sanitised", async () => {
    const draft = await admin.agent.post("/api/admin/conferences").send(conference("test-draft-2030", "draft")).expect(201);
    expect(draft.body.about).not.toMatch(/script|onerror|javascript:/);
    expect(draft.body.about).toContain("Hello");
    await visitor().get("/api/conferences/test-draft-2030").expect(404);

    await admin.agent.put(`/api/admin/conferences/${draft.body.id}`).send(conference("test-draft-2030", "published")).expect(200);
    const pub = await visitor().get("/api/conferences/test-draft-2030").expect(200);
    expect(pub.body.tracks[0].chairs).toEqual(["Prof A"]);
    expect(Number(pub.body.fees[0].earlyAmount)).toBe(450);
    expect(pub.headers["cache-control"]).toMatch(/public/);
  });

  it("rejects duplicate slugs with a clear error", async () => {
    await admin.agent.post("/api/admin/conferences").send(conference("test-dupe-2030", "draft")).expect(201);
    const res = await admin.agent.post("/api/admin/conferences").send(conference("test-dupe-2030", "draft")).expect(409);
    expect(res.body.error.code).toBe("SLUG_TAKEN");
  });

  it("validates dates", async () => {
    const res = await admin.agent.post("/api/admin/conferences").send({ ...conference("test-dates", "draft"), endDate: "2030-07-01" }).expect(400);
    expect(res.body.error.fields.endDate).toBeDefined();
  });
});

describe("events", () => {
  it("enforces capacity, waitlists the overflow and de-duplicates sign-ups", async () => {
    const starts = new Date(Date.now() + 7 * 86400_000).toISOString();
    const ev = await admin.agent.post("/api/admin/events").send({ slug: "cap-test", type: "seminar", title: "Small Seminar", startsAt: starts, capacity: 1, registrationOpen: true, status: "published" }).expect(201);
    const reg = (email: string) => visitor().post("/api/events/cap-test/registrations").send({ name: "Visitor", email });
    await reg("one@example.org").expect(202);
    await reg("one@example.org").expect(202);
    await reg("two@example.org").expect(202);
    const rows = await t.db.select().from(schema.registrations).where(eq(schema.registrations.eventId, ev.body.id));
    expect(rows.map((r) => r.status).sort()).toEqual(["pending", "waitlisted"]);
    const csv = await admin.agent.get(`/api/admin/events/${ev.body.id}/registrations.csv`).expect(200);
    expect(csv.headers["content-type"]).toMatch(/text\/csv/);
  });

  it("neutralises spreadsheet formulas in CSV exports", async () => {
    const starts = new Date(Date.now() + 7 * 86400_000).toISOString();
    const ev = await admin.agent.post("/api/admin/events").send({ slug: "csv-test", type: "webinar", title: "CSV", startsAt: starts, registrationOpen: true, status: "published" }).expect(201);
    await visitor().post("/api/events/csv-test/registrations").send({ name: "=HYPERLINK(\"http://evil\")", email: "csv@example.org" }).expect(202);
    const csv = await admin.agent.get(`/api/admin/events/${ev.body.id}/registrations.csv`).expect(200);
    expect(csv.text).toContain(`"'=HYPERLINK`);
  });
});

describe("registrations, inbox and staff (admin panel)", () => {
  it("lists every registration with its event, lets admins delete one, and exports all as CSV", async () => {
    const starts = new Date(Date.now() + 9 * 86400_000).toISOString();
    await admin.agent.post("/api/admin/events").send({ slug: "all-regs", type: "bootcamp", title: "Boot Camp All", startsAt: starts, registrationOpen: true, status: "published" }).expect(201);
    await visitor().post("/api/events/all-regs/registrations").send({ name: "Reg Person", email: "allregs@example.org", organisation: "Uni X" }).expect(202);
    const list = await admin.agent.get("/api/admin/registrations?q=allregs&kind=event").expect(200);
    expect(list.body.items[0]).toMatchObject({ name: "Reg Person", eventTitle: "Boot Camp All", eventType: "bootcamp" });
    const csv = await admin.agent.get("/api/admin/registrations.csv").expect(200);
    expect(csv.text.split("\r\n")[0]).toMatch(/^\uFEFF?"Event","Name"/);
    const editor = await signedInStaff(t, "editor");
    await editor.agent.delete(`/api/admin/registrations/${list.body.items[0].id}`).expect(403);
    await admin.agent.delete(`/api/admin/registrations/${list.body.items[0].id}`).expect(204);
    expect((await admin.agent.get("/api/admin/registrations?q=allregs").expect(200)).body.total).toBe(0);
  });

  it("deletes contact messages and quote requests", async () => {
    await visitor().post("/api/contact").send({ name: "Spam Bot", email: "spam@example.org", subject: "Buy now", message: "Cheap things for sale here, click the link." }).expect(202);
    const msgs = await admin.agent.get("/api/admin/contact").expect(200);
    const m = msgs.body.items.find((x: { email: string }) => x.email === "spam@example.org");
    await admin.agent.delete(`/api/admin/contact/${m.id}`).expect(204);
    await admin.agent.delete(`/api/admin/contact/${m.id}`).expect(404);
  });

  it("adds staff with a password they can sign in with straight away", async () => {
    const email = `staff.${Date.now()}@example.org`;
    await admin.agent.post("/api/admin/staff").send({ name: "New Editor", email, role: "editor", password: "short" }).expect(400);
    await admin.agent.post("/api/admin/staff").send({ name: "New Editor", email, role: "editor", password: "Editor-Pass-2026" }).expect(201);
    await visitor().post("/api/auth/sign-in/email").send({ email, password: "Editor-Pass-2026" }).expect(200);
  });

  it("removes a conference file left on the old site", async () => {
    const c = await admin.agent.post("/api/admin/conferences").send(conference("legacy-file-2030", "draft")).expect(201);
    await t.db.update(schema.conferences).set({ legacyCoverPath: "uploads/old.png" }).where(eq(schema.conferences.id, c.body.id));
    expect((await admin.agent.get(`/api/admin/conferences/${c.body.id}`).expect(200)).body.coverUrl).toContain("uploads/old.png");
    await admin.agent.put(`/api/admin/conferences/${c.body.id}`).send({ ...conference("legacy-file-2030", "draft"), coverId: null, legacyCoverPath: null }).expect(200);
    expect((await admin.agent.get(`/api/admin/conferences/${c.body.id}`).expect(200)).body.coverUrl).toBeNull();
    await admin.agent.put(`/api/admin/conferences/${c.body.id}`).send({ ...conference("legacy-file-2030", "draft"), legacyCoverPath: "uploads/x.png" }).expect(400);
  });
});

describe("website pages", () => {
  it("keeps drafts private, publishes edits, and deleting brings the designed page back", async () => {
    await admin.agent.put("/api/admin/pages").send({ slug: "qa-page", title: "QA Page", intro: "Short intro.", body: '<h2>Hello</h2><p>Text <script>x()</script></p>', status: "draft" }).expect(200);
    await visitor().get("/api/pages/qa-page").expect(404);
    expect((await visitor().get("/api/pages").expect(200)).body.map((p: { slug: string }) => p.slug)).not.toContain("qa-page");
    const pub = await admin.agent.put("/api/admin/pages").send({ slug: "qa-page", title: "QA Page", intro: "Short intro.", body: "<h2>Hello</h2><p>Text <script>x()</script></p>", status: "published" }).expect(200);
    expect(pub.body.body).not.toContain("script");
    const live = await visitor().get("/api/pages/qa-page").expect(200);
    expect(live.body).toMatchObject({ title: "QA Page", intro: "Short intro." });
    expect((await visitor().get("/api/pages").expect(200)).body.map((p: { slug: string }) => p.slug)).toContain("qa-page");
    await admin.agent.delete("/api/admin/pages/qa-page").expect(204);
    await visitor().get("/api/pages/qa-page").expect(404);
    await admin.agent.delete("/api/admin/pages/qa-page").expect(404);
  });
});

describe("members and directory", () => {
  it("approved mentors appear in the public directory without private fields", async () => {
    const m = await signedInMember(t);
    const slug = (await m.agent.get("/api/me").expect(200)).body.profile.slug as string;
    await visitor().get(`/api/mentors/${slug}`).expect(404);
    await m.agent.post("/api/me/membership-change").send({ toType: "mentee", reason: "Testing the guard" }).expect(403);

    await admin.agent.post(`/api/admin/members/${m.userId}/review`).send({ action: "approve" }).expect(201);
    const after = await visitor().get(`/api/mentors/${slug}`).expect(200);
    expect(after.body.name).toBe("Ada Lovelace");
    expect(JSON.stringify(after.body)).not.toMatch(/email|phone|example\.org/);
    const list = await visitor().get("/api/mentors?q=Lovelace").expect(200);
    expect(list.body.items.some((x: { slug: string }) => x.slug === slug)).toBe(true);
  });

  it("suspending a member signs them out and blocks sign-in", async () => {
    const m = await signedInMember(t, { approve: true });
    await admin.agent.post(`/api/admin/members/${m.userId}/review`).send({ action: "suspend", note: "Spam" }).expect(201);
    await m.agent.get("/api/me").expect(401);
    const res = await visitor().post("/api/auth/sign-in/email").send({ email: m.email, password: "Correct-Horse-42" });
    expect(res.status).toBe(403);
  });
});

describe("uploads", () => {
  it("rejects files that are not really images", async () => {
    const m = await signedInMember(t);
    const res = await m.agent.post("/api/me/photo").attach("photo", Buffer.from("<?php system($_GET['c']); ?>"), { filename: "avatar.png", contentType: "image/png" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("UNSUPPORTED_FILE");
  });

  it("re-encodes real images to WebP and strips metadata", async () => {
    const m = await signedInMember(t);
    const png = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: "#70243d" } }).png().withMetadata({ exif: { IFD0: { Artist: "secret" } } }).toBuffer();
    const res = await m.agent.post("/api/me/photo").attach("photo", png, { filename: "me.png", contentType: "image/png" }).expect(201);
    expect(res.body.photoUrl).toMatch(/\.webp$/);
    const file = await t.http().get(res.body.photoUrl).expect(200);
    expect(file.headers["content-security-policy"]).toContain("sandbox");
    const meta = await sharp(file.body as Buffer).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBeLessThanOrEqual(800);
    expect(meta.exif).toBeUndefined();
  });

  it("refuses oversized uploads", async () => {
    const m = await signedInMember(t);
    const res = await m.agent.post("/api/me/photo").attach("photo", Buffer.alloc(3 * 1024 * 1024, 1), { filename: "big.png" });
    expect(res.status).toBe(413);
  });
});

describe("newsletter", () => {
  it("uses double opt-in and never reveals existing subscribers", async () => {
    const a = await visitor().post("/api/newsletter").send({ email: "news@example.org" }).expect(202);
    const b = await visitor().post("/api/newsletter").send({ email: "news@example.org" }).expect(202);
    expect(a.body).toEqual(b.body);
    const [row] = await t.db.select().from(schema.newsletterSubscribers).where(eq(schema.newsletterSubscribers.email, "news@example.org"));
    expect(row!.status).toBe("pending");
    expect(row!.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    await visitor().post("/api/newsletter/confirm").send({ token: "x".repeat(43) }).expect(400);
  });

  it("silently drops honeypot submissions", async () => {
    await visitor().post("/api/newsletter").send({ email: "bot@example.org", website: "http://spam" }).expect((r) => expect([202, 400]).toContain(r.status));
    const rows = await t.db.select().from(schema.newsletterSubscribers).where(eq(schema.newsletterSubscribers.email, "bot@example.org"));
    expect(rows).toHaveLength(0);
  });
});

describe("bulk review", () => {
  it("rejects several applications at once and reports per-member failures", async () => {
    const a = await signedInMember(t);
    const b = await signedInMember(t);
    const res = await admin.agent.post("/api/admin/members/review-bulk").send({ userIds: [a.userId, b.userId, admin.userId], action: "reject", note: "Spam" }).expect(201);
    expect(res.body.done).toBe(2);
    expect(res.body.failed).toHaveLength(1);
    await t.http().get("/api/admin/members/review-bulk").expect(401);
  });
});


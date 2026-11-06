import { schema } from "@ritechs/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { lastMailTo, signedInMember, startApp, type TestApp } from "./helpers.js";

let t: TestApp;
beforeAll(async () => {
  t = await startApp();
});
afterAll(async () => {
  await t.close();
});

const slugOf = async (userId: string) => (await t.db.select({ slug: schema.memberProfiles.slug }).from(schema.memberProfiles).where(eq(schema.memberProfiles.userId, userId)))[0]!.slug;
const asMentee = (userId: string) => t.db.update(schema.memberProfiles).set({ type: "mentee" }).where(eq(schema.memberProfiles.userId, userId));
const course = { title: "Reference managers", description: "Zotero from scratch.", duration: 4, durationUnit: "week", fee: null, currency: "GBP", active: true };

describe("member dashboard", () => {
  it("keeps courses private to their owner and to mentors", async () => {
    const mentor = await signedInMember(t, { approve: true });
    const other = await signedInMember(t, { approve: true });
    const mentee = await signedInMember(t, { approve: true });
    await asMentee(mentee.userId);
    const created = await mentor.agent.post("/api/me/workspace/courses").send(course).expect(201);
    // Another member cannot edit or delete it (it looks like it does not exist).
    await other.agent.put(`/api/me/workspace/courses/${created.body.id}`).send({ ...course, title: "Hijacked" }).expect(404);
    await other.agent.delete(`/api/me/workspace/courses/${created.body.id}`).expect(404);
    const res = await mentee.agent.post("/api/me/workspace/courses").send(course).expect(403);
    expect(res.body.error.code).toBe("WRONG_MEMBER_TYPE");
  });

  it("runs a mentorship request from sending to accepting, then allows messages", async () => {
    const mentor = await signedInMember(t, { approve: true });
    const mentee = await signedInMember(t, { approve: true });
    await asMentee(mentee.userId);
    const stranger = await signedInMember(t, { approve: true });
    const mentorSlug = await slugOf(mentor.userId);

    // Not connected yet: no messages.
    const blocked = await mentor.agent.post("/api/me/workspace/messages").send({ to: [mentee.userId], subject: "Hi", body: "Hello" }).expect(403);
    expect(blocked.body.error.code).toBe("NOT_CONNECTED");

    const sent = await mentee.agent.post("/api/me/workspace/requests").send({ kind: "mentorship", mentor: mentorSlug, message: "Please help me with my first paper." }).expect(201);
    const dup = await mentee.agent.post("/api/me/workspace/requests").send({ kind: "mentorship", mentor: mentorSlug, message: "Please help me with my first paper." }).expect(409);
    expect(dup.body.error.code).toBe("ALREADY_REQUESTED");
    await t.drain();
    expect(lastMailTo(mentor.email)?.subject).toMatch(/new request/i);

    // Only the recipient answers; the sender cannot accept their own request; others cannot see it.
    await mentee.agent.patch(`/api/me/workspace/requests/${sent.body.id}`).send({ status: "accepted" }).expect(403);
    await stranger.agent.patch(`/api/me/workspace/requests/${sent.body.id}`).send({ status: "declined" }).expect(404);
    const before = await mentor.agent.get("/api/me/workspace/requests?box=in").expect(200);
    expect(before.body.items[0].person.email).toBeNull(); // email hidden until accepted
    await mentor.agent.patch(`/api/me/workspace/requests/${sent.body.id}`).send({ status: "accepted", reply: "Happy to help." }).expect(200);
    const after = await mentor.agent.get("/api/me/workspace/requests?box=in").expect(200);
    expect(after.body.items[0].person.email).toBe(mentee.email);

    const people = await mentor.agent.get("/api/me/workspace/connections").expect(200);
    expect(people.body.connected.map((p: { id: string }) => p.id)).toContain(mentee.userId);
    await mentor.agent.post("/api/me/workspace/messages").send({ to: [mentee.userId], subject: "Welcome", body: "Send me your draft." }).expect(201);
    await mentor.agent.post("/api/me/workspace/messages").send({ to: [stranger.userId], subject: "Hi", body: "x" }).expect(403);
    const inbox = await mentee.agent.get("/api/me/workspace/messages?box=in").expect(200);
    expect(inbox.body.items[0].subject).toBe("Welcome");
    // The sender cannot mark the recipient's message read or delete it.
    await mentor.agent.delete(`/api/me/workspace/messages/${inbox.body.items[0].id}`).expect(404);
  });

  it("lets only approved members send requests", async () => {
    const mentor = await signedInMember(t, { approve: true });
    const pending = await signedInMember(t);
    const res = await pending.agent.post("/api/me/workspace/requests").send({ kind: "mentorship", mentor: await slugOf(mentor.userId), message: "Please mentor me on my thesis." }).expect(403);
    expect(res.body.error.code).toBe("MEMBERSHIP_NOT_APPROVED");
  });

  it("rejects unsafe profile links and turns an ORCID iD into its address", async () => {
    const m = await signedInMember(t, { approve: true });
    await m.agent.patch("/api/me/profile").send({ links: { website: "javascript:alert(1)" } }).expect(400);
    const ok = await m.agent.patch("/api/me/profile").send({ links: { orcid: "0000-0002-1825-0097" } }).expect(200);
    expect(ok.body.profile.links.orcid).toBe("https://orcid.org/0000-0002-1825-0097");
  });

  it("only accepts PDFs and images as resource files", async () => {
    const m = await signedInMember(t, { approve: true });
    await m.agent.post("/api/me/workspace/resources/file").field("title", "Notes").attach("file", Buffer.from("<script>alert(1)</script>"), { filename: "notes.pdf", contentType: "application/pdf" }).expect(400);
    const pdf = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
    await m.agent.post("/api/me/workspace/resources/file").field("title", "Guide").attach("file", pdf, { filename: "guide.pdf", contentType: "application/pdf" }).expect(201);
    const list = await m.agent.get("/api/me/workspace/resources").expect(200);
    expect(list.body[0]).toMatchObject({ title: "Guide", kind: "file", mime: "application/pdf" });
  });

  it("sends member mail to the team inbox under the account's own name, with a daily limit", async () => {
    const m = await signedInMember(t, { approve: true });
    await asMentee(m.userId);
    await m.agent.post("/api/me/workspace/support").send({ subject: "Help finding a mentor", message: "Could you suggest a mentor in machine learning?" }).expect(201);
    const [row] = await t.db.select().from(schema.contactMessages).where(eq(schema.contactMessages.email, m.email));
    expect(row!.subject).toBe("[Mentee] Help finding a mentor");
    const history = await m.agent.get("/api/me/workspace/support").expect(200);
    expect(history.body).toHaveLength(1);
    for (let i = 0; i < 4; i++) await m.agent.post("/api/me/workspace/support").send({ subject: `Q${i}`, message: "Another question for the team." }).expect(201);
    const limited = await m.agent.post("/api/me/workspace/support").send({ subject: "Q5", message: "One more question for the team." }).expect(400);
    expect(limited.body.error.code).toBe("RATE_LIMITED");
  });

  it("shows a mentee's profile to the mentor they asked, but not their email before accepting", async () => {
    const mentor = await signedInMember(t, { approve: true });
    const mentee = await signedInMember(t, { approve: true });
    await asMentee(mentee.userId);
    await mentee.agent.patch("/api/me/profile").send({ bio: "PhD student in machine learning.", links: { scholar: "https://scholar.google.com/citations?user=abc" } }).expect(200);
    await mentee.agent.post("/api/me/workspace/requests").send({ kind: "mentorship", mentor: await slugOf(mentor.userId), message: "Please guide my thesis work." }).expect(201);
    const inbox = await mentor.agent.get("/api/me/workspace/requests?box=in").expect(200);
    expect(inbox.body.items[0].person.profile.bio).toBe("<p>PhD student in machine learning.</p>");
    expect(inbox.body.items[0].person.profile.links.scholar).toContain("scholar.google.com");
    expect(inbox.body.items[0].person.email).toBeNull();
    // The mentee's own sent list does not carry the mentor's private profile fields.
    const sent = await mentee.agent.get("/api/me/workspace/requests?box=out").expect(200);
    expect(sent.body.items[0].person.profile).toBeUndefined();
  });

  it("keeps Funding & Grants to mentors", async () => {
    const mentor = await signedInMember(t, { approve: true });
    const mentee = await signedInMember(t, { approve: true });
    await asMentee(mentee.userId);
    const call = await mentor.agent.post("/api/me/workspace/funding").send({ title: "PhD place", description: "Funded.", deadline: null, link: null, expertiseIds: [], open: true }).expect(201);
    await mentee.agent.get("/api/me/workspace/funding?scope=open").expect(403);
    await mentee.agent.post("/api/me/workspace/funding").send({ title: "x", description: "", deadline: null, link: null, expertiseIds: [], open: true }).expect(403);
    await mentee.agent.post("/api/me/workspace/requests").send({ kind: "funding", fundingId: call.body.id, message: "I would like to apply." }).expect(403);
  });
});

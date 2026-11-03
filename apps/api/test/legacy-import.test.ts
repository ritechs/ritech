import { schema } from "@ritechs/db";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { writeFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { countryFrom, htmlOf, runImport, socialLinkOf, trackOf } from "../src/cli/legacy-import.js";
import { readDump } from "../src/cli/mysql-dump.js";
import { nextIp, signedInStaff, startApp, WEB, type TestApp } from "./helpers.js";

let t: TestApp;
const file = "/tmp/ritechs-legacy-fixture.sql";

beforeAll(async () => {
  t = await startApp();
  const hash = (await bcrypt.hash("Old-Site-Pass-1", 10)).replace(/^\$2[ab]\$/, "$2y$");
  writeFileSync(
    file,
    `CREATE TABLE \`users\` (\n  \`id\` bigint(20),\n  \`name\` varchar(255),\n  \`last_name\` varchar(255),\n  \`email\` varchar(255),\n  \`password\` varchar(255),\n  \`created_at\` timestamp,\n  \`updated_at\` timestamp,\n  \`user_type\` enum('Mentor','Mentee','admin','Conference')\n) ENGINE=InnoDB;
INSERT INTO \`users\` (\`id\`, \`name\`, \`last_name\`, \`email\`, \`password\`, \`created_at\`, \`updated_at\`, \`user_type\`) VALUES
(9001, 'Ada', 'O\\'Neill', 'Ada.Legacy@Example.org', '${hash}', '2022-01-02 10:00:00', NULL, 'Mentor'),
(9002, 'Root', NULL, 'root-legacy@example.org', '${hash}', NULL, NULL, 'admin'),
(9003, 'Mia Chen', '', 'mia-legacy@example.org', '${hash}', '2023-05-01 08:00:00', NULL, 'Mentee');
INSERT INTO \`user_details\` (\`id\`, \`user_id\`, \`user_type\`, \`name\`, \`last_name\`, \`phone\`, \`gender\`, \`affiliation\`, \`mentor_status\`, \`popular_mentor\`, \`orcid_id\`, \`biography\`, \`image\`, \`account_status\`, \`designation\`, \`location\`, \`highest_education\`) VALUES
(1, 9001, 'Mentor', 'Ada', 'O\\'Neill', '07911123456', 'Female', 'University of Leeds', 'Advisor', 1, 'https://orcid.org/ 0000-0003-3635-572X', 'Line one;\\nline two', '1634533967.png', 2, 'Professor', 'Wolverhampton, West Midlands', 'phD'),
(2, 9003, 'Mentee', 'Mia Chen', '', NULL, NULL, 'BUET', 'Mentee', NULL, '', NULL, NULL, 1, NULL, 'Dhaka,Bangladesh', 'Masters');
INSERT INTO \`expertises\` (\`id\`, \`name\`, \`status\`) VALUES (5, 'Wireless networks', 1);
INSERT INTO \`user_expertises\` (\`id\`, \`user_id\`, \`expertise_id\`) VALUES (1, 9001, 5);
INSERT INTO \`events\` (\`id\`, \`subject\`, \`description\`, \`type\`, \`location\`, \`duration\`, \`fee\`, \`status\`, \`currency\`, \`file\`) VALUES
(901, 'Roadshow Test College', 'A <b>roadshow</b>', 'Roadshow for Test College', 'Walsall', '11th March 2024 | 9:30 AM - 2:00 PM GMT', 0, 1, NULL, 'x.png');
INSERT INTO \`event_requests\` (\`id\`, \`event_id\`, \`name\`, \`email\`, \`phone\`, \`organization\`, \`instruction\`, \`status\`) VALUES
(1, 901, 'Student A', 'a@example.org', '07911123456', 'College', NULL, 1),
(2, 901, 'Student A', 'A@example.org', '07911123456', 'College', NULL, 1);
INSERT INTO \`social_links\` (\`id\`, \`user_id\`, \`social\`, \`url\`) VALUES
(1, 9001, 'fa-twitter', 'https://www.linkedin.com/in/ada-oneill/'),
(2, 9001, 'fa-facebook-f', 'https://www.facebook.com/'),
(3, 9001, 'fa-twitter', 'https://twitter.com/adaoneill');
INSERT INTO \`projects\` (\`id\`, \`user_id\`, \`title\`, \`topics\`, \`collaborator\`, \`status\`, \`year\`) VALUES
(1, 9001, 'Low-power routing for rural sensor networks', 'Wireless', 1, 1, '2022'),
(2, 9001, 'test project', 'ml', 1, 1, '2021');
INSERT INTO \`conferences\` (\`id\`, \`subject\`, \`description\`, \`location\`, \`start_date\`, \`end_date\`, \`file\`, \`status\`, \`about\`, \`join_us\`, \`paper_submission\`, \`price_description\`, \`camera_paper_submission\`, \`crp_submission_link\`, \`subject_description\`, \`cfp_file\`, \`cp_file\`, \`sp_link\`, \`slug\`, \`external_link\`) VALUES
(9100, 'TESTCONF 2031', '<p>&nbsp;</p><ul><li><strong>Springer</strong> proceedings</li></ul><script>x()</script>', 'Leeds, UK (Hybrid)', '2031-07-09', '2031-07-10', '1.png', 1, 'First paragraph.\r\n\r\nSecond & last.', 'Join us.', '<p>Submit via CMT.</p>', 'Contact us.', '<p>TBC</p>', 'www.ieee.org/templates.html', '1st Test Conference 2031 (Hybrid)', '2.pdf', NULL, 'https://cmt3.research.microsoft.com/TEST2031', 'TESTCONF2031&Workshop', NULL);
INSERT INTO \`conference_prices\` (\`id\`, \`conference_id\`, \`title\`, \`local_price\`, \`overseas_price\`, \`local_currency\`, \`overseas_currency\`) VALUES
(1, 9100, 'Student', 5000, 150, 'BDT', 'USD'),
(2, 9100, 'Academic', 400, 400, 'EUR', 'EUR'),
(3, 9999, 'Orphan of a deleted conference', 1, 1, NULL, NULL);
INSERT INTO \`conference_schedules\` (\`id\`, \`conference_id\`, \`title\`, \`date\`) VALUES (2, 9100, 'Camera ready', '2031-05-01'), (1, 9100, 'Paper deadline', '2031-03-01');
INSERT INTO \`mejor_tracks\` (\`id\`, \`conference_id\`, \`title\`, \`description\`) VALUES (1, 9100, 'Security', 'Hacking /Phishing / Malware');
INSERT INTO \`organising_committees\` (\`id\`, \`conference_id\`, \`title\`, \`description\`) VALUES (1, 9100, 'General Chair', 'Prof A, Leeds/ Dr B, Genoa,');
INSERT INTO \`blogs\` (\`id\`, \`title\`, \`description\`, \`image\`, \`status\`, \`blog_date\`) VALUES
(9201, 'Seminar on publishing well', 'Keynote speaker Dr A explained how to choose a journal, write a strong abstract, respond to reviewers and avoid predatory publishers in a packed session.', '9.jpg', 1, '2022-04-20'),
(9202, 'Seminar recap', 'Dr A explained how to choose a journal', '8.jpg', 1, '2022-04-21');
INSERT INTO \`image_folders\` (\`id\`, \`name\`, \`status\`) VALUES (9301, 'Test Album 2031', 1);
INSERT INTO \`gallery_images\` (\`id\`, \`gallery_id\`, \`image\`) VALUES (2, 9301, 'b.jpg'), (1, 9301, 'a.jpg');
`,
  );
});
afterAll(async () => {
  await t.close();
});

describe("legacy import", () => {
  it("parses MySQL escapes and multi-row inserts", () => {
    const rows = readDump(`INSERT INTO \`x\` (\`a\`, \`b\`) VALUES (1, 'it\\'s; ok'), (NULL, 'two\\nlines');`).get("x")!;
    expect(rows).toEqual([{ a: 1, b: "it's; ok" }, { a: null, b: "two\nlines" }]);
  });

  it("infers countries from free-text locations", () => {
    expect(countryFrom("Wolverhampton, West Midlands")).toBe("GB");
    expect(countryFrom("Dhaka,Bangladesh")).toBe("BD");
    expect(countryFrom("Norman, Oklahoma, United States")).toBe("US");
    expect(countryFrom("123")).toBeNull();
  });

  it("imports members with profiles and skips admin accounts, idempotently", async () => {
    const first = await runImport(t.db, file);
    expect(first.counts.accounts).toBe(2);
    expect(first.counts.skipped_admin_accounts).toBe(1);
    const second = await runImport(t.db, file);
    expect(second.counts.accounts ?? 0).toBe(0);
    expect(second.counts.conflicts ?? 0).toBe(0);

    const [ada] = await t.db.select().from(schema.memberProfiles).where(eq(schema.memberProfiles.legacyId, 9001));
    expect(ada).toMatchObject({ type: "mentor", status: "approved", lastName: "O'Neill", country: "GB", qualification: "Ph.D.", position: "Professor", membershipLabel: "Advisor", featured: true, legacyPhotoPath: "uploads/1634533967.png", phoneE164: "+447911123456" });
    expect(ada!.links.orcid).toBe("https://orcid.org/0000-0003-3635-572X");
    const [mia] = await t.db.select().from(schema.memberProfiles).where(eq(schema.memberProfiles.legacyId, 9003));
    expect(mia).toMatchObject({ firstName: "Mia", lastName: "Chen", status: "pending", country: "BD" });
    const [root] = await t.db.select().from(schema.user).where(sql`lower(email) = 'root-legacy@example.org'`);
    expect(root).toBeUndefined();

    const regs = await t.db.select().from(schema.registrations).where(sql`legacy_id IN (1, 2)`);
    expect(regs).toHaveLength(1);
    const [ev] = await t.db.select().from(schema.events).where(eq(schema.events.legacyId, 901));
    expect(ev!.startsAt!.toISOString()).toBe("2024-03-11T09:30:00.000Z");
  });

  it("normalises old social links, rich text and track lists", () => {
    expect(socialLinkOf("https://www.linkedin.com/in/smnsadat/")).toEqual(["linkedin", "https://www.linkedin.com/in/smnsadat"]);
    expect(socialLinkOf("https://twitter.com/")).toBeNull(); // a bare home page, not a profile
    expect(socialLinkOf("https://www.linkedin.com/feed/")).toBeNull();
    expect(socialLinkOf("ping543f")).toBeNull();
    expect(htmlOf("<p>&nbsp;</p>")).toBeNull();
    expect(htmlOf("N/A")).toBeNull();
    expect(htmlOf("One.\r\n\r\nTwo & 2 < 3")).toBe("<p>One.</p><p>Two &amp; 2 &lt; 3</p>");
    expect(trackOf("T", "Hacking /Phishing / Malware")).toEqual({ title: "T", description: null, scope: "Hacking; Phishing; Malware" });
    expect(trackOf("T", "This track explores the fundamental principles and enabling technologies of the field. /It aims to highlight system models and interoperability frameworks.").description).toMatch(/^This track .* It aims/);
  });

  it("imports conferences with every section, news, gallery and member extras", async () => {
    const report = await runImport(t.db, file);
    expect(report.counts.news_duplicates_skipped).toBe(1);
    const [conf] = await t.db.select().from(schema.conferences).where(eq(schema.conferences.legacyId, 9100));
    expect(conf).toMatchObject({
      slug: "TESTCONF2031-Workshop", acronym: "TESTCONF 2031", title: "1st Test Conference 2031 (Hybrid)", mode: "hybrid", status: "published",
      about: "<p>First paragraph.</p><p>Second &amp; last.</p>", cameraReady: null, cameraReadyUrl: "https://www.ieee.org/templates.html",
      submissionUrl: "https://cmt3.research.microsoft.com/TEST2031", registrationNote: "Contact us.",
      legacyCoverPath: "uploads/1.png", legacyCallForPapersPath: "uploads/2.pdf", legacyCameraReadyPath: null,
    });
    expect(conf!.highlights).toContain("<strong>Springer</strong>");
    expect(conf!.highlights).not.toContain("script");
    const fees = await t.db.select().from(schema.conferenceFees).where(eq(schema.conferenceFees.conferenceId, conf!.id)).orderBy(schema.conferenceFees.position);
    expect(fees.map((f) => [f.category, f.regularAmount, f.currency, f.overseasAmount, f.overseasCurrency])).toEqual([
      ["Student", "5000.00", "BDT", "150.00", "USD"],
      ["Academic", "400.00", "EUR", null, null],
    ]);
    const dates = await t.db.select().from(schema.conferenceDates).where(eq(schema.conferenceDates.conferenceId, conf!.id)).orderBy(schema.conferenceDates.position);
    expect(dates.map((d) => d.label)).toEqual(["Paper deadline", "Camera ready"]);
    const [committee] = await t.db.select().from(schema.conferenceCommittee).where(eq(schema.conferenceCommittee.conferenceId, conf!.id));
    expect(committee!.members).toEqual(["Prof A, Leeds", "Dr B, Genoa"]);

    const [ada] = await t.db.select().from(schema.memberProfiles).where(eq(schema.memberProfiles.legacyId, 9001));
    expect(ada!.links).toMatchObject({ linkedin: "https://www.linkedin.com/in/ada-oneill", twitter: "https://twitter.com/adaoneill" });
    expect(ada!.links.facebook).toBeUndefined();
    expect(ada!.projects).toEqual([{ title: "Low-power routing for rural sensor networks", topic: "Wireless", year: "2022" }]);

    const posts = await t.db.select().from(schema.newsPosts).where(sql`legacy_id IN (9201, 9202)`);
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({ category: "Seminar", legacyCoverPath: "uploads/9.jpg", status: "published" });

    // Public API: old files resolve to the old server; the album keeps photo order.
    const http = () => t.http().set("Origin", WEB).set("X-Forwarded-For", nextIp());
    const pub = await http().get(`/api/conferences/${conf!.slug}`).expect(200);
    expect(pub.body.coverUrl).toBe("https://ritechs.org/uploads/1.png");
    expect(pub.body.callForPapersUrl).toBe("https://ritechs.org/uploads/2.pdf");
    expect(pub.body).not.toHaveProperty("legacyCoverPath");
    const album = await http().get("/api/gallery/test-album-2031").expect(200);
    expect(album.body.items.map((i: { url: string }) => i.url)).toEqual(["https://ritechs.org/uploads/a.jpg", "https://ritechs.org/uploads/b.jpg"]);

    // Re-running changes nothing.
    await runImport(t.db, file);
    const tracks = await t.db.select().from(schema.conferenceTracks).where(eq(schema.conferenceTracks.conferenceId, conf!.id));
    expect(tracks).toHaveLength(1);
    expect(await t.db.select().from(schema.galleryItems).where(sql`legacy_path LIKE 'uploads/_.jpg'`)).toHaveLength(2);
  });

  it("publishes live counts at /api/stats", async () => {
    const res = await t.http().set("Origin", WEB).set("X-Forwarded-For", nextIp()).get("/api/stats").expect(200);
    for (const k of ["conferences", "mentors", "members", "partners", "countries", "events", "publications"]) expect(typeof res.body[k]).toBe("number");
    expect(res.body.conferences).toBeGreaterThanOrEqual(1);
  });

  it("old members sign in with their old password, which is then upgraded", async () => {
    const http = () => t.http().set("Origin", WEB).set("X-Forwarded-For", nextIp());
    await http().post("/api/auth/sign-in/email").send({ email: "ada.legacy@example.org", password: "Old-Site-Pass-1" }).expect(200);
    const [acc] = await t.db.select({ p: schema.account.password }).from(schema.account).innerJoin(schema.user, eq(schema.user.id, schema.account.userId)).where(sql`lower(${schema.user.email}) = 'ada.legacy@example.org'`);
    expect(acc!.p!.startsWith("$2")).toBe(false);
    // Pending (unverified) members must confirm their email first.
    const pending = await http().post("/api/auth/sign-in/email").send({ email: "mia-legacy@example.org", password: "Old-Site-Pass-1" });
    expect(pending.status).toBe(403);
    // Old profile URLs (/mentor-common-view/9001) resolve by legacy id.
    const profile = await http().get("/api/mentors/9001").expect(200);
    expect(profile.body.membershipLabel).toBe("Advisor");
    expect(profile.body.links.orcid).toContain("orcid.org");
  });

  it("admins can approve old-site applicants directly, which confirms their email", async () => {
    const admin = await signedInStaff(t, "admin");
    const [mia] = await t.db.select({ userId: schema.memberProfiles.userId }).from(schema.memberProfiles).where(eq(schema.memberProfiles.legacyId, 9003));
    await admin.agent.post(`/api/admin/members/${mia!.userId}/review`).send({ action: "approve" }).expect(201);
    const [u] = await t.db.select({ v: schema.user.emailVerified }).from(schema.user).where(eq(schema.user.id, mia!.userId));
    expect(u!.v).toBe(true);
    await t.http().set("Origin", WEB).set("X-Forwarded-For", nextIp()).post("/api/auth/sign-in/email").send({ email: "mia-legacy@example.org", password: "Old-Site-Pass-1" }).expect(200);
  });
});

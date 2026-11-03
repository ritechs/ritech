/**
 * Content pages built into the website. Each keeps its designed layout until
 * staff publish an edited version in Admin → Website Pages (the database page
 * with the same slug), which then replaces the page's text. Any other page
 * created in the admin is served at /pages/<slug>.
 */
export interface SitePage {
  /** Key in the pages table (lower case; the old site's slug). */
  slug: string;
  title: string;
  /** Where the page lives on the website. */
  href: string;
  section: "About" | "Membership" | "Mentoring" | "Event" | "Solutions" | "Training" | "Archives" | "Legal";
}

export const SITE_PAGES: SitePage[] = [
  { slug: "aboutus", title: "About", href: "/aboutus", section: "About" },
  { slug: "mission", title: "Mission & Vision", href: "/mission", section: "About" },
  { slug: "corevalue", title: "Core Value", href: "/corevalue", section: "About" },
  { slug: "future-goal", title: "Future Goal", href: "/future-goal", section: "About" },
  { slug: "procedure", title: "Procedure", href: "/procedure", section: "About" },
  { slug: "employees", title: "Employees", href: "/employees", section: "About" },
  { slug: "membership", title: "Membership", href: "/membership", section: "Membership" },
  { slug: "benefits", title: "Benefits", href: "/benefits", section: "Membership" },
  { slug: "why-join", title: "Why to Join RiTECHS", href: "/why-join", section: "Membership" },
  { slug: "subscription", title: "Subscription", href: "/subscription", section: "Membership" },
  { slug: "page-mentor", title: "Mentor", href: "/page-mentor", section: "Mentoring" },
  { slug: "page-mentee", title: "Mentee", href: "/page-mentee", section: "Mentoring" },
  { slug: "event", title: "Event", href: "/event", section: "Event" },
  { slug: "seminar", title: "Seminar", href: "/seminar", section: "Event" },
  { slug: "botcamp", title: "Boot Camp", href: "/botcamp", section: "Event" },
  { slug: "research-adda", title: "Research Adda", href: "/research-adda", section: "Event" },
  { slug: "cyber4me", title: "Cyber4Me", href: "/cyber4me", section: "Event" },
  { slug: "solutions", title: "Solutions", href: "/solutions", section: "Solutions" },
  { slug: "publication", title: "Publication", href: "/publication", section: "Solutions" },
  { slug: "academic-modification", title: "Academic Modification", href: "/academic-modification", section: "Solutions" },
  { slug: "poster", title: "Poster Presentation", href: "/poster", section: "Solutions" },
  { slug: "elearning", title: "Training", href: "/eLearning", section: "Training" },
  { slug: "trainingpartner", title: "Training Partner", href: "/TrainingPartner", section: "Training" },
  { slug: "archives", title: "Archives", href: "/archives", section: "Archives" },
  { slug: "privacy", title: "Privacy Policy", href: "/privacy", section: "Legal" },
];

export const sitePage = (slug: string) => SITE_PAGES.find((p) => p.slug === slug);
/** Public address of a page: its designed route, or /pages/<slug> for pages created in the admin. */
export const pageHref = (slug: string) => sitePage(slug)?.href ?? `/pages/${slug}`;

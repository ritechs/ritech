/**
 * Site-wide configuration: identity, navigation and routes.
 * Routes that aren't built yet render the branded "page in preparation"
 * screen (app/not-found.tsx), never a dead link.
 */
export const siteConfig = {
  shortName: "RiTECHS",
  name: "Research, Innovation, Technology & Solution",
  url: "https://ritechs.org",
  description:
    "RiTECHS connects researchers, scholars and innovators through publications, international conferences, mentorship and research training.",
  logo: {
    /** Slate (brand colour) recolour of the supplied white logo, for light backgrounds. */
    onLight: "/brand/ritechs-logo-slate.png",
    /** Original supplied logo (white on transparent), for dark backgrounds. */
    onDark: "/brand/ritechs-logo-white.png",
    width: 302,
    height: 130,
  },
  /** Social profiles, as linked from the old ritechs.org footer. */
  social: {
    facebook: "https://www.facebook.com/ritechs",
    x: "https://twitter.com/ritechsolution",
    linkedin: "https://www.linkedin.com/in/ri-tech-solution-0132131b7/",
    instagram: "https://www.instagram.com/ritechsolution/",
    youtube: "https://www.youtube.com/channel/UCRMr7tFy2kgmymRjtgzhAag",
  },
} as const;

export type NavLink = { label: string; href: string; description?: string };
export type NavGroup = { heading: string; links: NavLink[] };
/** A top-level item: a plain link, a dropdown list (`children`) or a grouped dropdown (`groups`). */
export type NavItem = NavLink & { children?: NavLink[]; groups?: NavGroup[] };

/**
 * Main navigation, mirroring the current ritechs.org menu. Paths keep the
 * existing URLs where the old site had them, so inbound links still resolve.
 */
export const primaryNav: NavItem[] = [
  { label: "Home", href: "/" },
  {
    label: "About",
    href: "/aboutus",
    children: [
      { label: "About RiTECHS", href: "/aboutus" },
      { label: "Mission & Vision", href: "/mission" },
      { label: "Core Value", href: "/corevalue" },
      { label: "Future Goal", href: "/future-goal" },
      { label: "Procedure", href: "/procedure" },
      { label: "Employees", href: "/employees" },
    ],
  },
  {
    label: "Membership",
    href: "/membership",
    groups: [
      {
        heading: "Join us",
        links: [
          { label: "Mentor", href: "/page-mentor", description: "What mentoring with RiTECHS involves" },
          { label: "Mentee", href: "/page-mentee", description: "Get guidance from a mentor" },
          { label: "Mentoring Directory", href: "/mentorship", description: "Browse RiTECHS mentors" },
        ],
      },
      {
        heading: "Why RiTECHS",
        links: [
          { label: "Why to Join RiTECHS", href: "/why-join" },
          { label: "Benefits", href: "/benefits" },
          { label: "Subscription", href: "/subscription" },
        ],
      },
    ],
  },
  { label: "Conference", href: "/conference" },
  { label: "Publication", href: "/publication" },
  {
    label: "Event",
    href: "/event",
    children: [
      { label: "All events", href: "/event" },
      { label: "Seminar", href: "/seminar" },
      { label: "Bootcamp", href: "/botcamp" },
      { label: "Research Adda", href: "/research-adda" },
      { label: "Cyber4me", href: "/cyber4me" },
    ],
  },
  {
    label: "Solutions",
    href: "/solutions",
    children: [
      { label: "All solutions", href: "/solutions" },
      { label: "Academic Modification", href: "/academic-modification" },
      { label: "Poster Presentation", href: "/poster" },
    ],
  },
  {
    label: "Training",
    href: "/eLearning",
    children: [
      { label: "Training & e-Learning", href: "/eLearning" },
      { label: "Training Partner", href: "/TrainingPartner" },
    ],
  },
  {
    label: "Archives",
    href: "/archives",
    children: [
      { label: "All archives", href: "/archives" },
      { label: "Gallery", href: "/gallery" },
    ],
  },
];

export const routes = {
  home: "/",
  login: "/login",
  forgotPassword: "/forgot-password",
  register: "/register",
  registerMentor: "/register/mentor",
  registerMentee: "/register/mentee",
  publications: "/publications",
  publication: (slug: string) => `/publications/${slug}`,
  mentor: (slug: string) => `/mentorship/${slug}`,
  mentorship: "/mentorship",
  conferences: "/conference",
  conference: (slug: string) => `/conferences/${encodeURIComponent(slug)}`,
  events: "/#events",
  news: "/news",
  newsArticle: (slug: string) => `/news/${slug}`,
  privacy: "/privacy",
  resetPassword: "/reset-password",
  account: "/account",
  dashboard: "/dashboard",
} as const;

/** Every link reachable from a nav item, for active-state checks. */
export function navItemLinks(item: NavItem): NavLink[] {
  return [item, ...(item.children ?? []), ...(item.groups?.flatMap((g) => g.links) ?? [])];
}

export const footerNav: { heading: string; links: NavLink[] }[] = [
  {
    heading: "For Mentees",
    links: [
      { label: "Search mentors", href: "/mentorship" },
      { label: "Become a mentee", href: "/register/mentee" },
      { label: "Log in", href: "/login" },
    ],
  },
  {
    heading: "For Mentors",
    links: [
      { label: "Mentoring directory", href: "/mentorship" },
      { label: "Become a mentor", href: "/register/mentor" },
      { label: "Log in", href: "/login" },
    ],
  },
  {
    heading: "Conferences & Events",
    links: [
      { label: "All conferences", href: "/conference" },
      { label: "Seminars", href: "/seminar" },
      { label: "News", href: "/news" },
    ],
  },
  {
    heading: "Services",
    links: [
      { label: "Academic modification", href: "/academic-modification" },
      { label: "Poster presentation", href: "/poster" },
      { label: "Training", href: "/eLearning" },
      { label: "Publication", href: "/publication" },
    ],
  },
];

export const legalNav: NavLink[] = [
  { label: "Privacy Policy", href: "/privacy" },
];


/** Links for a menu section, used for in-page section navigation. */
export function sectionLinks(label: string): NavLink[] {
  const item = primaryNav.find((i) => i.label === label);
  if (!item) return [];
  return item.children ?? item.groups?.flatMap((g) => g.links) ?? [item];
}

import type { Service } from "@/lib/types";

/** Based on "Our main focus" on the current ritechs.org homepage. */
export const services: Service[] = [
  {
    id: "publication",
    title: "Research Publication Support",
    description: "Guidance from manuscript to submission: choosing a journal, structuring the paper and responding to reviewers.",
    cta: { label: "Get Publication Support", href: "/publication" },
  },
  {
    id: "mentorship",
    title: "Academic Mentorship",
    description: "One-to-one guidance from experienced academics and industry researchers around the world.",
    cta: { label: "Find a Mentor", href: "/page-mentor" },
  },
  {
    id: "conferences",
    title: "Conference & Workshop Organisation",
    description: "Planning and running conferences and workshops of any size, from focused seminars to international events.",
    cta: { label: "Organise a Conference", href: "/conference" },
  },
  {
    id: "editing",
    title: "Academic Editing & Proofreading",
    description: "Editing, proofreading and formatting of academic writing by native English speakers.",
    cta: { label: "Request Editing", href: "/academic-modification" },
  },
  {
    id: "training",
    title: "Research Training",
    description: "Workshops on research design, methods, data analysis and scholarly writing.",
    cta: { label: "See Training Courses", href: "/eLearning" },
  },
  {
    id: "elearning",
    title: "Digital Learning",
    description: "Self-paced online courses on research methods, data analysis and academic writing.",
    cta: { label: "Browse Online Courses", href: "/eLearning" },
  },
];

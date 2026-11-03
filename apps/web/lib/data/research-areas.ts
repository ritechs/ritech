import type { ResearchArea, ResearchAreaSlug } from "@/lib/types";

export const researchAreas: ResearchArea[] = [
  {
    slug: "ai-ml",
    name: "Artificial Intelligence & Machine Learning",
    shortName: "AI & Machine Learning",
    description: "Learning systems, language and vision models, and the responsible use of AI in practice.",
  },
  {
    slug: "cybersecurity",
    name: "Cybersecurity & Digital Systems",
    shortName: "Cybersecurity",
    description: "Securing networks, connected vehicles and critical infrastructure against emerging threats.",
  },
  {
    slug: "data-science",
    name: "Data Science & Analytics",
    shortName: "Data Science",
    description: "Statistical modelling, forecasting and quantitative methods that turn data into evidence.",
  },
  {
    slug: "software-engineering",
    name: "Software Engineering",
    shortName: "Software Engineering",
    description: "How software is designed, built, reviewed and maintained — in industry and in research labs.",
  },
  {
    slug: "sustainable-technology",
    name: "Sustainable Technology",
    shortName: "Sustainable Technology",
    description: "Energy systems, green computing and technology for sustainable business and communities.",
  },
  {
    slug: "emerging-technologies",
    name: "Innovation & Emerging Technologies",
    shortName: "Emerging Technologies",
    description: "IoT, smart systems and digital transformation, from early prototypes to adoption.",
  },
];

const bySlug = new Map(researchAreas.map((a) => [a.slug, a]));
export const getResearchArea = (slug: ResearchAreaSlug) => bySlug.get(slug)!;

/**
 * Registration options, matching the current ritechs.org mentor and
 * mentee forms. Edit here to change what appears in the selects.
 */
export type MemberRole = "mentor" | "mentee";

export const genders = ["Male", "Female"] as const;

export const positions: Record<MemberRole, string[]> = {
  mentor: [
    "Lecturer",
    "Senior Lecturer",
    "Associate Professor",
    "Research Fellow",
    "Professor",
    "Industrial Researcher",
    "Scientist",
  ],
  mentee: ["Student", "Professional"],
};

export const qualifications: Record<MemberRole, string[]> = {
  mentor: ["Ph.D.", "MD", "MBChB", "Other"],
  mentee: ["Graduate", "Diploma"],
};

export const photoRules = {
  types: ["image/jpeg", "image/png", "image/gif"],
  accept: ".jpg,.jpeg,.png,.gif",
  maxBytes: 2 * 1024 * 1024,
  label: "JPG, GIF or PNG. Max size of 2MB",
};

export const BIO_MAX = 600;

export const roleCopy: Record<MemberRole, { title: string; intro: string; points: string[] }> = {
  mentor: {
    title: "Mentor registration",
    intro: "Share your experience and help the next generation of researchers.",
    points: [
      "Appear in the RiTECHS Mentoring Directory",
      "Guide mentees on research design, writing and publication",
      "Invitations to review, chair sessions and speak at events",
    ],
  },
  mentee: {
    title: "Mentee registration",
    intro: "Get guidance from experienced academics and industry researchers.",
    points: [
      "Request a mentor from the Mentoring Directory",
      "Support with research design, methods and publication",
      "Early access to seminars, bootcamps and calls for papers",
    ],
  },
};

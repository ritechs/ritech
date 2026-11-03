/**
 * EVENTS, SOLUTIONS & TRAINING — copied from ritechs.org (November 2026):
 * /event, /seminar, /botcamp, /research-adda, /cyber4me,
 * /academic-modification, /poster, /eLearning, /TrainingPartner.
 * Contact phone numbers on those pages were placeholders (+44 (0) 1234 678910)
 * and are replaced with the organisation's real contact details.
 */

export const eventsIntro =
  "Meet professionals in your area and enjoy world-class content at one of the numerous events RiTECHS proudly organizes or participates in each year.";

export const eventTypes = [
  {
    slug: "seminar",
    href: "/seminar",
    title: "Seminar",
    summary:
      "The RiTECHS research seminar is a key active method of acquiring the professional competencies graduates need in their future work.",
    contact: "Dr. Nadia Refat",
  },
  {
    slug: "botcamp",
    href: "/botcamp",
    title: "Boot Camp",
    summary:
      "Extensive support for students from the moment they enroll, throughout the programme and even after graduation.",
    contact: "Nafees Zaman",
  },
  {
    slug: "research-adda",
    href: "/research-adda",
    title: "Research Adda",
    summary: "A medium where you can connect with your preferred professional through live research chat sessions.",
    contact: "Dr. S M Nazmus Sadat",
  },
  {
    slug: "cyber4me",
    href: "/cyber4me",
    title: "Cyber4Me",
    summary: "Fundamental cyber knowledge and skills for young adults aged 16–20, funded by DSIT.",
    contact: undefined,
  },
] as const;

export const seminar = {
  intro:
    "The RiTECHS research seminar is an essential part of the educational curriculum, designed to equip graduates with the professional skills necessary for their future careers. These seminars are conducted regularly and serve several key purposes:",
  purposes: [
    { title: "Professional Orientation", text: "Assisting students in selecting suitable fields and topics for their dissertations." },
    { title: "Academic Skills Development", text: "Enhancing students' capabilities in research preparation and execution." },
    {
      title: "Project Engagement",
      text: "Actively involving students in project activities and research and development (R&D) initiatives for government agencies.",
    },
    { title: "Publishing Opportunities", text: "Supporting students in writing and publishing scholarly papers and articles." },
    {
      title: "Information Management",
      text: "Teaching students how to gather, organize, and analyze information, as well as prepare analytical reports and documents.",
    },
    {
      title: "Workflow Familiarization",
      text: "Introducing students to standard workflows within government bodies and public organizations.",
    },
  ],
};

export const bootcamp = {
  paragraphs: [
    "At RiTECHS Boot Camps, we are committed to providing extensive support to our students from the moment they enroll and throughout their journey, even after graduation. We recognize that as you progress through the program, you may encounter questions or require additional assistance with the concepts covered in the coursework. Our dedication to being accessible and supportive is paramount; we offer virtual office hours where you can receive personalized help from mentors, support staff, and fellow students. This collaborative environment fosters a sense of community and ensures that you have the resources you need to succeed.",
    "In addition to academic support, we prioritize your professional development. Our student support and career services teams are dedicated to equipping you with a diverse array of resources designed to enhance your confidence and prepare you for the job market. We provide tailored guidance in resume writing, interview preparation, and networking strategies, ensuring that you can effectively showcase your newly acquired skills to potential employers. By offering workshops, one-on-one consultations, and access to industry connections, we strive to empower you to navigate your career path with assurance and success. At RiTECHS, your growth and future achievements are our top priorities.",
  ],
};

export const researchAdda = {
  intro:
    "Through our research chat sessions, you’ll gain valuable insights into various research topics. Register now to participate! If you’re unable to join the live session, you can access a recorded version via a provided link.",
  benefits: [
    "Learn how to write a research paper.",
    "Understand the process of publishing your research paper.",
    "Explore information about UGC Care Journals (paid, unpaid, and free).",
    "Discover details on Scopus Indexed Journals (paid, unpaid, and free).",
    "Gain insights into SCI / WoS Indexed Journals.",
    "Access information on DBLP, IEEE, and ACM Journals.",
    "Get updates on conferences and journal submissions.",
    "Find resources related to UGC NET and CSIR NET exams.",
  ],
};

export const cyber4me = {
  intro: [
    "Introducing ‘Cyber4Me,’ a transformative initiative designed to equip young adults aged 16–20 with fundamental cyber knowledge and skills, all while emphasizing the critical importance of cybersecurity across industries.",
    "Engaging participants through a dynamic series of activities, this project offers invaluable insights into cybersecurity principles and practical strategies for safeguarding both individuals and organizations against cyber threats.",
  ],
  closing:
    "Through these activities, Cyber4Me aims to equip participants with the necessary skills and knowledge to navigate the evolving landscape of cybersecurity effectively. By highlighting the importance of cybersecurity across industries and offering hands-on learning experiences, the project seeks to foster a culture of cyber resilience and preparedness among young adults.",
  sponsors: [
    "Funded by the Department for Science, Innovation and Technology",
    "Organized by the University of Wolverhampton",
  ],
};

export const academicModification = {
  intro:
    "Clear, concise, and flawless writing is essential in all aspects of life, whether you are a student, professional, or creative writer. Editing your own work can be challenging, as errors can diminish the effectiveness of your message. However, our experts at RiTECHS Academic Modification Service are here to correct any mistakes in your text and ensure that your writing flows coherently and effortlessly.",
  services: [
    {
      title: "Editing",
      text: "Editing confirms that your writing has the optimal impact on your audience. In addition to proofreading your document for errors and inconsistencies, we refine structure, clarity and flow.",
      contact: "Dr. Nadia Refat",
    },
    {
      title: "Proofreading",
      text: "We check for misspellings, incorrect or missing punctuation, and textual and numerical inconsistencies in your manuscript, thesis, statement, and creative work.",
      contact: "Dr. Nadia Refat",
    },
    {
      title: "Formatting",
      text: "We format your manuscript, thesis or statement to the required style guide or template, with consistent headings, references, figures and tables.",
      contact: "Dr. S M Nazmus Sadat",
    },
  ],
};

export const poster = {
  intro:
    "Academic poster presentations are excellent ways to showcase the research you have produced in front of an audience. When done correctly, posters effectively communicate your ideas to the audience using visuals. As the aim of these presentations is to demonstrate a summary of your research in a fixed amount of time, it becomes essential to highlight all the important aspects of your research while respecting the limits of the presentation.",
  guidance: [
    {
      title: "Tools",
      text: "Of the various computer programs which can be used to create a poster, Photoshop, Microsoft Publisher and PowerPoint are most commonly used by students and researchers. As a poster needs a lot of editing, it is essential to choose the right tool to work with. Each of these media has its own strengths and weaknesses in terms of technical capabilities.",
    },
    {
      title: "Sections",
      text: "Before starting a poster, break down all the research information you want to present into sections such as Summary, Introduction, Objectives, Theory, Results, and Conclusion, depending on the specifics of your research. An ideal poster has four to eight such sections arranged in three or four columns. As posters are read from left to right and top to bottom, lay out all the sections strategically so they can be read in order.",
    },
    {
      title: "Design",
      text: "Use a simple format that is easily readable. The background should be pure white or have a subtle pattern which does not distract the audience. Although universities recommend the ideal font size and style, the text used in your poster must be clear and easily readable. Charts and graphics should be easy to understand, free from unnecessary elements, distributed evenly and kept equally sized.",
    },
  ],
  deliverables: ["No plagiarism", "Editable files", "Presentation speech notes included", "Quality report"],
  contact: "Dr. Nadia Refat",
};

export const training = {
  paragraphs: [
    "The RiTECHS training delivers high-quality, peer-reviewed online courses on a variety of topics. Many course hours in core and emerging technologies are delivered by RiTECHS, offering professionals, professors, and students from academic institutions a better way to learn.",
    "Researchers may use RiTECHS training to remain up to date on the newest advancements in relevant technologies, increasing collaboration with other research teams. These courses were created by accredited specialists in a variety of engineering and research technologies.",
  ],
};

export const conferenceServices = {
  intro:
    "Twice annually, RiTECHS hosts distinguished conferences that gather scholars, academics, graduate students, and influential thought leaders for a multi-day event frequently lauded as “the pinnacle of intellectual exchange” and “a glimpse into the future, alongside its architects.” These conferences are crafted to advance RiTECHS's mission of exploring and disseminating innovative ideas shaping tomorrow's world. Speakers, carefully curated by the RiTECHS team, are selected for their groundbreaking contributions and insights across a spectrum of disciplines — academics, educators, researchers, philanthropists, environmental advocates, scientists, technologists, artists, activists and more — each delivering concise presentations known as RiTECHS Talks.",
  whyJoin: [
    "Present your latest work to a knowledgeable audience for valuable feedback.",
    "Gain insights from top speakers on current advancements and future trends.",
    "Explore recent developments to understand evolving research directions.",
    "Connect with colleagues from around the world for new collaborations.",
    "See the latest tech solutions in the commercial exhibition.",
    "Get tips and insights from editors of leading publications.",
    "Participate in hands-on workshops, panels, and Q&A sessions.",
    "Form lasting networks with peers and mentors.",
    "Gain interdisciplinary insights across various fields.",
    "Join a community dedicated to knowledge and innovation.",
  ],
  attend:
    "We host numerous international conferences across computer science, physical sciences, and engineering, collaborating with leading experts in science and technology to support scientists, students, researchers, and information professionals.",
  organise:
    "We have extensive expertise in organizing conferences, exhibits, and seminars, delivering world-class content, exceptional delegate experiences, and unmatched networking opportunities.",
};

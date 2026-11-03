/**
 * Seed data: CONFERENCES — copied from ritechs.org/conference and each
 * ritechs.org/conferences/<slug> page (November 2026).
 * Committee lists are complete for DTISB-2027; for past conferences the
 * headline information (dates, venue, publication, tracks, speakers,
 * important dates) is kept.
 */

export interface Speaker {
  name: string;
  role?: string;
  organisation?: string;
}

export interface ConferenceTrack {
  title: string;
  description?: string;
  scope?: string;
  chairs?: string[];
}

export interface Conference {
  slug: string;
  acronym: string;
  title: string;
  /** ISO dates; undefined when the old site did not publish them */
  startDate?: string;
  endDate?: string;
  location?: string;
  format?: "Hybrid" | "In person" | "Online & in person";
  publication: string[];
  objective?: string;
  tracks: ConferenceTrack[];
  speakers: Speaker[];
  generalChairs?: string[];
  keyDates: { label: string; date: string }[];
  externalUrl?: string;
}

const cyberTracks: ConferenceTrack[] = [
  { title: "Cyber Security and Network Space Challenges and Solutions" },
  { title: "Cyber Security Challenges for Mobility, Transport Infrastructure, Connected and Autonomous Vehicles" },
  { title: "Cloud Security and its Future" },
  { title: "Blockchain Architecture and Security" },
  { title: "Securing the Connected World: Challenges and Solutions in IoT Cybersecurity" },
];

const ioeTracks: ConferenceTrack[] = [
  { title: "Intelligent Technologies for Internet of Everything" },
  { title: "Internet of Things and Intelligent Data Analytics for Internet of Everything" },
  { title: "Artificial Intelligence and Decision-making using IoE Technology" },
  { title: "Embedded Computing and Cyber-Physical Systems for the IoE" },
  { title: "Emerging Application of IoE" },
];

const icetcsObjective =
  "To provide a global platform for researchers, academicians, industry professionals, and policymakers to converge, share insights, and collaboratively explore the latest advancements and emerging trends in the field of cybersecurity. The conference facilitates discussions on cutting-edge research, innovative technologies, and practical solutions that address the evolving challenges posed by cyber threats in our interconnected world. By fostering interdisciplinary dialogue and knowledge exchange, it aims to contribute to robust cybersecurity strategies, enhance collaboration between academia and industry, and strengthen collective resilience against cyber threats on a global scale.";

const ioeObjective = (year: string) =>
  `ITSS-IoE ${year} aims to promote worldwide research work and the innovative, unique ideas of leading academic scientists, experts, researchers, and research scholars. It covers advanced engineering, intelligent technologies, and their applications in advanced computing and communication to ensure social development using Internet of Everything (IoE) systems for targeted audiences (users, researchers, robots, machines) and future ecosystems — a high-profile, leading-edge forum that reunites reputed researchers, research scholars, and engineers to exchange advanced and innovative ideas.`;

const recommendedJournals = [
  "International Journal of Information Privacy, Security and Integrity",
  "EAI Endorsed Transactions on Internet of Things",
  "Computers",
  "Journal of Network and Computer Applications",
  "Vehicular Communications",
];

export const dtisb2027Details = {
  intro: [
    "Accepted and presented papers of DTISB 2027 will be considered for publication in the official Springer conference proceedings, subject to peer review and publisher requirements.",
    "The conference aims to provide a high-quality academic platform for researchers, industry professionals, policymakers, and practitioners to disseminate original research, applied case studies, and emerging innovations in artificial intelligence, cyber resilience, digital transformation, sustainable business, and SDG-driven innovation.",
    "Selected high-quality papers may also be invited for extension and submission to special issues or edited volumes with partner journals and publishers, subject to further review and editorial approval.",
  ],
  joinUs: [
    "The conference welcomes high-quality research papers in areas related to artificial intelligence, cyber resilience, digital transformation, sustainable business, innovation, cybersecurity, data analytics, blockchain, cloud security, big data, digital trust, and SDG-driven business development.",
    "We also warmly invite proposals for tutorials, special sessions, workshops, forums, demonstrations, exhibitions and industry panels that address emerging challenges and opportunities in AI-enabled, secure and sustainable digital business environments.",
  ],
  submission: {
    deadline: "All papers must be submitted through the Microsoft CMT service. The paper submission deadline is 31 March 2027. Accepted papers will be submitted for publication in the Scopus-indexed proceedings with Springer.",
    structure: [
      { title: "Title", text: "Clearly indicates the problem, proposed solution or approach, and target domain." },
      { title: "Abstract", text: "Background, problem statement, aim, methodology or contribution, and expected research or social impact." },
      { title: "Introduction", text: "Topic, problem with evidence, aim and objectives, main contributions, and organisation of the paper." },
      { title: "Related Work", text: "Recent, relevant studies organised thematically, and how the proposed work differs." },
      { title: "Methodology", text: "Research process, framework, model, system design or experimental procedure; a block diagram or workflow is encouraged." },
      { title: "Results and Discussion", text: "Experimental setup, findings, analysis, and the significance of the results." },
      { title: "Conclusion", text: "Summary, key findings, contributions, limitations and future directions." },
      { title: "References", text: "At least 15 recent references, preferably from IEEE Xplore, Elsevier, Springer, ACM or other reputable publishers." },
    ],
    rules: [
      "Springer conference template, approximately 15 pages (not more than 15).",
      "Similarity index must not exceed 10%, excluding references; block similarity is not accepted.",
      "Double-blind review: no author names, affiliations or contact details in the initial manuscript.",
      "Original, unpublished work only; simultaneous submission elsewhere leads to rejection.",
      "Springer holds the copyright; a Springer copyright form is required for each accepted paper.",
    ],
    cmtNote:
      "The Microsoft CMT service was used for managing the peer-reviewing process for this conference. This service was provided for free by Microsoft, and they bore all expenses, including costs for Azure cloud services as well as for software development and support.",
  },
  sponsorship: [
    {
      tier: "Diamond / Title Sponsor",
      price: "US$15,000",
      availability: "Exclusive: 1 sponsor",
      highlights: [
        "Recognition as Diamond/Title Sponsor and prominent logo alongside the conference logo",
        "Up to 5 in-person and 5 online complimentary registrations",
        "Premium exhibition space at the University of Leeds and a virtual booth",
        "10-minute corporate presentation and a panel seat",
        "Sponsor one major keynote/plenary session",
        "Up to 3 dedicated social-media promotions",
        "Opportunity to provide a student/research excellence award",
      ],
    },
    {
      tier: "Platinum Sponsor",
      price: "US$10,000",
      availability: "Limited: 2 sponsors",
      highlights: [
        "Prominent logo on the website, programme and venue screens",
        "4 in-person and 4 online complimentary registrations",
        "Premium exhibition space and virtual exhibition presence",
        "10-minute presentation and panel or industry session",
        "Sponsorship of one thematic session",
        "Up to 2 social-media posts",
      ],
    },
    {
      tier: "Gold Sponsor",
      price: "US$6,000",
      availability: "Limited: 4 sponsors",
      highlights: [
        "Logo on the website, programme and selected signage",
        "3 in-person and 2 online complimentary registrations",
        "Standard exhibition space and virtual booth",
        "5–10 minute presentation; sponsor a thematic session",
        "One social-media post",
      ],
    },
    {
      tier: "Silver Sponsor",
      price: "US$3,000",
      availability: "Limited: 6 sponsors",
      highlights: [
        "Logo on the website, programme and digital screens",
        "2 in-person and 1 online complimentary registration",
        "Exhibition table and virtual sponsor profile",
        "One social-media recognition",
      ],
    },
  ],
  awards: [
    { award: "Overall Best Paper", prize: "$500" },
    { award: "Best Student Paper", prize: "$300" },
    { award: "Best Innovation & Digital Transformation Paper", prize: "$300" },
    { award: "Best Sustainable Business Paper", prize: "$300" },
  ],
  fees: [
    { category: "Academic / Researcher", early: "USD 450", regular: "USD 500", online: "USD 250" },
    { category: "Professional / Industry Participant", early: "USD 500", regular: "USD 550", online: "USD 300" },
    { category: "Postgraduate Student", early: "USD 250", regular: "USD 300", online: "USD 150" },
    { category: "Participant", early: "USD 300", regular: "USD 350", online: "—" },
  ],
  feesNote: "Fees are the same for local and overseas delegates. For questions contact Prof. Dr. Mohammad Faisal Ahammad or Prof Selim Ahmed.",
  committee: [
    { role: "General Chairs", names: ["Prof Dr Selim Ahmed, Dean, World University Bangladesh", "Prof Md Arafatur Rahman, University of Wolverhampton, UK"] },
    { role: "Executive General Chair", names: ["Prof Dr. Mohammed Faisal Ahammad, University of Leeds, UK"] },
    {
      role: "Publication Chairs",
      names: [
        "Dr Mahfuzur Rahman, University of Lincoln, UK",
        "Dr. Hasanul Banna, Manchester Metropolitan University",
        "Dr. Suborna Barua, University of Leeds",
      ],
    },
    {
      role: "Technical Program Committee",
      names: [
        "Prof. Dr. Muhammad Mohiuddin, Laval University, Canada",
        "Prof. Dr. Md. Mamun Habib, Independent University, Bangladesh",
        "Prof. Dr. Hafiz Hoque, Swansea University, UK",
        "Prof. Dr. Rafiuddin Ahmed, University of Dhaka, Bangladesh",
        "Dr. Rama Prasad Kanungo, UCL, UK",
        "Dr Anup Chodhury, Leeds Beckett University",
        "Dr. Sujana Shafique, Leeds Beckett University, UK",
        "Dr. Mamoon Bashir, University of Hull, UK",
        "Dr. Mahfuzur Rahman, University of Sharjah, UAE",
        "Fakhrul Islam, ABP Bangladesh",
        "Dr. Md Imtiaz Mostafiz, University of Leicester, UK",
        "Dr Farhad Ahmed, Maynooth University, Ireland",
        "Dr. Mohamed Mahees Raheem, Effat University, Saudi Arabia",
        "Dr. BM Hakim, Manchester Metropolitan University, UK",
        "Dr. Farhan Mustafa, Shiv Nadar University, India",
        "Dr. Syed Kumail Sajjad, IILM University, Greater Noida",
        "Dr. Bablu Kumar Dhar, Mahidol University, Thailand",
        "Dr. Muhammad Khalilur Rahman, Universiti Malaysia Kelantan, Malaysia",
        "Dr. Slimane ED-DAFALI, Chouaib Doukkali University, Morocco",
        "Dr. Muhammad Khairul Islam, Universiti Tenaga Nasional (UNITEN), Malaysia",
        "Dr. Muhammad Mehedi Masud, Sultan Sharif Ali Islamic University, Brunei Darussalam",
        "Dr. Mohammad Osman Gani, University Canada West (UCW), Canada",
        "Dr. Rubina Ahmed, Charles Sturt University, Australia",
        "Dr. Amin Noroozi, University of Wolverhampton, UK",
        "Dr. Abul Arafat, University of Wolverhampton, UK",
      ],
    },
  ],
};

export const conferences: Conference[] = [
  {
    slug: "DTISB-2027",
    acronym: "DTISB-2027",
    title: "International Conference on Digital Transformation and Innovation for Sustainable Business",
    startDate: "2027-07-09",
    endDate: "2027-07-10",
    location: "University of Leeds, UK",
    format: "Hybrid",
    publication: [
      "Accepted and presented papers will be considered for the official Springer conference proceedings (Scopus-indexed), subject to peer review and publisher requirements.",
      "Selected papers may be invited for special issues or edited volumes with partner journals and publishers.",
    ],
    objective:
      "The conference aims to facilitate high-quality discussions on cutting-edge research, innovative technologies, practical applications, and strategic solutions that address the rapidly evolving challenges faced by businesses, industries and societies in an increasingly digital and interconnected world. Particular emphasis will be placed on the role of artificial intelligence, digitalisation, cybersecurity, responsible innovation and sustainability in supporting resilient business ecosystems and advancing SDG-aligned development. By encouraging interdisciplinary dialogue, DTISB 2027 seeks to strengthen collaboration between academia, industry, government and international partners.",
    tracks: [
      {
        title: "Digital Transformation and Emerging Technologies",
        description:
          "The strategic and practical implications of digital transformation and emerging technologies for organizations, industries, and economies.",
        scope:
          "Digital transformation strategies; AI and machine learning; big data; IoT; blockchain; cloud computing; robotics and automation; Industry 4.0 and 5.0; digital platforms; digital twins; technology adoption and organizational readiness.",
        chairs: ["Dr. Rama Prasad Kanungo, UCL, UK", "Dr. Bablu Kumar Dhar, Mahidol University, Thailand"],
      },
      {
        title: "Artificial Intelligence, Generative AI and Intelligent Business",
        description:
          "The evolving role of AI and Generative AI in business and society: AI-enabled decision-making, intelligent processes, human–AI collaboration and responsible AI.",
        scope:
          "Generative AI; machine learning; AI adoption; AI-enabled decision-making; human–AI interaction; responsible and ethical AI; AI governance; AI in business functions; AI-driven innovation; AI and the future of work.",
        chairs: ["Dr. Suborna Barua, University of Leeds", "Dr. Syed Kumail Sajjad, IILM University, Greater Noida"],
      },
      {
        title: "Digital Innovation, Entrepreneurship and Business Models",
        description: "How digital technologies stimulate innovation, entrepreneurship, and new business models.",
        scope:
          "Digital entrepreneurship; innovation management; digital business models; startups; technology entrepreneurship; platform economy; open innovation; innovation ecosystems; FinTech; digital SMEs.",
        chairs: ["Dr Mahfuzur Rahman, University of Lincoln, UK", "Dr. Muhammad Mehedi Masud, Sultan Sharif Ali Islamic University, Brunei"],
      },
      {
        title: "Sustainable Business, Green Innovation and Circular Economy",
        description:
          "How digital technologies and innovative practices improve environmental performance, social responsibility and long-term sustainability.",
        scope:
          "Sustainable business strategies; green innovation; circular economy; ESG; sustainable supply chains; climate-smart business; responsible production and consumption; digital technologies for the SDGs.",
        chairs: ["Dr. Md Imtiaz Mostafiz, University of Leicester, UK", "Dr. Slimane ED-DAFALI, Chouaib Doukkali University, Morocco"],
      },
      {
        title: "Digital Marketing, Consumer Behavior and E-Commerce",
        description: "How digital transformation is changing marketing, consumer behaviour, customer experience and e-commerce.",
        scope:
          "Digital marketing; AI in marketing; social media marketing; consumer behavior; customer experience; e-commerce; social commerce; digital branding; personalization; digital CRM; influencer, immersive and metaverse marketing.",
        chairs: ["Prof. Dr. Rafiuddin Ahmed, University of Dhaka, Bangladesh", "Dr. Farhan Mustafa, Shiv Nadar University, India"],
      },
      {
        title: "Digital Operations, Supply Chain and Smart Manufacturing",
        description: "The transformation of operations, manufacturing, logistics, procurement and supply chains through digital technologies.",
        scope:
          "Digital supply chains; smart manufacturing; Industry 4.0/5.0; Lean and Six Sigma; quality management; sustainable operations; smart logistics; predictive maintenance; digital procurement; supply chain resilience.",
        chairs: ["Prof. Dr. Md. Mamun Habib, Independent University, Bangladesh", "Dr. Mamoon Bashir, University of Hull, UK"],
      },
      {
        title: "FinTech, Digital Accounting, Finance and Business Analytics",
        description: "How digital technologies transform financial services, decision-making, risk management, investment and analytics.",
        scope:
          "FinTech; digital banking; digital payments; AI in finance; financial analytics; blockchain and financial services; financial inclusion; digital assets; risk management; sustainable finance; ESG analytics.",
        chairs: ["Prof. Dr. Hafiz Hoque, Swansea University, UK", "Dr. Mohamed Mahees Raheem, Effat University, Saudi Arabia"],
      },
      {
        title: "Digital Human Resource Management, Leadership and the Future of Work",
        description: "The transformation of HRM, leadership, organizational behaviour and employment through digitalization and AI.",
        scope:
          "Digital HRM; HR analytics; AI-enabled recruitment; employee experience; digital learning; remote and hybrid work; human–AI collaboration; digital skills; leadership; organizational change; employee well-being.",
        chairs: ["Dr Farhad Ahmed, Maynooth University, Ireland", "Dr. Muhammad Khairul Islam, Universiti Tenaga Nasional, Malaysia"],
      },
      {
        title: "Digital Governance, Cybersecurity, Ethics and Responsible Innovation",
        description: "The governance, ethical, regulatory, security and social implications of digital transformation.",
        scope:
          "Digital governance; cybersecurity; data privacy and governance; AI ethics; responsible innovation; digital trust; technology regulation; digital inclusion; public-sector transformation; technology policy.",
        chairs: ["Prof. Md Arafatur Rahman, University of Wolverhampton, UK", "Dr Jasim Uddin, Cardiff Metropolitan University, UK"],
      },
      {
        title: "Digital Transformation for Sectoral and Societal Development",
        description: "The application and impact of digital transformation across sectors and economies, including emerging economies.",
        scope:
          "Digital healthcare; digital education; smart cities; digital tourism; smart agriculture; digital retail; digital RMG and textile industries; digital public services; emerging economies; societal transformation.",
        chairs: ["Prof. Dr. Muhammad Mohiuddin, Laval University, Canada", "Dr. Hasanul Banna, Manchester Metropolitan University, UK"],
      },
    ],
    speakers: [
      { name: "Dr. Elizabeth Yi Wang", role: "Associate Professor", organisation: "University of Leeds" },
      { name: "Keith Madeley", role: "Founder", organisation: "Mr. Yorkshire" },
      { name: "Paul Lawton", role: "Founder Director", organisation: "Business Matching UK" },
      { name: "Prof Jeremy Clegg", role: "Professor", organisation: "University of Leeds" },
      { name: "Prof John Nicholson", role: "Professor", organisation: "University of Huddersfield, UK" },
      { name: "Prof Moshfique Uddin", role: "Professor", organisation: "University of Leeds" },
      { name: "Prof Musfiq Mannan Chowdhury", role: "Professor", organisation: "University of Dhaka" },
      { name: "Prof. Dr. Mohammad Faisal Ahammad", role: "Professor", organisation: "University of Leeds" },
      { name: "Professor Osama Khan", role: "Vice-Chancellor and Chief Executive", organisation: "University of South Wales" },
    ],
    generalChairs: ["Prof Dr Selim Ahmed", "Prof Md Arafatur Rahman"],
    keyDates: [
      { label: "Abstract submission opens", date: "2026-11-01" },
      { label: "Abstract submission deadline", date: "2027-01-15" },
      { label: "Notification of abstract acceptance", date: "2027-01-25" },
      { label: "Full paper submission deadline", date: "2027-03-31" },
      { label: "Notification of full paper acceptance", date: "2027-04-15" },
      // VERIFY: published as 30-Apr-2026 on the old site, which precedes the call for papers; 2027 is assumed.
      { label: "Early-bird registration deadline", date: "2027-04-30" },
      { label: "Regular registration deadline", date: "2027-06-15" },
    ],
  },
  {
    slug: "ITSS-IoE2026",
    acronym: "ITSS-IoE 2026",
    title: "International Conference on Intelligent Technology, System and Service for Internet of Everything",
    startDate: "2026-10-27",
    endDate: "2026-10-28",
    location: "Babcock University, Nigeria",
    format: "Hybrid",
    publication: [
      "Accepted papers will be published in Lecture Notes in Electrical Engineering, the Scopus-indexed proceedings with Springer (subject to Springer approval).",
      "Extended versions of selected papers will be considered for expedited publication in prestigious journals.",
      `Potential recommended journals: ${recommendedJournals.join("; ")}.`,
    ],
    objective: ioeObjective("2026"),
    tracks: ioeTracks.slice(0, 4),
    speakers: [
      { name: "Abdulrahman Akanbi", role: "CEO", organisation: "Sycom Integrated Solutions" },
      { name: "Akeem Aderibigbe Adebomehin", role: "Air Vice Marshal", organisation: "Air Force, Nigeria" },
      { name: "Dr Ihsan Ullah", role: "Assistant Professor", organisation: "University of Galway" },
      { name: "Dr. Emmanuel C. Ogu", role: "LOC Chair", organisation: "Babcock University" },
      { name: "Giovanni Gaggero", role: "Professor", organisation: "University of Genoa, Italy" },
      { name: "Maiduc (Osiceanu) Sanda", role: "Associate Professor", organisation: "Politehnica University of Bucharest" },
      { name: "Md Jasim Uddin", role: "Associate Professor", organisation: "Cardiff Metropolitan University" },
      { name: "Timothy Olukayode Akano", role: "CEO", organisation: "New Horizons Nigeria" },
      { name: "Nazmul Hussain" },
      { name: "Prof Afolarin Olutunde Ojewole" },
    ],
    generalChairs: ["Prof. Dr. Arafatur Rahman", "Prof. Ajaegbu"],
    keyDates: [
      { label: "Paper submission deadline", date: "2026-08-31" },
      { label: "Completion of first review round", date: "2026-08-31" },
      { label: "Deadline of revised manuscripts", date: "2026-09-17" },
      { label: "Author and participant registration deadline", date: "2026-10-01" },
    ],
  },
  {
    slug: "ICETCS2026",
    acronym: "ICETCS 2026",
    title: "3rd International Conference on Emerging Trends in Cybersecurity",
    startDate: "2026-10-12",
    endDate: "2026-10-13",
    location: "University of Genoa, Italy",
    format: "Hybrid",
    publication: [
      "Accepted papers will be published in Lecture Notes in Electrical Engineering, Springer (Scopus-indexed), subject to Springer approval.",
      "Free workshop: “How to Write a Quality Conference Paper”.",
      `Potential recommended journals: ${recommendedJournals.join("; ")}.`,
    ],
    objective: icetcsObjective,
    tracks: cyberTracks.slice(0, 4),
    speakers: [
      { name: "Alessandro Merigo", role: "System Engineer (IoT)", organisation: "Fossa Systems, Portugal" },
      { name: "Cathie Jayakumar-Hazra", role: "Cybersecurity & AI risk specialist", organisation: "Queen Mary University of London" },
      { name: "Dr Ihsan Ullah", role: "Assistant Professor", organisation: "University of Galway" },
      { name: "Dr Mohammad Saedi", role: "Assistant Professor", organisation: "City St George's, University of London" },
      { name: "Dr. Kamal Zuhairi Bin Zamli", role: "Professor", organisation: "Universiti Malaysia Pahang" },
      { name: "Emma Fadlon", role: "Investment Projects Lead and Programme Director CyberASAP", organisation: "Innovate UK Business Connect" },
      { name: "Giulio Ferro", role: "Tenure Track", organisation: "University of Genova" },
      { name: "Harvinder Nagi" },
      { name: "Hendrik Wöhrle" },
      { name: "Imed Ben Dhaou" },
      { name: "Luigi Coppolino" },
      { name: "Mario Marchese" },
      { name: "Matteo Repetto" },
      { name: "Paul Wooderson" },
      { name: "Prof Mohammed Abdur Rahman" },
      { name: "Prof. Dr Md Arafatur Rahman" },
    ],
    generalChairs: ["Prof. Dr. Arafatur Rahman", "Prof. Dr. Kim-Kwang Raymond Choo", "Prof. Fabio Patrone"],
    keyDates: [
      { label: "Paper submission deadline", date: "2026-08-15" },
      { label: "Completion of first review round", date: "2026-08-31" },
      { label: "Deadline of revised manuscripts", date: "2026-09-17" },
      { label: "Author registration deadline", date: "2026-10-01" },
    ],
  },
  {
    slug: "AIoT-RSE2026",
    acronym: "AIoT-RSE 2026",
    title: "International Conference on AI–IoT Technologies for Renewable and Sustainable Energy",
    startDate: "2026-10-12",
    endDate: "2026-10-13",
    location: "University of Genoa, Italy",
    format: "Hybrid",
    publication: [
      "All accepted extended abstracts will be published in the conference proceedings.",
      "Selected full papers will be invited as book chapters in “Integration of AI and IoT Technologies in Renewable Energy Systems”, published by Elsevier.",
      `Potential recommended journals: ${recommendedJournals.slice(0, 4).join("; ")}; International Journal of Software Engineering and Computer Systems.`,
    ],
    objective:
      "To bring together researchers, industry experts, innovators, and policymakers to explore the latest advancements in Artificial Intelligence (AI) and Internet of Things (IoT) technologies for renewable and sustainable energy systems — fostering interdisciplinary collaboration and highlighting emerging solutions that enhance energy efficiency, grid reliability, smart monitoring, and sustainable energy generation.",
    tracks: [
      { title: "AI and IoT Foundations for Renewable Energy Systems" },
      { title: "Smart Grids, Energy Management, and Grid Intelligence" },
      { title: "AI-Enabled Forecasting and Optimization in Renewable Energy" },
      { title: "IoT for Distributed Energy Systems and Monitoring" },
    ],
    speakers: [
      { name: "Prof. Dr Md Arafatur Rahman", role: "Professor in Cybersecurity and Communication Networks", organisation: "University of Wolverhampton" },
      { name: "Prof. Dr. Anurag Srivastava", role: "Professor", organisation: "West Virginia University" },
      { name: "Prof. Dr. Thiago Jesus", role: "Professor", organisation: "University of Porto" },
      { name: "Professor Rajan Jose", role: "Professor", organisation: "Ming Chi University of Technology" },
    ],
    keyDates: [
      { label: "Paper submission deadline", date: "2026-08-15" },
      { label: "Completion of first review round", date: "2026-08-31" },
      { label: "Deadline of revised manuscripts", date: "2026-09-17" },
      { label: "Author registration deadline", date: "2026-10-01" },
    ],
  },
  {
    slug: "ITSS-IoE2025",
    acronym: "ITSS-IoE 2025",
    title: "International Conference on Intelligent Technology, System and Service for Internet of Everything",
    startDate: "2025-10-27",
    endDate: "2025-10-28",
    location: "Science Park, Wolverhampton, UK",
    publication: [
      "All accepted papers are published in Lecture Notes in Electrical Engineering, the Scopus-indexed proceedings with Springer.",
      "Extended versions of selected papers considered for expedited publication in prestigious journals.",
    ],
    objective: ioeObjective("2025"),
    tracks: ioeTracks.slice(0, 4),
    speakers: [
      { name: "Prof. Dr Md Arafatur Rahman", role: "Professor in Cybersecurity and Communication Networks", organisation: "University of Wolverhampton" },
      { name: "Prof. Dr. Mohammed Atiquzzaman", role: "Professor", organisation: "University of Oklahoma, USA" },
      { name: "Dr. Vasilis Katos", role: "Professor", organisation: "Bournemouth University" },
    ],
    keyDates: [
      { label: "Full paper submission", date: "2025-07-31" },
      { label: "Author notification", date: "2025-09-15" },
      { label: "Revised submission deadline", date: "2025-09-15" },
      { label: "Author registration deadline", date: "2025-10-17" },
    ],
  },
  {
    slug: "ICETCS2025",
    acronym: "ICETCS 2025",
    title: "International Conference on Emerging Trends in Cybersecurity",
    startDate: "2025-10-27",
    endDate: "2025-10-28",
    location: "Science Park, Wolverhampton, UK",
    publication: [
      "All accepted papers are published in Lecture Notes in Electrical Engineering, the Scopus-indexed proceedings with Springer.",
      "Free workshop: “How to Write a Quality Conference Paper”.",
    ],
    objective: icetcsObjective,
    tracks: cyberTracks,
    speakers: [
      { name: "Dr. Houbing Herbert Song, IEEE Fellow", role: "Associate Professor", organisation: "University of Maryland, USA" },
      { name: "Dr. Steven Furnell", role: "Professor", organisation: "University of Nottingham, UK" },
      { name: "Dr. Zakirul Alam Bhuiyan", role: "Associate Professor", organisation: "Fordham University, USA" },
      { name: "Dr Ihsan Ullah", role: "Assistant Professor", organisation: "University of Galway" },
    ],
    keyDates: [
      { label: "Paper submission deadline", date: "2025-07-31" },
      { label: "Completion of first review round", date: "2025-09-15" },
      { label: "Deadline of revised manuscripts", date: "2025-09-17" },
      { label: "Author registration deadline", date: "2025-10-17" },
    ],
  },
  {
    slug: "ICETCS2024-CyberVehicareWorkshop",
    acronym: "ICETCS 2024 & Cyber VehiCare Workshop",
    title: "International Conference on Emerging Trends in Cybersecurity & Cyber VehiCare Workshop",
    startDate: "2024-09-09",
    endDate: "2024-09-10",
    location: "University of Wolverhampton, UK",
    publication: [
      "Accepted papers published in Cyber Security and Applications (Scopus-indexed journal, ScienceDirect).",
      "Free workshop: “How to Write a Quality Journal Paper”.",
      "Free CPD course “Introduction to Cyber Security” with certificate; CPD courses on cyber security essentials, cyber security for the board, and GDPR.",
    ],
    objective: icetcsObjective,
    tracks: cyberTracks,
    speakers: [
      { name: "Dr. David Oswald", role: "Professor in Cyber Security", organisation: "University of Birmingham" },
      { name: "Dr. Kim-Kwang Raymond Choo", role: "Professor", organisation: "University of Texas at San Antonio, USA" },
      { name: "Dr. Zakirul Alam Bhuiyan", role: "Associate Professor", organisation: "Fordham University, USA" },
      { name: "Dr. Zeeshan Pervez", role: "Professor in Cyber Security", organisation: "University of Wolverhampton" },
    ],
    keyDates: [
      { label: "Paper submission deadline", date: "2024-06-30" },
      { label: "Completion of first review round", date: "2024-07-15" },
      { label: "Deadline of revised manuscripts", date: "2024-07-31" },
    ],
  },
  {
    slug: "ITSS-IoE2023",
    acronym: "ITSS-IoE 2023",
    title: "International Conference on Intelligent Technology, System and Service for Internet of Everything",
    startDate: "2023-12-02",
    endDate: "2023-12-03",
    location: "University of Asia Pacific, 74/A Green Road, Dhaka, Bangladesh",
    publication: [
      "Accepted papers submitted for inclusion in IEEE Xplore, subject to scope and quality requirements.",
      "Extended versions considered for fast-track publication in Journal of Computer Science (Scopus) and Computers, MDPI (Scopus).",
    ],
    objective: ioeObjective("2023"),
    tracks: ioeTracks,
    speakers: [{ name: "Prof. Dr. Mohammed Atiquzzaman", role: "Professor", organisation: "University of Oklahoma, USA" }],
    keyDates: [
      { label: "Full paper submission", date: "2023-08-18" },
      { label: "Author notification", date: "2023-10-15" },
      { label: "Camera-ready submission", date: "2023-10-29" },
      { label: "Author registration deadline", date: "2023-11-20" },
    ],
  },
  {
    slug: "ITSS-IoE2022",
    acronym: "ITSS-IoE 2022",
    title: "Intelligent Technology, System, and Service for Internet of Everything",
    startDate: "2022-12-03",
    endDate: "2022-12-05",
    location: "Fuwwah, Yemen",
    publication: [
      "Accepted papers submitted to IEEE Xplore, subject to scope and quality requirements.",
      "Extended versions considered for Journal of Computer Science (Scopus), Computers, MDPI (Scopus), and a CMES special issue on vehicle health monitoring.",
    ],
    objective: ioeObjective("2022"),
    tracks: ioeTracks,
    speakers: [
      { name: "Dr. Adel Aneiba", role: "Professor", organisation: "Birmingham City University" },
      { name: "Dr. Hamzah Alaidaros", role: "Assistant Professor", organisation: "Al-Ahgaff University" },
      { name: "Dr. Jahangir Hossain", role: "Professor", organisation: "The University of British Columbia, Kelowna, Canada" },
      { name: "Dr. Jon Crowcroft", role: "Professor", organisation: "University of Cambridge" },
      { name: "Dr. Shadi S. Basurra", role: "Associate Professor", organisation: "Birmingham City University" },
    ],
    keyDates: [
      { label: "Full paper submission", date: "2022-09-10" },
      { label: "Author notification", date: "2022-09-25" },
      { label: "Camera-ready paper due", date: "2022-10-15" },
      { label: "Registration deadline", date: "2022-10-31" },
    ],
  },
  {
    slug: "AETSS2022",
    acronym: "AETSS 2022",
    title: "International Conference on Advanced Engineering and Technology for Sustainable Society",
    startDate: "2022-12-26",
    endDate: "2022-12-27",
    location: "North Nicosia (webinar and face to face)",
    publication: [
      "Accepted papers published in IEEE Xplore.",
      "Extended versions of selected papers considered for fast-track publication in prestigious journals.",
    ],
    objective:
      "AETSS 2022 offers a platform for leading scholars and experts worldwide to promote their unique ideas, covering science, advanced engineering, technologies, and their applications in advanced computing, communication, and electronics to ensure the sustainable development of society.",
    tracks: [
      { title: "Advanced Communication and Network Technologies Towards the Advancement of Sustainable Society" },
      { title: "Internet of Things and Intelligent Data Analytics Towards the Advancement of Sustainable Society" },
      { title: "Artificial Intelligence and Decision-making Towards the Advancement of Sustainable Society" },
      { title: "Embedded Computing and Cyber-Physical Systems Towards the Advancement of Sustainable Society" },
      { title: "Software Engineering Towards the Advancement of Sustainable Society" },
      { title: "Emerging Application Towards the Advancement of Sustainable Society" },
    ],
    speakers: [{ name: "Dr. Mohammad Patwary", role: "Professor", organisation: "University of Wolverhampton" }],
    keyDates: [
      { label: "Paper submission deadline", date: "2022-09-02" },
      { label: "Author notification", date: "2022-10-14" },
      { label: "Camera-ready paper due", date: "2022-11-11" },
    ],
  },
  {
    slug: "ICECB2022",
    acronym: "ICECB 2022",
    title: "International Conference on Emerging Trends in Cybersecurity & Blockchain",
    startDate: "2022-10-06",
    endDate: "2022-10-07",
    location: "Wolverhampton, UK",
    publication: [
      "Distinguished papers, after further revisions, published in 12+ SCI, ESCI and EI indexed special issues, shared by co-located conferences, symposiums, workshops and special sessions.",
    ],
    objective:
      "ICECB 2022 promotes original and unpublished research covering science, technologies, applications, and related categories on emerging trends in cyber security intelligence and Blockchain technology — a domain-specialized scientific platform to raise cyber security awareness, address a growing skills gap, and explore how blockchain's distributed-ledger characteristics can solve current cybersecurity issues.",
    tracks: [...cyberTracks.slice(0, 4), { title: "Implementation of Blockchain" }],
    speakers: [{ name: "Dr. Prashant Pillai", role: "Professor", organisation: "University of Wolverhampton, UK" }],
    keyDates: [
      { label: "Full paper submission", date: "2022-07-04" },
      { label: "Author notification", date: "2022-08-05" },
      { label: "Camera-ready paper due", date: "2022-08-30" },
      { label: "Author registration deadline", date: "2022-09-10" },
    ],
  },
  {
    slug: "ETCCE2021",
    acronym: "ETCCE 2021",
    title: "International Conference on Emerging Technology in Computing, Communication, and Electronics",
    publication: [],
    tracks: [],
    speakers: [],
    keyDates: [],
    externalUrl: "https://ritechs.org/ETCCE2021/",
  },
  {
    slug: "ITSS-IoE2021",
    acronym: "ITSS-IoE 2021",
    title: "International Conference on Intelligent Technology, System and Service for Internet of Everything",
    startDate: "2021-11-01",
    endDate: "2021-11-02",
    location: "University of Science and Technology, Sana'a, Yemen",
    publication: [
      "Accepted papers submitted for inclusion in IEEE Xplore, subject to scope and quality requirements.",
      "Extended versions considered for fast-track publication in journals including Journal of Computer Science (Scopus), Computers (MDPI), Sensors, IEEE EBM and Expert Systems (Wiley).",
    ],
    objective: ioeObjective("2021"),
    tracks: ioeTracks,
    speakers: [
      { name: "Dr. Abdus Samad Kamal", role: "Associate Professor", organisation: "Gunma University, Japan" },
      { name: "Dr. Fuaad Hasan Abdulrazzak", role: "Associate Professor", organisation: "Thamar University, Yemen" },
      { name: "Dr. Kim-Kwang Raymond Choo", role: "Professor", organisation: "University of Texas at San Antonio, USA" },
      { name: "Dr. Prashant Pillai", role: "Professor", organisation: "University of Wolverhampton, UK" },
      { name: "Dr. Reyad Mehfuz", role: "Senior Engineering Manager, R&D", organisation: "Seagate Technology, UK" },
      { name: "Dr. Zakirul Alam Bhuiyan", role: "Associate Professor", organisation: "Fordham University, USA" },
    ],
    keyDates: [
      { label: "Full paper submission", date: "2021-08-15" },
      { label: "Author notification", date: "2021-09-10" },
      { label: "Camera-ready submission", date: "2021-09-30" },
      { label: "Author registration deadline", date: "2021-10-10" },
    ],
  },
];

export const getConference = (slug: string) => conferences.find((c) => c.slug === slug);

/**
 * NEWS — every post on ritechs.org/blog/list with its full text from
 * /blog/details/<id> (November 2026). Cover images are illustrations in
 * /public/images/news; replace them with event photographs when available.
 * Meeting IDs and passwords of past online events are not republished.
 */
/** A news article as first published on the new site (seed data; the database is the source of truth). */
export interface NewsArticle {
  id: string;
  slug: string;
  category: "Webinar" | "Workshop" | "Seminar" | "Conference" | "Announcement";
  title: string;
  date: string;
  excerpt: string;
  body: string[];
  image: { src: string; alt: string };
  source: "verified" | "demo";
}

const smartTechCover = { src: "/images/news/smart-technology.png", alt: "" };

export const news: NewsArticle[] = [
  {
    id: "7",
    slug: "mastering-quantitative-data-analysis",
    category: "Webinar",
    title: "Mastering Quantitative Data Analysis: Essential Tools and Methods",
    date: "2024-12-14",
    excerpt:
      "The Doctorate Research Group of VietTESOL hosted its fourth webinar, Mastering Quantitative Data Analysis: Essential Tools and Methods, with RiTECHS Director Dr. Nadia Refat as a featured speaker.",
    body: [
      "The Doctorate Research Group of VietTESOL is delighted to host its fourth webinar, Mastering Quantitative Data Analysis: Essential Tools and Methods, on Sunday, December 15th, 2024, from 5:00–7:00 PM (Vietnam Time) via Zoom.",
      "Featuring esteemed speakers Dr. Nadia Refat (Director, RiTECHS, UK) and Dr. Cao Thuý Hồng (ULIS-VNU, Vietnam), and moderated by Dr. Nguyễn Tiến Phùng (Quy Nhơn University) and TS. Đinh Minh Thu (Hải Phòng University), this session will delve into essential tools like Qualtrics, Google Forms, and SPSS, highlighting their applications, strengths, and limitations.",
      "Participants will also learn how to select the right statistical analysis based on research aims, conduct these analyses step-by-step, and interpret their results effectively. Whether you're a budding researcher or seasoned academic, this webinar offers invaluable insights to advance your quantitative research expertise.",
    ],
    image: { src: "/images/news/quantitative-analysis.png", alt: "" },
    source: "verified",
  },
  {
    id: "6",
    slug: "reflections-on-icetcs-2024",
    category: "Workshop",
    title: "Reflections on ICETCS 2024 and the Cyber VehiCare Workshop",
    date: "2024-10-22",
    excerpt:
      "The International Conference on Emerging Trends in Cybersecurity (ICETCS 2024) and the Cyber VehiCare Workshop brought together thought leaders, researchers and practitioners at the University of Wolverhampton.",
    body: [
      "The recently concluded International Conference on Emerging Trends in Cybersecurity (ICETCS 2024) and the Cyber VehiCare Workshop were remarkable events that brought together thought leaders, researchers, and practitioners in the field of cybersecurity. Hosted at the prestigious University of Wolverhampton, these gatherings provided an exceptional platform for discussing the latest developments and challenges in cybersecurity.",
      "We are proud to announce that RiTECHS played a pivotal role in organizing these events, fostering collaboration and innovation in this rapidly evolving domain. The conference featured a lineup of insightful discussions and presentations that highlighted emerging trends and technologies aimed at strengthening our cybersecurity landscape.",
      "Among the many participants, Owhonda Nwokekoro expressed gratitude for the opportunity to present at ICETCS 2024. His experience was enriched by engaging discussions with fellow experts and practitioners, exchanging ideas that will undoubtedly shape the future of cybersecurity.",
      "A heartfelt thank you goes out to Md Arafatur Rahman and the entire organizing committee for their dedication and hard work in making this event a success. Their efforts ensured a seamless experience for all attendees, creating an environment ripe for learning and collaboration.",
      "The workshops, particularly the Cyber VehiCare session, focused on the intersection of cybersecurity and vehicle technology, addressing vital topics such as vehicular data protection, IoT security, and the future of connected vehicles. The knowledge shared and the connections made during these discussions will pave the way for innovative solutions in the field.",
      "As we reflect on the success of ICETCS 2024 and the Cyber VehiCare Workshop, we are excited about the future of cybersecurity. Events like these not only advance knowledge but also foster a sense of community among professionals dedicated to safeguarding our digital world.",
      "Stay tuned for more updates from RiTECHS as we continue to engage with industry leaders and contribute to groundbreaking discussions in cybersecurity. Together, we can navigate the complexities of this ever-evolving field and work towards a more secure future.",
    ],
    image: { src: "/images/news/cybersecurity.png", alt: "" },
    source: "verified",
  },
  {
    id: "5",
    slug: "ritechs-seminar-2022",
    category: "Seminar",
    title: "RiTECHS Seminar 2022: How to Publish a Review Paper in a High-Impact Journal",
    date: "2022-04-08",
    excerpt:
      "Keynote speaker Dr. Arafatur Rahman, Senior Lecturer at the University of Wolverhampton, on how to publish review papers in high-impact journals. 20 April 2022, online.",
    body: [
      "Keynote Speaker: Dr. Arafatur Rahman, Senior Lecturer, University of Wolverhampton, United Kingdom.",
      "9:00am (GMT), April 20, 2022, online via Zoom. Free for all RiTECHS members and organizers' members.",
      "Become a RiTECHS member to join seminars like this one — register as a mentor or as a mentee.",
    ],
    image: { src: "/images/news/publishing.png", alt: "" },
    source: "verified",
  },
  {
    id: "4",
    slug: "closing-first-international-conference-smart-technology",
    category: "Conference",
    title: "Closing the Works of the First International Conference on Smart Technology in Sana'a",
    date: "2021-09-26",
    excerpt:
      "More than 300 researchers and experts from 18 countries took part in the first International Conference on Smart Technology, Systems and Internet of Things Services, organized with RiTECHS.",
    body: [
      "The conclusion of the First International Conference on Smart Technology, Systems and Internet of Things Services in Sana'a was organized over two days at the University of Science and Technology in collaboration with RiTECHS, with the participation of more than 300 researchers and experts from 18 countries.",
      "55 research papers were presented on smart technologies, the Internet of Things and data analysis, AI and the technology industry, remote sensing, language, voice and video processing, cloud computing, data science, integrated computing, cyber-physical systems of the Internet of Things, and emerging applications of the Internet of Everything.",
      "At the conclusion of the conference, attended by the Director of the Information Technology Center, Dr. Fouad Hassan, the head of higher studies and scientific research at the University, Dr. Ismail Al-Sharabi, and representatives of stakeholders and academics, the participants were honored with certificates of participation.",
    ],
    image: smartTechCover,
    source: "verified",
  },
  {
    id: "1",
    slug: "itss-ioe-2021-opening",
    category: "Conference",
    title: "1st International Conference on Intelligent Technology and Internet Systems and Services of Everything Opens",
    date: "2021-09-26",
    excerpt:
      "The Prime Minister of Yemen opened ITSS-IoE 2021 at the University of Science and Technology, with researchers and experts from 18 countries taking part via Zoom.",
    body: [
      "The Prime Minister of Yemen, Dr. Abdulaziz Saleh bin Habtour, opened the “First International Conference on Intelligent Technology and Internet Systems and Services of Everything”, which began its work at the University of Science and Technology with a large official presence and the participation of researchers and experts in technology and the Internet from 18 countries around the world via Zoom, alongside researchers and academics from Yemeni universities.",
      "The event, held in collaboration with RiTECHS, was attended by the Ministers of Communications and Information Technology, Technical Education and Vocational Training, and Transportation, the Chairman of the Supreme Board for Science, Technology and Innovation, and the Deputy Minister of Higher Education. The President of the University of Science and Technology, Dr. Adel Al-Mutawakkul, described the conference as the inauguration of the events, scientific activities and development workshops the University planned for 2021–2022 to improve higher education, scientific research and service to the community in Yemen.",
    ],
    image: smartTechCover,
    source: "verified",
  },
];

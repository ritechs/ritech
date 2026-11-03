/**
 * PARTNERS — the “Our Trusted Partners” strip on ritechs.org (November 2026):
 * each logo, and the site it links to. Names are taken from the linked
 * websites. Two logos on the old site were not linked to an organisation
 * (uploads/1779449089.png and uploads/1646564044.png) and are left out until
 * identified.
 */
export interface Partner {
  name: string;
  monogram: string;
  href?: string;
  logo?: string;
}

export const partners: Partner[] = [
  { name: "University of Leeds", monogram: "UoL", href: "https://www.leeds.ac.uk/", logo: "uploads/1789303489.png" },
  { name: "University of Wolverhampton", monogram: "UW", href: "https://www.wlv.ac.uk/", logo: "uploads/1647514972.png" },
  { name: "Birmingham City University", monogram: "BCU", href: "https://www.bcu.ac.uk/", logo: "uploads/1653671896.jpg" },
  { name: "Aston University", monogram: "AU", href: "https://www.aston.ac.uk/", logo: "uploads/1748442852.png" },
  { name: "Cardiff University", monogram: "CU", href: "https://www.cardiff.ac.uk/", logo: "uploads/1729684245.png" },
  { name: "Cardiff Metropolitan University", monogram: "CMU", href: "https://www.cardiffmet.ac.uk/", logo: "uploads/1746344934.png" },
  { name: "University of Worcester", monogram: "UoW", href: "https://www.worcester.ac.uk/", logo: "uploads/1748442576.jpg" },
  { name: "Cyber Quarter", monogram: "CQ", href: "https://www.cyberquarter.co.uk/", logo: "uploads/1647516730.png" },
  { name: "University of Galway", monogram: "UG", href: "https://www.universityofgalway.ie/", logo: "uploads/1748442991.png" },
  { name: "University of Genoa", monogram: "UniGe", href: "https://unige.it/en", logo: "uploads/1748443034.jpg" },
  { name: "Fordham University", monogram: "FU", href: "https://www.fordham.edu/", logo: "uploads/1634390702.png" },
  { name: "Springer", monogram: "S", href: "https://www.springer.com/", logo: "uploads/1748442777.png" },
  { name: "Cyber Security and Applications (ScienceDirect)", monogram: "CSA", href: "https://www.sciencedirect.com/journal/cyber-security-and-applications", logo: "uploads/1705011501.jpg" },
  { name: "Ajman University", monogram: "AJU", href: "https://www.ajman.ac.ae/", logo: "uploads/1748442202.svg" },
  { name: "King Saud University", monogram: "KSU", href: "https://ksu.edu.sa/en", logo: "uploads/1748442650.png" },
  { name: "Babcock University", monogram: "BU", href: "https://babcock.edu.ng/", logo: "uploads/1773579250.png" },
  { name: "Sycom Integrated Solutions", monogram: "SIS", href: "https://sycomsolutions.com/", logo: "uploads/1773579412.png" },
  { name: "Airfield Security", monogram: "AS", href: "https://www.airfieldsecurity.it/", logo: "uploads/1748443436.png" },
  { name: "United International University", monogram: "UIU", href: "https://www.uiu.ac.bd/", logo: "uploads/1634390468.png" },
  { name: "University of Asia Pacific", monogram: "UAP", href: "https://www.uap-bd.edu/", logo: "uploads/1650450243.png" },
  { name: "Bangladesh University", monogram: "BU", href: "https://bu.ac.bd/", logo: "uploads/1748442950.png" },
  { name: "Jashore University of Science and Technology", monogram: "JUST", href: "https://just.edu.bd/", logo: "uploads/1748443114.jpg" },
  { name: "Uttara University", monogram: "UU", href: "https://uttarauniversity.edu.bd/", logo: "uploads/1748443157.jpg" },
  { name: "University of Science and Technology, Yemen", monogram: "UST", href: "https://ust.edu/", logo: "uploads/1634391245.png" },
  { name: "Al-Ahgaff University", monogram: "AAU", href: "http://en.ahgaff.edu/", logo: "uploads/1646319354.jpg" },
  { name: "JJ College of Engineering and Technology", monogram: "JJCET", href: "https://jjcet.ac.in/", logo: "uploads/1748442441.svg" },
  { name: "K.S.R. College of Engineering", monogram: "KSRCE", href: "https://ksrce.ac.in/", logo: "uploads/1748442488.webp" },
];

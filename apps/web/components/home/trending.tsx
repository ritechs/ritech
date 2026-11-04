import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/home/reveal";
import { SectionHeading } from "@/components/home/section-heading";
import { services } from "@/lib/data/services";
import { getFeaturedConference } from "@/lib/server/content";
import { routes } from "@/lib/site";
import { formatDateRange } from "@/lib/utils";

type Card = { href: string; title: string; text: string; image: string };

/** Three highlight cards, like "Trending at USF": the featured conference, mentorship and publication support. */
export async function Trending() {
  const conf = await getFeaturedConference();
  const mentorship = services.find((s) => s.id === "mentorship")!;
  const publication = services.find((s) => s.id === "publication")!;
  const cards: Card[] = [
    ...(conf
      ? [
          {
            href: routes.conference(conf.slug),
            title: conf.shortTitle ?? conf.title,
            text: `${conf.title}. ${formatDateRange(conf.startsAt, conf.endsAt)}, ${conf.location}.`,
            image: conf.image ?? "/images/conference-dtisb.png",
          },
        ]
      : []),
    { href: routes.mentorship, title: mentorship.title, text: mentorship.description, image: "/images/news/smart-technology.png" },
    { href: publication.cta.href, title: publication.title, text: publication.description, image: "/images/news/publishing.png" },
  ];

  return (
    <section aria-labelledby="trending-heading" className="bg-surface py-16 md:py-20 lg:py-24">
      <div className="container-site">
        <SectionHeading id="trending-heading" title="Trending at RiTECHS" />
        <ul className="mt-10 grid gap-6 md:grid-cols-3 lg:gap-8">
          {cards.map((c, i) => (
            <Reveal as="li" key={c.href} index={i}>
              <Link
                href={c.href}
                className={`group flex h-full flex-col text-white shadow-[0_10px_24px_-12px_rgb(0_0_0/0.45)] transition-transform duration-300 hover:-translate-y-1 ${["bg-brand", "bg-brand-mid", "bg-brand-light"][i % 3]}`}
              >
                <span className="relative block aspect-[4/3] overflow-hidden">
                  <Image
                    src={c.image}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </span>
                <span className="flex flex-1 flex-col p-6 lg:p-7">
                  <span className="border-b border-white/25 pb-3.5 text-xl font-semibold [text-wrap:balance]">{c.title}</span>
                  <span className="mt-3.5 text-[0.9375rem] leading-relaxed text-white/90">{c.text}</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

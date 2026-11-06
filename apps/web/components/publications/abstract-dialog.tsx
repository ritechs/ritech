"use client";

import { RichContent } from "@/components/page/rich-text";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AreaBadge, AuthorLine, DemoBadge, DoiLine, PublicationDate } from "@/components/publications/parts";
import { routes } from "@/lib/site";
import type { Publication } from "@/lib/types";

/** "Read Abstract" — shows the full abstract and metadata without leaving the page. */
export function AbstractDialog({ publication, trigger }: { publication: Publication; trigger: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent closeLabel="Close abstract">
        <div className="overflow-y-auto px-6 pt-6 pb-2 sm:px-8 sm:pt-8">
          <div className="flex flex-wrap items-center gap-2 pr-10">
            <AreaBadge publication={publication} />
            <span className="text-xs text-faint-ink">{publication.type}</span>
            <DemoBadge show={publication.source === "demo"} label="Demo paper" />
          </div>
          <DialogTitle className="mt-4 [text-wrap:pretty]">{publication.title}</DialogTitle>
          <DialogDescription asChild>
            <div className="mt-3 space-y-1">
              <AuthorLine publication={publication} max={6} />
              <p className="text-sm text-faint-ink">
                <cite className="font-serif not-italic [font-style:italic]">{publication.venue}</cite>
                {publication.volume && <>, {publication.volume}</>}
                <span aria-hidden className="mx-2 text-rule-strong">|</span>
                <PublicationDate publication={publication} />
              </p>
            </div>
          </DialogDescription>

          <h3 className="mt-6 border-t border-rule pt-5 text-sm font-medium text-ink">Abstract</h3>
          <RichContent value={publication.abstract} className="mt-2 font-serif text-[1.0625rem] leading-[1.7] text-ink/90 numerals-oldstyle" />

          <h3 className="mt-5 text-sm font-medium text-ink">Keywords</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {publication.keywords.map((k) => (
              <li key={k} className="rounded-sm border border-rule px-2 py-1 text-xs text-muted-ink">
                {k}
              </li>
            ))}
          </ul>
          <DoiLine publication={publication} className="mt-5" />
        </div>
        <div className="flex flex-col gap-2 border-t border-rule bg-paper px-6 py-4 sm:flex-row sm:justify-end sm:px-8">
          <Button asChild>
            <Link href={routes.publication(publication.slug)}>
              <FileText aria-hidden />
              View Paper
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { readShare } from "@/lib/server/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const share = await readShare((await params).slug);
  return { title: share ? `${share.title} · ${APP_NAME}` : "Shared document", robots: { index: false } };
}

export default async function SharedDocument({ params }: Props) {
  const share = await readShare((await params).slug);
  if (!share) notFound();
  const minutes = Math.max(1, Math.round(share.wordCount / 230));

  return (
    <div className="h-screen overflow-y-auto">
      <main className="mx-auto max-w-[720px] px-6 pt-20 pb-32">
        <p className="mb-10 font-mono text-xs tracking-wide text-mute uppercase">
          {[share.author, new Date(share.updatedAt).toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric" }), `${minutes} min read`]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <article className="prose-doc" dangerouslySetInnerHTML={{ __html: share.html }} />
      </main>
    </div>
  );
}

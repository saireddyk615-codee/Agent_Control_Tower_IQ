import Link from "next/link";

type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  nextStep: string;
};

export function PlaceholderPage({ eyebrow, title, description, nextStep }: PlaceholderPageProps) {
  return (
    <main className="mx-auto max-w-7xl px-6 py-20">
      <section className="panel max-w-3xl rounded-2xl p-8 sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">{eyebrow}</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="mt-5 max-w-2xl leading-7 text-slate-400">{description}</p>
        <div className="mt-8 rounded-xl border border-blue-400/15 bg-blue-400/5 p-4 text-sm text-blue-100">
          Next module: {nextStep}
        </div>
        <Link className="mt-8 inline-flex rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10" href="/">
          Back to overview
        </Link>
      </section>
    </main>
  );
}

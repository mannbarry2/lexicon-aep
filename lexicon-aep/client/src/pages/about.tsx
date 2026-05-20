import { Layout } from "@/components/layout";

export default function About() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.18em] mb-4">
          About
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-foreground mb-6" style={{ fontWeight: 500, letterSpacing: "-0.02em" }}>
          AEP Lexicon
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed mb-12">
          A curated reference for the terminology of Adobe Experience Platform &mdash;
          maintained as a project of{" "}
          <a
            href="https://barrymann.com?utm_source=aep_lexicon&utm_medium=about&utm_campaign=portfolio"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-accent"
          >
            Barry Mann
          </a>
          .
        </p>

        <section className="mb-12">
          <h2 className="font-display text-2xl md:text-3xl text-foreground mb-4" style={{ fontWeight: 500, letterSpacing: "-0.015em" }}>
            Mission
          </h2>
          <p className="text-base text-foreground/85 leading-relaxed">
            To build a comprehensive, accurate, and approachable reference for Adobe
            Experience Platform &mdash; one that helps practitioners, developers, and
            newcomers navigate a sprawling product ecosystem with confidence. Every
            entry is written and curated rather than scraped, with current and legacy
            terminology clearly distinguished so nobody is left guessing whether
            they're reading about the right thing.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="font-display text-2xl md:text-3xl text-foreground mb-4" style={{ fontWeight: 500, letterSpacing: "-0.015em" }}>
            What you'll find here
          </h2>
          <ul className="space-y-3 text-base text-foreground/85 leading-relaxed">
            <li className="flex gap-3">
              <span className="text-primary mt-1.5 flex-shrink-0">&bull;</span>
              <span>A curated collection of Adobe Experience Platform terms with plain-English definitions.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary mt-1.5 flex-shrink-0">&bull;</span>
              <span>A clear distinction between current and legacy <em>AdobeSpeak</em>, so you can map old names to new ones.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary mt-1.5 flex-shrink-0">&bull;</span>
              <span>Category-based organization for navigating by capability rather than alphabetically.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary mt-1.5 flex-shrink-0">&bull;</span>
              <span>A community voting signal on every term so the most accurate definitions surface first.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary mt-1.5 flex-shrink-0">&bull;</span>
              <span>Export to PDF for offline reference.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary mt-1.5 flex-shrink-0">&bull;</span>
              <span>An open contribution model &mdash; sign in with Google to submit a new term or refine an existing one.</span>
            </li>
          </ul>
        </section>

      </div>
    </Layout>
  );
}

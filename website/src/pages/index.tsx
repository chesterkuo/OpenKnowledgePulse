import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";

type FeatureItem = {
  title: string;
  description: string;
};

const features: FeatureItem[] = [
  {
    title: "Open Protocol",
    description:
      "SKILL.md compatible dual-layer architecture. Layer 1 works with SkillsMP, SkillHub, and Smithery. Layer 2 adds dynamic KnowledgeUnits for reasoning traces, tool patterns, and expert SOPs.",
  },
  {
    title: "TypeScript SDK",
    description:
      "Full-featured SDK with Zod validation, knowledge capture/retrieval, SKILL.md parsing, quality scoring, and content sanitization. Ships as ESM + CJS with full type declarations.",
  },
  {
    title: "MCP Server",
    description:
      "Model Context Protocol server with 6 tools for searching, contributing, and validating knowledge. Run standalone or as a proxy to the central registry.",
  },
];

function Feature({ title, description }: FeatureItem) {
  return (
    <div className={clsx("col col--4")}>
      <div className="text--center padding-horiz--md padding-vert--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero hero--primary")}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div>
          <Link
            className="button button--secondary button--lg"
            to="/docs/getting-started/quickstart"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title="Home" description={siteConfig.tagline}>
      <HomepageHeader />
      <main>
        <section className="features">
          <div className="container">
            <div className="row">
              {features.map((props, idx) => (
                <Feature key={idx} {...props} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}

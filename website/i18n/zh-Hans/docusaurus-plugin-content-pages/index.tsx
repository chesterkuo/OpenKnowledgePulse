import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Heading from "@theme/Heading";
import Layout from "@theme/Layout";
import clsx from "clsx";

type FeatureItem = {
  title: string;
  description: string;
};

const features: FeatureItem[] = [
  {
    title: "开放协议",
    description:
      "兼容 SKILL.md 的双层架构。Layer 1 与 SkillsMP、SkillHub、Smithery 兼容。Layer 2 添加动态 KnowledgeUnit，支持推理链、工具模式和专家 SOP。",
  },
  {
    title: "TypeScript SDK",
    description:
      "功能完整的 SDK，包含 Zod 验证、知识捕获/检索、SKILL.md 解析、质量评分和内容清理。同时支持 ESM 和 CJS，附带完整类型声明。",
  },
  {
    title: "MCP 服务器",
    description:
      "Model Context Protocol 服务器，提供 6 个工具用于搜索、贡献和验证知识。支持独立运行或作为中央注册中心的代理。",
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
        <p className="hero__subtitle">开放式 AI 知识共享协议</p>
        <div>
          <Link
            className="button button--secondary button--lg"
            to="/docs/getting-started/quickstart"
          >
            快速入门
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  return (
    <Layout title="首页" description="开放式 AI 知识共享协议">
      <HomepageHeader />
      <main>
        <section className="features">
          <div className="container">
            <div className="row">
              {features.map((props) => (
                <Feature key={props.title} {...props} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}

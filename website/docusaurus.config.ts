import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "KnowledgePulse",
  tagline: "Open AI Knowledge-Sharing Protocol",
  favicon: "img/logo.svg",

  url: "https://knowledgepulse.dev",
  baseUrl: "/",

  organizationName: "openclaw",
  projectName: "knowledgepulse",

  onBrokenLinks: "throw",

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },

  i18n: {
    defaultLocale: "en",
    locales: ["en", "zh-Hans"],
    localeConfigs: {
      en: { label: "English", direction: "ltr" },
      "zh-Hans": { label: "简体中文", direction: "ltr" },
    },
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl:
            "https://github.com/openclaw/knowledgepulse/tree/main/website/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: "KnowledgePulse",
      logo: {
        alt: "KnowledgePulse Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "docsSidebar",
          position: "left",
          label: "Docs",
        },
        {
          href: "https://github.com/openclaw/knowledgepulse",
          label: "GitHub",
          position: "right",
        },
        {
          type: "localeDropdown",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            { label: "Getting Started", to: "/docs/getting-started/introduction" },
            { label: "SDK Reference", to: "/docs/sdk/installation" },
            { label: "API Reference", to: "/docs/registry/api-reference" },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/openclaw/knowledgepulse",
            },
            {
              label: "GitHub Discussions",
              href: "https://github.com/openclaw/knowledgepulse/discussions",
            },
          ],
        },
        {
          title: "More",
          items: [
            { label: "MCP Server", to: "/docs/mcp-server/setup" },
            { label: "CLI Reference", to: "/docs/cli/reference" },
            { label: "Contributing", to: "/docs/contributing/development" },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} OpenClaw. Apache 2.0 License.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["bash", "json", "yaml", "toml"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;

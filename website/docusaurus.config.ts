import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";

const config: Config = {
  clientModules: ["./src/clientModules/localeRedirect.ts"],
  title: "KnowledgePulse",
  tagline: "Open AI Knowledge-Sharing Protocol",
  favicon: "img/octo-favicon.svg",

  url: "https://openknowledgepulse.org",
  baseUrl: "/",

  organizationName: "chesterkuo",
  projectName: "OpenKnowledgePulse",

  onBrokenLinks: "throw",

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },

  i18n: {
    defaultLocale: "en",
    locales: ["en", "zh-Hans", "ja", "ko", "es"],
    localeConfigs: {
      en: { label: "English", direction: "ltr" },
      "zh-Hans": { label: "简体中文", direction: "ltr" },
      ja: { label: "日本語", htmlLang: "ja" },
      ko: { label: "한국어", htmlLang: "ko" },
      es: { label: "Español", htmlLang: "es" },
    },
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/chesterkuo/OpenKnowledgePulse/tree/main/website/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: "dark",
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
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
          href: "https://openknowledgepulse.org/studio/",
          label: "Studio",
          position: "left",
        },
        {
          href: "https://github.com/chesterkuo/OpenKnowledgePulse",
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
              href: "https://github.com/chesterkuo/OpenKnowledgePulse",
            },
            {
              label: "X Community",
              href: "https://x.com/i/communities/2025909804464824628",
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
      copyright: `Copyright @ ${new Date().getFullYear()} Summer Lab. Apache 2.0 License.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["bash", "json", "yaml", "toml"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;

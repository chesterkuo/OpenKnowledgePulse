import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/zh-Hans/docs',
    component: ComponentCreator('/zh-Hans/docs', 'ce1'),
    routes: [
      {
        path: '/zh-Hans/docs',
        component: ComponentCreator('/zh-Hans/docs', '371'),
        routes: [
          {
            path: '/zh-Hans/docs',
            component: ComponentCreator('/zh-Hans/docs', '2d5'),
            routes: [
              {
                path: '/zh-Hans/docs/architecture/overview',
                component: ComponentCreator('/zh-Hans/docs/architecture/overview', '457'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/zh-Hans/docs/architecture/protocol',
                component: ComponentCreator('/zh-Hans/docs/architecture/protocol', '06c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/zh-Hans/docs/architecture/security',
                component: ComponentCreator('/zh-Hans/docs/architecture/security', '596'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/zh-Hans/docs/cli/reference',
                component: ComponentCreator('/zh-Hans/docs/cli/reference', 'af0'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/zh-Hans/docs/contributing/development',
                component: ComponentCreator('/zh-Hans/docs/contributing/development', 'd54'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/zh-Hans/docs/contributing/guidelines',
                component: ComponentCreator('/zh-Hans/docs/contributing/guidelines', '529'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/zh-Hans/docs/getting-started/concepts',
                component: ComponentCreator('/zh-Hans/docs/getting-started/concepts', '3f7'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/zh-Hans/docs/getting-started/introduction',
                component: ComponentCreator('/zh-Hans/docs/getting-started/introduction', 'c27'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/zh-Hans/docs/getting-started/quickstart',
                component: ComponentCreator('/zh-Hans/docs/getting-started/quickstart', '8f6'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/zh-Hans/docs/mcp-server/setup',
                component: ComponentCreator('/zh-Hans/docs/mcp-server/setup', '5b4'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/zh-Hans/docs/mcp-server/tools',
                component: ComponentCreator('/zh-Hans/docs/mcp-server/tools', 'd06'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/zh-Hans/docs/registry/api-reference',
                component: ComponentCreator('/zh-Hans/docs/registry/api-reference', 'fb3'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/zh-Hans/docs/registry/authentication',
                component: ComponentCreator('/zh-Hans/docs/registry/authentication', 'f41'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/zh-Hans/docs/registry/rate-limiting',
                component: ComponentCreator('/zh-Hans/docs/registry/rate-limiting', '9fd'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/zh-Hans/docs/sdk/installation',
                component: ComponentCreator('/zh-Hans/docs/sdk/installation', '29c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/zh-Hans/docs/sdk/scoring',
                component: ComponentCreator('/zh-Hans/docs/sdk/scoring', '109'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/zh-Hans/docs/sdk/skill-md',
                component: ComponentCreator('/zh-Hans/docs/sdk/skill-md', '96a'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/zh-Hans/docs/sdk/types',
                component: ComponentCreator('/zh-Hans/docs/sdk/types', '64e'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/zh-Hans/docs/sdk/utilities',
                component: ComponentCreator('/zh-Hans/docs/sdk/utilities', '61a'),
                exact: true,
                sidebar: "docsSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/zh-Hans/',
    component: ComponentCreator('/zh-Hans/', 'd55'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];

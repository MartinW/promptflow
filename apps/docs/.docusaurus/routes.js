import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/__docusaurus/debug',
    component: ComponentCreator('/__docusaurus/debug', '5ff'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/config',
    component: ComponentCreator('/__docusaurus/debug/config', '5ba'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/content',
    component: ComponentCreator('/__docusaurus/debug/content', 'a2b'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/globalData',
    component: ComponentCreator('/__docusaurus/debug/globalData', 'c3c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/metadata',
    component: ComponentCreator('/__docusaurus/debug/metadata', '156'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/registry',
    component: ComponentCreator('/__docusaurus/debug/registry', '88c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/routes',
    component: ComponentCreator('/__docusaurus/debug/routes', '000'),
    exact: true
  },
  {
    path: '/',
    component: ComponentCreator('/', '4fe'),
    routes: [
      {
        path: '/',
        component: ComponentCreator('/', '9e0'),
        routes: [
          {
            path: '/',
            component: ComponentCreator('/', '374'),
            routes: [
              {
                path: '/cli/commands',
                component: ComponentCreator('/cli/commands', 'c00'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/cli/overview',
                component: ComponentCreator('/cli/overview', '67f'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/concepts/tags',
                component: ComponentCreator('/concepts/tags', '2df'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/mcp-server/overview',
                component: ComponentCreator('/mcp-server/overview', '735'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/mcp-server/setup',
                component: ComponentCreator('/mcp-server/setup', 'b22'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/mcp-server/tools',
                component: ComponentCreator('/mcp-server/tools', 'e77'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/quickstart',
                component: ComponentCreator('/quickstart', 'e4f'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/web/authentication',
                component: ComponentCreator('/web/authentication', 'dca'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/web/configuration',
                component: ComponentCreator('/web/configuration', 'ac7'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/',
                component: ComponentCreator('/', 'ebe'),
                exact: true,
                sidebar: "docs"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];

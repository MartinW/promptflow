import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docs: [
    {
      type: "category",
      label: "Get Started",
      collapsed: false,
      items: ["introduction", "quickstart"],
    },
    {
      type: "category",
      label: "Web App",
      collapsed: false,
      items: ["web/configuration", "web/authentication"],
    },
    {
      type: "category",
      label: "CLI",
      collapsed: false,
      items: ["cli/overview", "cli/commands"],
    },
    {
      type: "category",
      label: "MCP Server",
      collapsed: false,
      items: ["mcp-server/overview", "mcp-server/setup", "mcp-server/tools"],
    },
    {
      type: "category",
      label: "Concepts",
      collapsed: false,
      items: ["concepts/tags"],
    },
  ],
};

export default sidebars;

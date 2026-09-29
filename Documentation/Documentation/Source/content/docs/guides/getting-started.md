---
title: Getting Started
description: Set up documentation for TypeScript, component libraries, Unreal projects and plugins, or other C++ code.
group: Guides
order: 2
---

## Prerequisites

- Node.js 24 and npm 11.
- A repository with the source you want to document. The paths in `docs.config.json` are relative to the generated site root, so the source and any generated Doxygen XML must be inside that root.
- For C++ or Unreal API references, Doxygen and a build step that produces XML. The documentation build reads the XML; it does not run Doxygen.

The site generator writes to an **empty directory**. From its parent directory, create the site and install its dependencies:

```sh
npx --yes --package @sorrell/docs-create-website sorrell-docs init --target docs-site
cd docs-site
npm install
```

For an existing codebase, put the source you want to document under the new site root and update the root `package.json` workspaces as needed. In the examples below, `docs-site` is that root. Edit its `docs.config.json`, then run `npx sorrell-docs build` from the root to generate the API reference and build the site. Run `npx sorrell-docs dev` to view it locally. Authored articles live in `Documentation/Source/content/docs`; use Markdown, or MDX for interactive examples.

## Setup

### TypeScript projects

Place each package and its `package.json` under the site root. For example, `Package/Widgets/Source/index.ts` belongs to `Package/Widgets/package.json`. Add `Package/*` to the root `package.json` workspaces if these packages need workspace dependencies. In `docs.config.json`, enable API generation and list the public entry points and their package names:

```json
{
  "api": {
    "enabled": true,
    "entryPoints": ["Package/Widgets/Source/index.ts"],
    "packages": ["@example/widgets"]
  }
}
```

Add these fields to the generated configuration instead of replacing the whole file. The package name must match the name in `Package/Widgets/package.json`. Add an entry point and package name for each package you want to document. The build uses TypeDoc to generate the TypeScript reference from those entry points.

### TypeScript component libraries

First follow [TypeScript projects](#typescript-projects) to generate the library's API reference. When creating the site in the prerequisites step, add `--storybook` to the `init` command so the generated workspace includes `Storybook`:

```sh
npx --yes --package @sorrell/docs-create-website sorrell-docs init --storybook --target docs-site
```

Keep the library's public exports in `api.entryPoints`. Add component stories under `Storybook/Stories` using `*.stories.tsx`, and add longer examples or articles there as `*.mdx`. The generated Storybook configuration discovers those files. Import your components from the library, then run `npx sorrell-docs dev` from the site root to view the docs and Storybook together. A production build includes Storybook at `/storybook/`.

### Unreal projects

Keep the `.uproject` descriptor and project source under the site root. Configure your Unreal project's Doxygen step to write XML inside that root, then point `api.unreal.projects` to the descriptor and the directory containing `index.xml`:

```json
{
  "api": {
    "enabled": true,
    "unreal": {
      "projects": [
        {
          "id": "game",
          "name": "My Game",
          "version": "1.0.0",
          "descriptor": "Game/MyGame.uproject",
          "xmlDirectory": "Game/Build/Doxygen/xml"
        }
      ]
    }
  }
}
```

Generate the XML before running `npx sorrell-docs build`. The descriptor path must end in `.uproject`; both it and `xmlDirectory` must be relative to the site root. Use a distinct `id` for every C++ or Unreal API input. Doxygen includes documented public C++ declarations in the generated reference.

#### Plugins developed in the same project

If you also want reference pages for a plugin developed inside that Unreal project, generate a **separate Doxygen XML directory** for the plugin's source. Keep the project entry above and add a plugin entry in the same `api.unreal` object:

```json
{
  "api": {
    "enabled": true,
    "unreal": {
      "projects": [
        {
          "id": "game",
          "name": "My Game",
          "version": "1.0.0",
          "descriptor": "Game/MyGame.uproject",
          "xmlDirectory": "Game/Build/Doxygen/xml"
        }
      ],
      "plugins": [
        {
          "id": "inventory",
          "name": "Inventory",
          "version": "1.0.0",
          "descriptor": "Game/Plugins/Inventory/Inventory.uplugin",
          "xmlDirectory": "Game/Plugins/Inventory/Build/Doxygen/xml"
        }
      ]
    }
  }
}
```

Limit the project's Doxygen input to project source and the plugin's Doxygen input to plugin source so the two references do not repeat the same declarations.

### Unreal plugins without project documentation

To document only a plugin, configure `api.unreal.plugins` and leave `api.unreal.projects` empty. The site does not need an entry for the `.uproject` that contains the plugin:

```json
{
  "api": {
    "enabled": true,
    "unreal": {
      "plugins": [
        {
          "id": "inventory",
          "name": "Inventory",
          "version": "1.0.0",
          "descriptor": "Game/Plugins/Inventory/Inventory.uplugin",
          "xmlDirectory": "Game/Plugins/Inventory/Build/Doxygen/xml"
        }
      ]
    }
  }
}
```

Generate Doxygen XML from the plugin source, including `index.xml` in the configured directory, before building the site. The `.uplugin` descriptor must be inside the site root even when the containing Unreal project has no documentation entry.

### Other C++ projects

For C++ code outside Unreal, generate Doxygen XML for each project and configure `api.doxygen.projects`. No Unreal descriptor is needed:

```json
{
  "api": {
    "enabled": true,
    "doxygen": {
      "projects": [
        {
          "id": "engine",
          "name": "Engine",
          "version": "1.0.0",
          "xmlDirectory": "Engine/Build/Doxygen/xml"
        }
      ]
    }
  }
}
```

Set Doxygen's `GENERATE_XML` to `YES` and make sure `Engine/Build/Doxygen/xml/index.xml` exists before running `npx sorrell-docs build`. Keep the XML inside the site root and use a separate directory and unique `id` for each C++ project. You can combine these inputs with TypeScript packages or Unreal entries in the same `api` configuration.

For site branding, navigation, and routes, continue with [Customization](../customization/). The [configuration JSON schema](../../config-json-schema/) lists all supported fields.

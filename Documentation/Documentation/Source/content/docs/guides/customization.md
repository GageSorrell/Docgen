---
title: Customization
description: Customize site branding, theme tokens, navigation, and generated API references.
group: Guides
order: 3
---

## Configure the site

The site's `docs.config.json` controls its metadata, landing content, navigation, route prefixes, API references, Storybook integration, and publishing settings. The [configuration JSON schema](../config-json-schema/) describes every supported field.

## Set theme colors

Set `tokens.light` and `tokens.dark` to customize the colors used by the generated landing and documentation sites. Each theme accepts an `accent` color for links, highlights, and interactive states, alongside background, foreground, border, and code-background colors. Unspecified values keep their defaults.

## Organize navigation and API references

Add navigation items with stable IDs, labels, and routes. For generated API references, list each package's public TypeScript entry point in `api.entryPoints` and its npm package name in `api.packages`.

For a complete field reference, open the [configuration JSON schema](../config-json-schema/).

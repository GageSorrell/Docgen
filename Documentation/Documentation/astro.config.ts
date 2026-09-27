/**
 * Astro configuration for the Sorrell documentation dogfood site.
 *
 * @module @sorrell/documentation/astro.config
 *
 * @file      astro.config.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { docsAstroIntegration } from "@sorrell/docs-astro";

export default defineConfig({
    base: "/docs/",
    build: {
        format: "directory"
    },
    integrations: [ mdx(), docsAstroIntegration({ prefix: "/docs", site: "https://docs.sorrell.sh" }) ],
    output: "static",
    srcDir: "./Source",
    vite: { plugins: [ tailwindcss() ] }
});

/**
 * Copy the shared site logo into the documentation site's public directory as its favicon.
 *
 * @file generate-favicons.mjs
 */
import { copyFile, mkdir } from "node:fs/promises";

const publicDirectory = new URL("../public/", import.meta.url);
await mkdir(publicDirectory, { recursive: true });
await copyFile(
    new URL("../../../Resource/Logo.png", import.meta.url),
    new URL("../public/favicon.png", import.meta.url)
);

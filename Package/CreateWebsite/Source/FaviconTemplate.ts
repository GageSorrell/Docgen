/**
 *
 *
 * @module @sorrell/docs-create-website/FaviconTemplate
 *
 * @file      FaviconTemplate.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

/** Source for the static favicon step in generated Astro projects. */
export const faviconGeneratorSource = (
    logo: unknown,
    seed: string
): string => `import { mkdir, writeFile } from "node:fs/promises";

const logo = ${JSON.stringify(logo)};
const seed = ${JSON.stringify(seed)};
if (typeof logo !== "object" || logo === null || logo.type !== "dicebear") process.exit(0);

const buildUrl = (theme) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(logo.props ?? {})) {
        let selected = value;
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            const keys = Object.keys(value);
            if (keys.every((key) => key === "light" || key === "dark")) selected = value[theme] ?? value[theme === "light" ? "dark" : "light"];
            else selected = JSON.stringify(value);
        }
        if (selected === undefined || selected === null) continue;
        query.set(key, Array.isArray(selected) ? selected.map(String).join(",") : String(selected));
    }
    if (!query.has("seed")) query.set("seed", seed);
    query.set("tags", "!animation");
    return \`https://api.dicebear.com/10.x/\${encodeURIComponent(logo.style ?? "pixelbot")}/svg?\${query.toString()}\`;
};

await mkdir("public", { recursive: true });
for (const theme of ["light", "dark"]) {
    const response = await fetch(buildUrl(theme));
    if (!response.ok) throw new Error(\`DiceBear favicon request failed (\${response.status}): \${response.url}\`);
    await writeFile(\`public/favicon-\${theme}.svg\`, await response.text(), "utf8");
}
`;

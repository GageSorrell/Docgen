/**
 * Generate theme-specific static favicons from the configured DiceBear logo.
 *
 * @file generate-favicons.mjs
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";

const readConfig = async () => {
    for (const file of [ "docs.config.json", "../docs.config.json" ]) {
        try {
            return JSON.parse(await readFile(file, "utf8"));
        } catch (error) {
            if (error?.code !== "ENOENT") {throw error;}
        }
    }
    throw new Error("Could not find docs.config.json beside the site package or in its parent directory.");
};
const config = await readConfig();
const logo = config.metadata?.logo;
if (typeof logo !== "object" || logo === null || logo.type !== "dicebear") {process.exit(0);}

/** Build the API URL for one favicon theme. */
// eslint-disable-next-line @typescript-eslint/typedef
const buildUrl = (/** @type {"light" | "dark"} */ theme) =>
{
    const query = new URLSearchParams();
    for (const [ key, value ] of Object.entries(logo.props ?? {}))
    {
        let selected = value;
        if (typeof value === "object" && value !== null && !Array.isArray(value))
        {
            /** @type {Array<string>} */
            const keys = Object.keys(value);
            let onlyThemeKeys = true;
            for (const key of keys)
            {
                if (key !== "light" && key !== "dark")
                {
                    onlyThemeKeys = false;
                }
            }
            if (onlyThemeKeys)
            {
                selected = value[theme] ?? value[theme === "light" ? "dark" : "light"];
            }
            else {selected = JSON.stringify(value);}
        }
        if (selected === undefined || selected === null) {continue;}
        query.set(key, Array.isArray(selected) ? selected.map(String).join(",") : String(selected));
    }
    if (!query.has("seed")) {query.set("seed", config.metadata.name);}
    query.set("tags", "!animation");
    const style = encodeURIComponent(logo.style ?? "pixelbot");
    return `https://api.dicebear.com/10.x/${style}/svg?${query.toString()}`;
};

await mkdir("public", { recursive: true });
for (const theme of [ "light", "dark" ])
{
    const response = await fetch(buildUrl(theme));
    if (!response.ok)
    {
        throw new Error(`DiceBear favicon request failed (${response.status}): ${response.url}`);
    }
    await writeFile(`public/favicon-${theme}.svg`, await response.text(), "utf8");
}

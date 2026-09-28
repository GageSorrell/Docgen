/**
 *
 *
 * @module @sorrell/documentation/lib/dicebear
 *
 * @file      dicebear.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

export interface DicebearLogo {
    readonly type: "dicebear";
    readonly style?: string | undefined;
    readonly props?: Readonly<Record<string, unknown>> | undefined;
}

export type SiteLogo = string | DicebearLogo;
export type AvatarTheme = "light" | "dark";

const optionValue = (value: unknown, theme: AvatarTheme): string | undefined =>
{
    if (value === undefined || value === null) {return undefined;}
    if (Array.isArray(value)) {return value.map(String).join(",");}
    if (typeof value === "object")
    {
        const variants = value as { readonly light?: unknown; readonly dark?: unknown };
        if (Object.keys(variants).every((key) => key === "light" || key === "dark"))
        {
            const selected = variants[theme] ?? variants[theme === "light" ? "dark" : "light"];
            return typeof selected === "string" ? selected : undefined;
        }
        return JSON.stringify(value);
    }
    return String(value);
};

export const dicebearAvatarUrl = (
    logo: DicebearLogo,
    seed: string,
    theme: AvatarTheme,
    staticImage = false
): string =>
{
    const query = new URLSearchParams();
    for (const [ key, value ] of Object.entries(logo.props ?? {}))
    {
        const serialized = optionValue(value, theme);
        if (serialized !== undefined) {query.set(key, serialized);}
    }
    if (!query.has("seed")) {query.set("seed", seed);}
    if (staticImage) {query.set("tags", "!animation");}
    const style = encodeURIComponent(logo.style ?? "pixelbot");
    return `https://api.dicebear.com/10.x/${style}/svg?${query.toString()}`;
};

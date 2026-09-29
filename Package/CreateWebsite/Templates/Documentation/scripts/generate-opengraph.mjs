/**
 * Build a self-contained Open Graph banner for a documentation site.
 *
 * @file generate-opengraph.mjs
 */
// @ts-check
/* eslint-disable @typescript-eslint/typedef */
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import { fileURLToPath } from "node:url";

/**
 * @typedef {object} SiteConfig
 * @property {{ logo?: string; name?: string; title?: string; url?: string }} [metadata] - Social metadata.
 * @property {{ light?: { background?: string; foreground?: string } }} [tokens] - Theme tokens.
 * @property {object} [banner] - Overrides for generated social banner appearance.
 * @property {string} [banner.backgroundColor] - Color painted behind the centered logo or title.
 * @property {number} [banner.logoHeight] - Maximum logo height.
 * @property {number} [banner.logoWidth] - Maximum logo width.
 */
/** @typedef {{ height: number; width: number }} Dimensions */
/** @typedef {{ bytes: Buffer; dimensions: Dimensions; mimeType: string }} LogoAsset */

const xmlEscape = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");

const positiveDimensions = (width, height) =>
{
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
    {
        throw new Error("The configured logo has no usable intrinsic dimensions.");
    }
    return { height, width };
};

const readSvgDimensions = (bytes) =>
{
    const svg = new TextDecoder().decode(bytes).replace(/^\uFEFF/u, "");
    const root = svg.match(/<svg\b[^>]*>/iu)?.[0];
    if (root === undefined)
    {
        throw new Error("The SVG logo does not contain an <svg> root element.");
    }
    const attribute = (name) => root.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "iu"))?.[1];
    const parseDimension = (value) =>
    {
        const match = value?.trim().match(/^([\d.]+)(?:px)?$/u);
        const dimension = match === null || match === undefined ? undefined : Number(match[1]);
        return dimension !== undefined && Number.isFinite(dimension) && dimension > 0 ? dimension : undefined;
    };
    const viewBox = attribute("viewBox")?.trim().split(/[\s,]+/u).map(Number);
    const viewBoxWidth = viewBox?.length === 4 ? viewBox[2] : undefined;
    const viewBoxHeight = viewBox?.length === 4 ? viewBox[3] : undefined;
    const width = parseDimension(attribute("width")) ?? viewBoxWidth;
    const height = parseDimension(attribute("height")) ?? viewBoxHeight;
    return positiveDimensions(width, height);
};

const readRasterDimensions = (bytes, mimeType) =>
{
    if (mimeType === "image/png" && bytes.length >= 24)
    {
        return positiveDimensions(bytes.readUInt32BE(16), bytes.readUInt32BE(20));
    }
    if (mimeType === "image/gif" && bytes.length >= 10)
    {
        return positiveDimensions(bytes.readUInt16LE(6), bytes.readUInt16LE(8));
    }
    if (mimeType === "image/jpeg")
    {
        const startOfFrame = new Set([
            0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
            0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf
        ]);
        for (let offset = 2; offset + 9 < bytes.length;)
        {
            if (bytes[offset] !== 0xff)
            {
                offset += 1;
                continue;
            }
            const marker = bytes[offset + 1];
            if (marker === undefined) {break;}
            if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7))
            {
                offset += 2;
                continue;
            }
            const segmentLength = bytes.readUInt16BE(offset + 2);
            if (startOfFrame.has(marker))
            {
                return positiveDimensions(
                    bytes.readUInt16BE(offset + 7),
                    bytes.readUInt16BE(offset + 5)
                );
            }
            if (segmentLength < 2) {break;}
            offset += segmentLength + 2;
        }
    }
    if (mimeType === "image/webp" && bytes.length >= 30)
    {
        const chunk = bytes.toString("ascii", 12, 16);
        if (chunk === "VP8X")
        {
            return positiveDimensions(
                1 + bytes.readUIntLE(24, 3),
                1 + bytes.readUIntLE(27, 3)
            );
        }
        if (chunk === "VP8L" && bytes[20] === 0x2f)
        {
            const b1 = bytes[21] ?? 0;
            const b2 = bytes[22] ?? 0;
            const b3 = bytes[23] ?? 0;
            const b4 = bytes[24] ?? 0;
            return positiveDimensions(
                1 + b1 + ((b2 & 0x3f) << 8),
                1 + ((b2 & 0xc0) >> 6) + (b3 << 2) + ((b4 & 0x0f) << 10)
            );
        }
        if (chunk === "VP8 " && bytes.toString("hex", 23, 26) === "9d012a")
        {
            return positiveDimensions(bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff);
        }
    }
    throw new Error(`Unable to read dimensions for ${mimeType} logo.`);
};

const identifyLogo = (bytes) =>
{
    if (bytes.length >= 24 && bytes.toString("hex", 0, 8) === "89504e470d0a1a0a") {return "image/png";}
    if (bytes.length >= 10 && /^GIF8[79]a$/u.test(bytes.toString("ascii", 0, 6))) {return "image/gif";}
    if (
        bytes.length >= 12 &&
        bytes.toString("ascii", 0, 4) === "RIFF" &&
        bytes.toString("ascii", 8, 12) === "WEBP"
    ) {return "image/webp";}
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    {return "image/jpeg";}
    const svgHeader = /^\uFEFF?\s*(?:<\?xml[^>]*>\s*)?<svg\b/iu;
    if (svgHeader.test(new TextDecoder().decode(bytes))) {return "image/svg+xml";}
    throw new Error("Unsupported logo format. Use PNG, JPEG, GIF, WebP, or SVG.");
};

const readLogo = async (logo, publicDirectory) =>
{
    let bytes;
    if (/^https?:\/\//iu.test(logo))
    {
        const response = await fetch(logo);
        if (!response.ok)
        {
            throw new Error(`Unable to fetch logo (${response.status}): ${logo}`);
        }
        bytes = Buffer.from(await response.arrayBuffer());
    }
    else
    {
        const siteRelativeUrl = new URL(logo, "https://site.invalid");
        const relativeLogoPath = decodeURIComponent(siteRelativeUrl.pathname).replace(/^\/+/, "");
        const logoPath = resolve(publicDirectory, relativeLogoPath);
        const fromPublic = relative(publicDirectory, logoPath);
        const parentPrefix = `..${process.platform === "win32" ? "\\" : "/"}`;
        if (fromPublic === ".." || fromPublic.startsWith(parentPrefix) || isAbsolute(fromPublic))
        {
            throw new Error("Site-relative logo paths must stay within the site's public directory.");
        }
        bytes = await readFile(logoPath);
    }
    const mimeType = identifyLogo(bytes);
    const dimensions = mimeType === "image/svg+xml"
        ? readSvgDimensions(bytes)
        : readRasterDimensions(bytes, mimeType);
    return { bytes, dimensions, mimeType };
};

/**
 * Create a self-contained SVG banner from the site config and public assets.
 * @param {SiteConfig} config - Site configuration.
 * @param {string} publicDirectory - Site public directory for site-relative logos.
 * @returns {Promise<string>} Complete SVG markup.
 */
export async function createOpenGraphSvg(config, publicDirectory)
{
    const banner = config.banner ?? {};
    const defaultBackgroundColor = config.tokens?.light?.background ?? "#ffffff";
    const backgroundColor = banner.backgroundColor ?? defaultBackgroundColor;
    const title = config.metadata?.title || config.metadata?.name || "Documentation";
    for (const dimension of [ "logoWidth", "logoHeight" ])
    {
        const value = banner[dimension];
        if (value !== undefined && (!Number.isFinite(value) || value <= 0))
        {
            throw new Error(`banner.${dimension} must be a positive finite number.`);
        }
    }
    let logoElement = "";
    if (config.metadata?.logo)
    {
        const logo = await readLogo(config.metadata.logo, publicDirectory);
        const aspectRatio = logo.dimensions.width / logo.dimensions.height;
        const defaultBox = aspectRatio > 1.25
            ? { height: 240, width: 760 }
            : { height: 256, width: 256 };
        const maxWidth = Math.min(banner.logoWidth ?? defaultBox.width, 1200);
        const maxHeight = Math.min(banner.logoHeight ?? defaultBox.height, 630);
        const scale = Math.min(
            maxWidth / logo.dimensions.width,
            maxHeight / logo.dimensions.height
        );
        const width = logo.dimensions.width * scale;
        const height = logo.dimensions.height * scale;
        const x = (1200 - width) / 2;
        const y = (630 - height) / 2;
        const data = logo.bytes.toString("base64");
        logoElement = `<image x="${x}" y="${y}" width="${width}" height="${height}" ` +
            `href="data:${logo.mimeType};base64,${data}" />`;
    }
    else
    {
        const foreground = xmlEscape(config.tokens?.light?.foreground ?? "#111111");
        const fontSize = Math.max(24, Math.min(64, 1050 / (String(title).length * 0.56)));
        logoElement = "<text x=\"600\" y=\"315\" text-anchor=\"middle\" dominant-baseline=\"middle\" " +
            `fill="${foreground}" font-family="Arial, Helvetica, sans-serif" ` +
            `font-size="${fontSize}" font-weight="600">${xmlEscape(title)}</text>`;
    }
    return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1200\" height=\"630\" " +
        "viewBox=\"0 0 1200 630\">\n" +
        "<rect x=\"0\" y=\"0\" width=\"1200\" height=\"630\" " +
        `fill="${xmlEscape(backgroundColor)}" />\n${logoElement}\n</svg>\n`;
}

/**
 * Generate and write the Open Graph SVG for this site package.
 * @returns {Promise<void>} Resolves after writing public/opengraph.svg.
 */
const main = async () =>
{
    const scriptDirectory = dirname(fileURLToPath(import.meta.url));
    const siteDirectory = resolve(scriptDirectory, "..");
    const publicDirectory = resolve(siteDirectory, "public");
    const configPath = resolve(siteDirectory, "..", "docs.config.json");
    /** @type {SiteConfig} */
    const config = JSON.parse(await readFile(configPath, "utf8"));
    const svg = await createOpenGraphSvg(config, publicDirectory);
    await writeFile(resolve(publicDirectory, "opengraph.svg"), svg, "utf8");
    process.stdout.write("Generated public/opengraph.svg (1200 × 630).\n");
};

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
{
    await main();
}

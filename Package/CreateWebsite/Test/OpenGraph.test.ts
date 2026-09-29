/**
 * Open Graph banner generation and template integration tests.
 *
 * @module @sorrell/docs-create-website/Test/OpenGraphTest
 * @file OpenGraph.test.ts
 */

import { createServer } from "node:http";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createOpenGraphSvg } from "../../../Documentation/Landing/scripts/generate-opengraph.mjs";

const pngHeader = (width: number, height: number): Buffer =>
{
    const bytes = Buffer.alloc(24);
    Buffer.from([ 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a ]).copy(bytes);
    bytes.writeUInt32BE(13, 8);
    bytes.write("IHDR", 12);
    bytes.writeUInt32BE(width, 16);
    bytes.writeUInt32BE(height, 20);
    return bytes;
};

const generateBanner = async (
    config: Record<string, unknown>,
    assets: Readonly<Record<string, Buffer | string>> = {}
): Promise<string> =>
{
    const temporaryRoot = await mkdtemp(join(tmpdir(), "sorrell-opengraph-"));
    const siteRoot = join(temporaryRoot, "Landing");
    const publicPath = join(siteRoot, "public");
    try
    {
        await mkdir(publicPath, { recursive: true });
        for (const [ path, data ] of Object.entries(assets))
        {
            await writeFile(join(publicPath, path), data);
        }
        return await createOpenGraphSvg(config, publicPath);
    }
    finally
    {
        await rm(temporaryRoot, { force: true, recursive: true });
    }
};

describe("Open Graph banner generation", () =>
{
    it("centers square and wide logos in their adaptive boxes and honors overrides", async () =>
    {
        const squareBytes = pngHeader(400, 400);
        const square = await generateBanner({
            metadata: { logo: "/square.png", name: "Example", title: "Example" },
            tokens: { light: { background: "#ffffff" } }
        }, { "square.png": squareBytes });
        expect(square).toContain("width=\"1200\" height=\"630\" viewBox=\"0 0 1200 630\"");
        expect(square).toContain("<rect x=\"0\" y=\"0\" width=\"1200\" height=\"630\" fill=\"#ffffff\" />");
        expect(square).toContain("x=\"472\" y=\"187\" width=\"256\" height=\"256\"");
        expect(square).toContain(`data:image/png;base64,${squareBytes.toString("base64")}`);

        const wide = await generateBanner({
            banner: { backgroundColor: "#123456", logoHeight: 100, logoWidth: 400 },
            metadata: { logo: "/wide.svg", name: "Example", title: "Example" }
        }, { "wide.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1200\" height=\"300\" viewBox=\"0 0 1200 300\"><path d=\"M0 0h1v1z\"/></svg>" });
        expect(wide).toContain("fill=\"#123456\"");
        expect(wide).toContain("width=\"400\" height=\"100\"");
    });

    it("creates a centered title card when no logo is configured", async () =>
    {
        const svg = await generateBanner({
            metadata: { name: "Example", title: "Example & Docs" },
            tokens: { light: { background: "#fafafa", foreground: "#101010" } }
        });
        expect(svg).toContain("fill=\"#fafafa\"");
        expect(svg).toContain("fill=\"#101010\"");
        expect(svg).toContain("Example &amp; Docs");
        expect(svg).toContain("text-anchor=\"middle\"");
    });

    it("fetches HTTP logos and rejects unreadable or unsupported logos", async () =>
    {
        const remotePng = pngHeader(800, 200);
        const server = createServer((_request, response) =>
        {
            response.writeHead(200, { "content-type": "image/png" });
            response.end(remotePng);
        });
        await new Promise<void>((resolve, reject) =>
        {
            server.once("error", reject);
            server.listen(0, "127.0.0.1", resolve);
        });
        try
        {
            const address = server.address();
            if (address === null || typeof address === "string") {throw new Error("Test server has no TCP address.");}
            const svg = await generateBanner({
                metadata: { logo: `http://127.0.0.1:${address.port}/logo`, name: "Example", title: "Example" }
            });
            expect(svg).toContain(`data:image/png;base64,${remotePng.toString("base64")}`);
            expect(svg).toContain("width=\"760\" height=\"190\"");
        }
        finally
        {
            await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
        }

        await expect(generateBanner({
            metadata: { logo: "/missing.png", name: "Example", title: "Example" }
        })).rejects.toThrow();
        await expect(generateBanner({
            metadata: { logo: "/unsupported.bmp", name: "Example", title: "Example" }
        }, { "unsupported.bmp": Buffer.from("not an image") })).rejects.toThrow(/Unsupported logo format/u);
    });
});

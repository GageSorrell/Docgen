/**
 *
 *
 * @module generated-documentation-landing/Astro/pagefind.d
 *
 * @file      pagefind.d.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

/**
 * Minimal type boundary for Pagefind's browser-only UI package.
 *
 * @file      pagefind.d.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

declare module "@pagefind/default-ui" {
    export interface PagefindUIOptions {
        readonly bundlePath?: string;
        readonly element: string;
        readonly showImages?: boolean;
    }

    export class PagefindUI {
        public constructor(options: PagefindUIOptions);
    }
}

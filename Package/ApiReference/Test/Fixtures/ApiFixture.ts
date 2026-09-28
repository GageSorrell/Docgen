/**
 *
 *
 * @module @sorrell/fixture/Test/Fixtures/ApiFixture
 *
 * @file      ApiFixture.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import { Effect } from "effect";

/** A small TypeDoc fixture. */
export interface Greeting {
    readonly message: string;
}

/**
 * Returns a greeting.
 *
 * @category Greetings
 */
export const hello = (): Greeting => ({ message: "hello" });

/**
 * Links to {@link hello | the greeting function}, {@link https://example.com | the external site}, and {@link Effect.gen}.
 */
export const linkedReferences = Effect.gen(function*() {
    return true;
});

export const undocumented = true;

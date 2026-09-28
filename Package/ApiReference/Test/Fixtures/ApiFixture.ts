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

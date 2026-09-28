/**
 *
 *
 * @module @sorrell/fixture/Extra
 *
 * @file      Extra.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import { hello } from "../ApiFixture.js";

/** An additional exported module fixture. */
export const extra = "extra";

/** Links to the root module's {@link hello | greeting function}. */
export const rootGreeting = hello;

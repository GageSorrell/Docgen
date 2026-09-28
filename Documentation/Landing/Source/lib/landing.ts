/**
 *
 *
 * @module generated-documentation-landing/lib/landing
 *
 * @file      landing.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

/**
 * @module generated-documentation-landing/lib/landing
 * @file landing.ts
 * @author Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license MIT
 */

import type { SiteLogo } from "./dicebear.js";

export interface LandingNavItem {
    readonly label: string
    readonly href: string
    readonly external?: boolean
}

export interface LandingInstallOption {
    readonly id: string
    readonly label: string
    readonly command: string
}

export interface LandingCapabilityItem {
    readonly value: string
    readonly label: string
}

export interface LandingComparisonFeature {
    readonly id: string
    readonly label: string
    readonly title: string
    readonly description: string
    readonly without: string
    readonly with: string
}

export interface LandingComparisonTier {
    readonly id: string
    readonly label: string
    readonly description: string
    readonly features: ReadonlyArray<LandingComparisonFeature>
}

export interface LandingCapability {
    readonly eyebrow: string
    readonly title: string
    readonly description: string
    readonly href: string
    readonly linkLabel: string
}

export interface LandingStatement {
    readonly label: string
    readonly title: string
    readonly description: string
}

export interface LandingFaq {
    readonly question: string
    readonly answer: string
}

export interface LandingPipelineStep {
    readonly value: string
    readonly title: string
    readonly description: string
}

export interface LandingSectionContent {
    readonly capabilityLabel: string
    readonly examplesCaption: string
    readonly examplesLabel: string
    readonly problemLabel: string
    readonly problemTitle: string
    readonly modelLabel: string
    readonly modelTitle: string
    readonly modelDescription: string
    readonly modelChecks: ReadonlyArray<string>
    readonly codingLabel: string
    readonly codingTitle: string
    readonly codingDescription: string
    readonly codingLinkLabel: string
    readonly quotesLabel: string
    readonly quotesTitle: string
    readonly faqLabel: string
    readonly faqTitle: string
    readonly faqDescription: string
    readonly ctaTitle: string
    readonly pipelineSteps: ReadonlyArray<LandingPipelineStep>
}

export interface LandingPageConfig {
    readonly name: string
    readonly logo?: SiteLogo | undefined
    readonly eyebrow: string
    readonly title: string
    readonly description: string
    readonly content: LandingSectionContent
    readonly navItems: ReadonlyArray<LandingNavItem>
    readonly installOptions: ReadonlyArray<LandingInstallOption>
    readonly primaryCta: LandingNavItem
    readonly secondaryCta: LandingNavItem
    readonly capabilityItems: ReadonlyArray<LandingCapabilityItem>
    readonly comparisonTiers: ReadonlyArray<LandingComparisonTier>
    readonly modelRows: ReadonlyArray<LandingCapabilityItem>
    readonly capabilities: ReadonlyArray<LandingCapability>
    readonly statements: ReadonlyArray<LandingStatement>
    readonly faqs: ReadonlyArray<LandingFaq>
}

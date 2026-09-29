/**
 *
 *
 * @module @sorrell/docs-storybook-web/Stories/LandingPage.stories
 *
 * @file      LandingPage.stories.tsx
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import {
    Cta,
    Footer,
    Faq,
    InstallCommand,
    LandingPage,
    LandingSection,
    QuoteRail
} from "@sorrell/docs-ui";

const meta = {
    component: LandingPage,
    title: "Landing/LandingPage"
} satisfies Meta<typeof LandingPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const FullComposition: Story = {
    args: {
        content: {
            description: "Documentation designed for people and agents.",
            sections: [
                { body: "Readable articles and stable links.", id: "01", title: "Docs", href: "#docs" },
                { body: "Shared React primitives for every surface.", id: "02", title: "Components", href: "#components" }
            ],
            title: "Sorrell Documentation"
        },
        installCommand: "npm install @sorrell/docs-ui"
    },
    render: (args) => <LandingPage {...args}>
        <LandingSection title="Components">
            <div style={{ display: "grid", gap: 24 }}>
                <InstallCommand command="npm install @sorrell/docs-ui" />
                <QuoteRail author="Sorrell" quote="Make the useful path the obvious path." />
                <Faq items={[ { question: "Is this keyboard friendly?", answer: "The controls use native focusable elements." } ]} />
            </div>
        </LandingSection>
        <Cta href="/docs/" label="Read the docs" title="Build something worth documenting." />
        <Footer
            columns={[
                { title: "Resources", links: [ { href: "/docs/", label: "Documentation" }, { href: "/storybook/", label: "Storybook" } ] },
                { title: "Community", links: [ { href: "https://github.com/GageSorrell/Documentation", label: "GitHub" } ] }
            ]}
            links={[ { href: "https://github.com/GageSorrell/Documentation", label: "GitHub", icon: "github" } ]}
            message="© Sorrell Documentation"
        />
    </LandingPage>
};

export const LongContent: Story = {
    ...FullComposition,
    args: {
        ...FullComposition.args,
        content: {
            description: "A deliberately long description demonstrates responsive wrapping and readable line lengths across viewports.",
            sections: Array.from({ length: 6 }, (_, index) => ({
                body: "A representative landing-page section with enough content to exercise the layout.",
                id: String(index + 1).padStart(2, "0"),
                title: "Section " + (index + 1)
            })),
            title: "A Longer Landing Page Title"
        }
    }
};

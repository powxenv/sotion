import { LegalDocument } from "#/components/legal-document";
import { createFileRoute } from "@tanstack/react-router";

const LAST_UPDATED = "March 27, 2026";

export const Route = createFileRoute("/_layout/terms")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      summary="These Terms govern your use of Sotion, an open-source AI agent for managing content operations and publishing to connected social media platforms."
      lastUpdated={LAST_UPDATED}
    >
      <h2>1. Acceptance of These Terms</h2>
      <p>
        Sotion provides software that helps individuals and teams organize
        content workflows, generate AI-assisted drafts, review publishing plans,
        and publish content to connected third-party platforms. By accessing or
        using Sotion, you agree to these Terms of Service.
      </p>

      <h2>2. Who May Use Sotion</h2>
      <p>
        You may use Sotion only if you are legally able to enter into these
        Terms for yourself or for the organization you represent. You are
        responsible for maintaining the security of your account, credentials,
        connected workspaces, and linked social media accounts, and for all
        activity that occurs through them.
      </p>

      <h2>3. The Service We Provide</h2>
      <p>
        Sotion may allow you to connect tools such as Notion, AI model
        providers, and social media platforms so the service can read authorized
        context, generate suggested content, store workflow state, and publish
        or schedule posts on your behalf. Features may change over time as the
        product evolves or as third-party platform requirements change.
      </p>

      <h2>4. Open Source Software</h2>
      <p>
        Sotion includes or may be distributed with open-source software. Any
        open-source components are governed by their respective licenses, which
        apply only to those components. These Terms govern your use of the
        hosted Sotion service and do not replace or limit rights granted under
        applicable open-source licenses.
      </p>

      <h2>5. Your Account, Integrations, and Permissions</h2>
      <p>
        When you connect third-party services, you authorize Sotion to access
        and use the data and permissions you explicitly grant in order to
        provide requested functionality. Your use of those third-party services
        remains subject to their own terms, policies, platform rules, and API
        restrictions. You are responsible for ensuring that you are authorized
        to connect and use those accounts through Sotion.
      </p>

      <h2>6. Your Content</h2>
      <p>
        You retain ownership of the prompts, source materials, brand assets,
        drafts, and other content you submit to Sotion. You grant Sotion a
        limited right to host, process, transform, and transmit that content as
        needed to operate the service for you, including generating outputs,
        storing workflow state, and sending content to publishing destinations
        you choose.
      </p>
      <p>
        You represent that you have all rights, consents, and permissions
        necessary for Sotion to process your content and publish it through your
        connected accounts.
      </p>

      <h2>7. AI Output and Publishing Responsibility</h2>
      <p>
        Sotion uses AI systems to help draft, summarize, classify, and transform
        content. AI-generated output may be inaccurate, incomplete, biased, or
        otherwise unsuitable for your intended use. You are responsible for
        reviewing, approving, and taking final responsibility for anything
        published, scheduled, or otherwise distributed using Sotion, including
        compliance with advertising rules, required disclosures, intellectual
        property laws, employment obligations, and platform-specific policies.
      </p>

      <h2>8. Acceptable Use</h2>
      <p>You may not use Sotion to:</p>
      <ul>
        <li>violate law, regulation, or third-party rights;</li>
        <li>
          publish deceptive, defamatory, infringing, harassing, hateful, or
          unlawful content;
        </li>
        <li>
          attempt to bypass platform restrictions, rate limits, or access
          controls;
        </li>
        <li>
          interfere with the security, integrity, or normal operation of the
          service; or
        </li>
        <li>
          use Sotion to develop or operate a competing service through
          unauthorized scraping, reverse engineering, or abuse of the platform.
        </li>
      </ul>

      <h2>9. Availability, Suspension, and Termination</h2>
      <p>
        We may suspend, restrict, or terminate access to Sotion if we believe
        your use creates security risk, legal exposure, harm to others, or a
        violation of these Terms or applicable third-party platform
        requirements. You may stop using Sotion at any time. Upon termination,
        your right to use the service ends, though provisions that should
        survive by their nature will remain in effect.
      </p>

      <h2>10. Service Changes</h2>
      <p>
        We may update, improve, limit, or discontinue features from time to time
        as the product evolves, including changes required by AI providers,
        platform partners, or applicable law. If Sotion introduces paid plans or
        usage-based pricing, the applicable commercial terms will be presented
        separately before charges apply.
      </p>

      <h2>11. Disclaimers</h2>
      <p>
        Sotion is provided on an &quot;as is&quot; and &quot;as available&quot;
        basis to the maximum extent permitted by law. We do not guarantee that
        the service will be uninterrupted, error-free, secure, or compatible
        with every third-party platform or workflow, or that AI-generated output
        will be correct, original, or fit for your intended use.
      </p>

      <h2>12. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, Sotion and its operators will
        not be liable for indirect, incidental, special, consequential, or
        punitive damages, or for loss of profits, revenue, goodwill, data, or
        business opportunities arising from or related to your use of the
        service. Any aggregate liability will be limited to the amount you paid
        for Sotion during the 12 months preceding the event giving rise to the
        claim, or if you have not paid any amount, a nominal amount of one
        hundred U.S. dollars.
      </p>

      <h2>13. Changes to These Terms</h2>
      <p>
        We may revise these Terms from time to time. When we do, we will update
        the &quot;Last updated&quot; date above. Your continued use of Sotion
        after revised Terms become effective means you accept the updated Terms.
      </p>

      <h2>14. Contact</h2>
      <p>
        If you have questions about these Terms, please contact Sotion through
        the official support or business contact channel made available in the
        product or by the organization operating the service.
      </p>
    </LegalDocument>
  );
}

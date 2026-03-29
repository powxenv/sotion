import { LegalDocument } from "#/components/legal-document";
import { createFileRoute } from "@tanstack/react-router";

const LAST_UPDATED = "March 27, 2026";

export const Route = createFileRoute("/_layout/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      summary="This Privacy Policy explains what information Sotion collects, how we use it, and how we handle it when you use the hosted service."
      lastUpdated={LAST_UPDATED}
    >
      <h2>1. Scope</h2>
      <p>
        This Privacy Policy applies to information processed through Sotion when
        you access the product, connect third-party services, submit content,
        generate AI-assisted drafts, or publish to social media accounts through
        the service.
      </p>

      <h2>2. Open Source and Hosted Service Context</h2>
      <p>
        Sotion may be available as open-source software, but this Privacy Policy
        applies to the hosted service and the information processed by the
        operators of that service. If you self-host Sotion or modify the code,
        your own deployment and data handling practices may differ from what is
        described here.
      </p>

      <h2>3. Information We Collect</h2>
      <p>Depending on how you use Sotion, we may collect and process:</p>
      <ul>
        <li>
          account and profile information such as your name, email address,
          avatar, workspace identity, and login metadata;
        </li>
        <li>
          content and workflow data, including prompts, source materials, draft
          posts, publishing instructions, schedules, approvals, and related
          metadata;
        </li>
        <li>
          connected service data from tools you authorize, such as Notion
          workspace context, social account identifiers, publishing permissions,
          and platform response data;
        </li>
        <li>
          AI provider configuration data and encrypted credentials you choose to
          store so Sotion can access approved model providers on your behalf;
          and
        </li>
        <li>
          technical and usage information such as log records, browser and
          device details, IP address, and diagnostic events needed to secure and
          operate the service.
        </li>
      </ul>

      <h2>4. How We Use Information</h2>
      <p>We use information to:</p>
      <ul>
        <li>provide, maintain, secure, and improve Sotion;</li>
        <li>
          authenticate users and maintain connected integrations and sessions;
        </li>
        <li>
          generate, transform, organize, and publish content according to your
          prompts, approvals, and workflow settings;
        </li>
        <li>
          communicate with you about service updates, support matters, security
          notices, and operational issues; and
        </li>
        <li>
          comply with legal obligations, enforce our terms, and prevent fraud,
          abuse, or misuse of the service.
        </li>
      </ul>

      <h2>5. AI and Automated Processing</h2>
      <p>
        Sotion uses AI models and automation to help classify materials, draft
        content, summarize context, and prepare posts for distribution. To
        provide these features, relevant prompts, instructions, and source
        content may be sent to the AI providers or processing infrastructure you
        configure through the service. You should avoid submitting highly
        sensitive information unless you have confirmed that doing so is
        appropriate for your own legal, regulatory, and contractual obligations.
      </p>

      <h2>6. How We Share Information</h2>
      <p>We may share information:</p>
      <ul>
        <li>
          with service providers and infrastructure partners that help us host,
          secure, analyze, and operate Sotion;
        </li>
        <li>
          with AI providers, social media platforms, and other third-party
          services you choose to connect, but only as needed to deliver the
          requested functionality;
        </li>
        <li>
          when required by law, regulation, legal process, or to protect rights,
          safety, and security; and
        </li>
        <li>
          in connection with a merger, acquisition, financing, reorganization,
          or sale of assets, subject to appropriate confidentiality and legal
          safeguards.
        </li>
      </ul>

      <h2>7. Data Retention</h2>
      <p>
        We retain information for as long as reasonably necessary to provide the
        service, maintain records of your workflows and integrations, resolve
        disputes, enforce agreements, and meet legal or security obligations.
        Retention periods may vary depending on the type of data, your account
        status, and the requirements of connected third-party services.
      </p>

      <h2>8. Security</h2>
      <p>
        We use administrative, technical, and organizational measures designed
        to protect information processed through Sotion. No method of
        transmission or storage is completely secure, however, and we cannot
        guarantee absolute security.
      </p>

      <h2>9. International Processing</h2>
      <p>
        Sotion and its service providers may process information in countries
        other than the one where you are located. By using the service, you
        understand that your information may be transferred to and processed in
        jurisdictions with different data protection rules, subject to
        applicable legal safeguards where required.
      </p>

      <h2>10. Your Choices and Rights</h2>
      <p>
        Depending on your location, you may have rights to access, correct,
        delete, export, or object to certain processing of your personal
        information. You may also disconnect third-party integrations or stop
        using Sotion at any time. We will evaluate and respond to privacy
        requests in accordance with applicable law.
      </p>

      <h2>11. Children&apos;s Privacy</h2>
      <p>
        Sotion is intended for business and professional use and is not directed
        to children. If we learn that we have collected personal information
        from a child in violation of applicable law, we will take appropriate
        steps to delete it.
      </p>

      <h2>12. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. When we do, we will
        revise the &quot;Last updated&quot; date above. Your continued use of
        Sotion after an updated policy becomes effective means the updated
        policy will apply going forward.
      </p>

      <h2>13. Contact</h2>
      <p>
        If you have questions or requests about this Privacy Policy, please
        contact Sotion through the official support or business contact channel
        made available in the product or by the organization operating the
        service.
      </p>
    </LegalDocument>
  );
}

import { useEffect, useRef } from "react";
import { POLICY_VERSION } from "./policies";

export function PolicyContent() {
  return (
    <div className="policy-content">
      <p className="hint">
        Terms and Privacy Notice · Version {POLICY_VERSION}
      </p>
      <h2>Before you share data or run a team application</h2>
      <p>
        Compute Loop coordinates jobs across computers that workspace members
        choose to connect. Workspace members can download readable inputs,
        application packages, and results. The platform cannot prevent a member from copying files they receive.
      </p>
      <p>
        <strong>
          Use public, synthetic, or appropriately anonymized datasets. Do not
          upload secrets, credentials, personal or sensitive information, or
          confidential business data.
        </strong>{" "}
        Removing a name alone may not anonymize a dataset.
      </p>

      <h2>Terms of Service</h2>
      <h3>1. Your account and permitted use</h3>
      <p>
        By creating an account, you agree to these terms. Keep your password private. Use the service lawfully and only upload
        material you have permission to share with the platform and
        participating workspace members. You retain ownership of your uploads; you
        grant permission to store, distribute, and process them only to deliver
        the requested service.
      </p>
      <h3>2. Workspace owner and admin responsibilities</h3>
      <p>
        Review and minimize data before uploading it. Invite only the people who
        should have access. Owners and admins publish application packages and
        define tasks. Test your package before asking members to run it.
      </p>
      <h3>3. Member responsibilities and machine safety</h3>
      <p>
        Use shared files only for the workspace's authorized work. Do not sell, publish, retain
        for unrelated use, redistribute, or attempt to identify people in
        another user's dataset. Do not tamper with results, attack other users,
        or upload malicious files. Keep any copies you need for authorized work within your team's access controls.
      </p>
      <p>Only run workers you trust. The researcher supplies the software and instructions. Compute Loop does not execute or inspect that software on your behalf.</p>
      <h3>4. Results, subscriptions, and availability</h3>
      <p>
        Demo compute coins cannot be exchanged for money and do not reward machine owners. A result is checked for valid JSON, not scientific correctness. Verify results before relying on them. The beta may produce
        inaccurate results, fail jobs, or experience interruptions; do not use
        it for safety-critical decisions.
      </p>
      <h3>5. Misuse and responsibility</h3>
      <p>
        Access may be restricted for abuse or violations of these terms. The
        beta is provided as available, without a promise of uninterrupted
        operation, confidentiality on member devices, or error-free
        results. These terms do not exclude responsibilities or rights that
        applicable law does not allow to be excluded. Opening a notice or
        checking a box does not waive mandatory legal protections.
      </p>

      <h2>Privacy Notice</h2>
      <h3>What is stored and why</h3>
      <p>
        Compute Loop stores your email, username, password hash, session
        records, workspace memberships, applications, task inputs, outputs,
        worker names and download links, task claims, activity timestamps, and mock billing
        transactions to operate accounts, distribute work, deliver results, and
        maintain the service.
      </p>
      <h3>Who can access data</h3>
      <p>
        The platform operator and hosting infrastructure process stored data.
        Workspace members can access readable inputs, application packages, and outputs.
        Access checks do not stop a member from copying a downloaded file. There is no public work feed.
        Compute Loop will not sell your datasets or use
        them for unrelated model training. This commitment does not make
        member misuse technically impossible.
      </p>
      <h3>Retention, cookies, and requests</h3>
      <p>
        A session cookie keeps you signed in. Datasets, results, account records, and
        activity may remain stored during the beta; there is currently no
        automatic dataset-expiry or self-service account-deletion feature.
        The researcher's worker may leave files on the machine that runs it.
      </p>
      <p>
        For privacy, deletion, security, or misuse requests, contact the Compute
        Loop maintainer through the official project's contact channels. Do not
        post passwords, API keys, private datasets, or sensitive incident
        details in public issues. Deletion from platform storage cannot recall
        copies already downloaded by others.
      </p>
    </div>
  );
}

export function TermsDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="policy-dialog"
      aria-labelledby="policy-title"
      onClose={onClose}
    >
      <div className="modal-header">
        <h2 id="policy-title">Terms &amp; Privacy Notice</h2>
        <button
          type="button"
          className="close-button"
          aria-label="Close terms"
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
      </div>
      <PolicyContent />
      <button
        type="button"
        className="create-button"
        onClick={() => dialog.current?.close()}
      >
        Return to signup
      </button>
    </dialog>
  );
}

export default function HelpPage() {
  return (
    <main className="main-content help-page">
      <a href="#" className="back-button">
        ← Back to Compute Loop
      </a>
      <p className="eyebrow">HELP &amp; TRUST</p>
      <h1>Using Compute Loop responsibly</h1>
      <p>A <strong>worker</strong> is the script or program your researcher prepares for a job. Each task shows where to get it and exactly what to run.</p>
      <section className="packaging-guide">
        <h2>For researchers: publish a worker</h2>
        <ol>
          <li>Prepare a runnable script or program with the code, model, or other assets it needs. Docker is optional. Your worker should produce a valid <code>result.json</code> file of at most 4 MiB.</li>
          <li>In <strong>Jobs &amp; tasks → Publish a worker</strong>, upload a ZIP (up to 32 MiB) or link to a versioned release such as GitHub Releases. For private releases, make sure members already have access.</li>
          <li>Write the instructions members will see: supported operating systems, dependencies, the exact command with the task input and arguments, and where the result file is saved.</li>
          <li>Create a batch job and choose the worker. Define each independent task with its own optional arguments and input ZIP (up to 16 MiB each and 48 MiB total).</li>
        </ol>
        <h2>For members: run a task on your computer</h2>
        <p>Open <strong>Jobs &amp; tasks</strong>, expand a task, and claim it. Download the researcher’s worker and the task input, follow the displayed instructions, then return to the task to upload <code>result.json</code>. There is no separate Compute Loop worker to install and no machine key to copy.</p>
        <h3>Demo billing</h3><p>Free workspaces allow 3 members; the Team demo plan allows 10. Simulated top-ups and subscriptions do not involve real payments or compute payouts.</p>
      </section>
      <PolicyContent />
    </main>
  );
}

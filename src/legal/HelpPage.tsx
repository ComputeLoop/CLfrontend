import { useEffect, useRef } from "react";
import { POLICY_VERSION } from "./policies";

export function PolicyContent() {
  return (
    <div className="policy-content">
      <p className="hint">Terms and Privacy Notice · Version {POLICY_VERSION}</p>
      <h2>Before you share data or contribute compute</h2>
      <p>Compute Loop is a beta marketplace for predefined computation using mock credits. Contributors download and process readable dataset chunks on their own machines. This is not confidential computing: the platform cannot technically prevent a contributor from copying data they receive.</p>
      <p><strong>Use public, synthetic, or appropriately anonymized datasets. Do not upload secrets, credentials, personal or sensitive information, or confidential business data.</strong> Removing a name alone may not anonymize a dataset.</p>

      <h2>Terms of Service</h2>
      <h3>1. Your account and permitted use</h3>
      <p>By creating an account, you agree to these terms. Keep your password and worker API keys private. Use the service lawfully and only upload material you have permission to share with the platform and participating contributors. You retain ownership of your uploads; you grant permission to store, distribute, and process them only to deliver the requested service.</p>
      <h3>2. Renter responsibilities</h3>
      <p>Review and minimize data before uploading it. Project names, descriptions, owner usernames, operation details, and progress may be visible to other users through Explore and the worker marketplace. Contributors receive assigned input data. The beta accepts datasets for platform-defined operations, not arbitrary renter-provided executable code.</p>
      <h3>3. Contributor responsibilities and machine safety</h3>
      <p>Use data only for the assigned computation. Do not sell, publish, retain for unrelated use, redistribute, or attempt to identify people in another user's dataset. Do not tamper with results, attack other users, or upload malicious files. Do not copy inputs outside the worker's temporary workspace.</p>
      <p>The standard worker runs predefined operations instead of executing renter scripts. It downloads and parses untrusted data and uses third-party runtimes and libraries; this is not a guarantee against malicious files or software vulnerabilities, and the worker is not a security sandbox. Review the worker source and launcher before running them, keep dependencies updated, and use a dedicated, unprivileged account or isolated machine where practical. GPU/CPU work uses electricity, bandwidth, storage, and hardware resources; you are responsible for those costs.</p>
      <h3>4. Results, rewards, and availability</h3>
      <p>Credits are demonstration credits with no cash value or withdrawal rights. Output hashes check file integrity, not the correctness of an answer. Verify results before relying on them. The beta may produce inaccurate results, fail jobs, or experience interruptions; do not use it for safety-critical decisions.</p>
      <h3>5. Misuse and responsibility</h3>
      <p>Access may be restricted for abuse or violations of these terms. The beta is provided as available, without a promise of uninterrupted operation, confidentiality on contributor devices, or error-free results. These terms do not exclude responsibilities or rights that applicable law does not allow to be excluded. Opening a notice or checking a box does not waive mandatory legal protections.</p>

      <h2>Privacy Notice</h2>
      <h3>What is stored and why</h3>
      <p>Compute Loop stores your email, username, password hash, session records, project metadata, uploaded datasets, chunk manifests, outputs, worker names and hardware details, activity timestamps, and mock-credit transactions to operate accounts, distribute work, deliver results, and maintain the service. Worker API keys are stored as hashes on the backend; the contributor client saves its connection details and API key on your own machine.</p>
      <h3>Who can access data</h3>
      <p>The platform operator and hosting infrastructure process stored data. Assigned contributors can access readable inputs; signed download URLs are access controls, not protection from copying after download. Account and result routes restrict access, but project metadata is shared through the marketplace. Compute Loop will not sell your datasets or use them for unrelated model training. This commitment does not make independent contributor misuse technically impossible.</p>
      <h3>Retention, cookies, and requests</h3>
      <p>A session cookie keeps you signed in. The client also stores worker connection settings locally. Datasets, results, account records, and activity may remain stored during the beta; there is currently no automatic dataset-expiry or self-service account-deletion feature. Worker temporary files are normally cleaned up after processing, but crashes or copies made outside the worker can leave data behind.</p>
      <p>For privacy, deletion, security, or misuse requests, contact the Compute Loop maintainer through the official project's contact channels. The worker repository is linked below to help identify the project. Do not post passwords, API keys, private datasets, or sensitive incident details in public issues. Deletion from platform storage cannot recall copies already downloaded by others.</p>
      <h3>Changes to these notices</h3>
      <p>This version applies to new signups that accept it. Material policy changes should be communicated before they take effect; a previous acceptance does not automatically demonstrate agreement to a new version.</p>
    </div>
  );
}

export function TermsDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return (
    <dialog ref={dialog} className="policy-dialog" aria-labelledby="policy-title" onClose={onClose}>
      <div className="modal-header">
        <h2 id="policy-title">Terms &amp; Privacy Notice</h2>
        <button type="button" className="close-button" aria-label="Close terms" onClick={() => dialog.current?.close()}>×</button>
      </div>
      <PolicyContent />
      <button type="button" className="create-button" onClick={() => dialog.current?.close()}>Return to signup</button>
    </dialog>
  );
}

export default function HelpPage() {
  return (
    <main className="main-content help-page">
      <a href="#" className="back-button">← Back to Compute Loop</a>
      <p className="eyebrow">HELP &amp; TRUST</p>
      <h1>Using Compute Loop responsibly</h1>
      <p>Renters choose a predefined operation, upload data, and fund chunks with mock credits. Contributors choose pending chunks in the local worker. Completed outputs are collected for the renter.</p>
      <p><a href="https://github.com/ComputeLoop/CLworker" target="_blank" rel="noreferrer">View the official worker source</a></p>
      <PolicyContent />
    </main>
  );
}

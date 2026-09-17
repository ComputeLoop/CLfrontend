interface ContributeProps {
  projectId: string;
  projectName: string;
  onBack: () => void;
}

export default function Contribute({
  projectId,
  projectName,
  onBack,
}: ContributeProps) {
  return (
    <main className="main-content">
      <button className="back-button" onClick={onBack}>
        ← Back to projects
      </button>

      <section className="detail-heading">
        <div>
          <p className="eyebrow">CONTRIBUTE</p>
          <h1>{projectName}</h1>
          <p className="subtitle">
            Use your computer to help this project.
          </p>
        </div>
      </section>

      <section className="progress-card">
        <p className="section-label">PROJECT ID</p>

        <code>{projectId}</code>

        <p className="section-label">START THE WORKER</p>

        <code>bun run index.ts {projectId}</code>
      </section>
    </main>
  );
}
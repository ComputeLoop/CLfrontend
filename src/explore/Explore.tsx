import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

interface ExploreProject {
  id: string;
  name: string;
  description: string;
  opType: string;
  opName: string;
  gpu: boolean;
  status: string;
  ownerId: string;
  ownerUsername: string;
  dataset: {
    format: string;
    itemCount: number | null;
    originalName: string;
    sizeBytes: number | null;
  } | null;
  totalJobs: number;
  completedJobs: number;
  pendingJobs: number;
  contributors: number;
  createdAt: string;
}

interface ExploreProps {
  currentUserId: string;
  onContribute: (id: string, name: string) => void;
  onManage: (id: string) => void;
}

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

export default function Explore({
  currentUserId,
  onContribute,
  onManage,
}: ExploreProps) {
  const [projects, setProjects] = useState<ExploreProject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`${API_URL}/explore`, {
          credentials: "include",
        });
        if (response.ok) {
          if (!cancelled) {
            setProjects(await response.json());
            setError(null);
          }
        } else if (!cancelled) {
          setError("Couldn't load the explore feed.");
        }
      } catch {
        // network hiccup — next poll will retry
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    load();
    const timer = window.setInterval(load, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <main className="main-content">
      <section className="page-heading">
        <div>
          <p className="eyebrow">CONTRIBUTE NETWORK</p>
          <h1>Explore</h1>
          <p className="subtitle">
            Projects open for contribution. Pick one, register a worker, and
            your machine processes standardized chunks for a renter.
          </p>
        </div>
      </section>

      {error && <p className="form-error">{error}</p>}

      {loaded && projects.length === 0 && !error && (
        <div className="datacard">
          <p className="instruction">
            No open projects yet. Split a dataset on the{" "}
            <strong>My Projects</strong> tab and it'll show up here for
            other contributors.
          </p>
        </div>
      )}

      <section className="project-grid">
        {projects.map((project) => {
          const progress =
            project.totalJobs > 0
              ? Math.round((project.completedJobs / project.totalJobs) * 100)
              : 0;
          const isMine = project.ownerId === currentUserId;
          const datasetLabel =
            project.dataset?.format === "tabular"
              ? `${project.dataset.itemCount ?? "?"} rows`
              : project.dataset
                ? `${project.dataset.itemCount ?? "?"} files`
                : null;

          return (
            <article className="project-card" key={project.id}>
              <div className="project-card-top">
                <span className={`status ${project.status.toLowerCase()}`}>
                  <span className="status-dot" />
                  {project.status}
                </span>

                <span className="op-badge">
                  {project.gpu ? "⚡ GPU · " : ""}
                  {project.opName}
                </span>
              </div>

              <h2>{project.name}</h2>

              <p className="project-description">
                {project.description || "No description provided."}
              </p>

              <div className="explore-meta">
                <span className="meta-chip">
                  by {project.ownerUsername}
                  {isMine ? " (you)" : ""}
                </span>
                {datasetLabel && (
                  <span className="meta-chip">
                    {datasetLabel}
                    {project.dataset?.sizeBytes
                      ? ` · ${formatBytes(project.dataset.sizeBytes)}`
                      : ""}
                  </span>
                )}
                <span className="meta-chip">
                  {project.pendingJobs} chunk
                  {project.pendingJobs === 1 ? "" : "s"} to do
                </span>
                <span className="meta-chip">
                  {project.contributors} contributor
                  {project.contributors === 1 ? "" : "s"}
                </span>
              </div>

              <div className="progress-section">
                <div className="progress-label">
                  <span>Progress</span>
                  <strong>{progress}%</strong>
                </div>

                <div className="progress-track">
                  <div
                    className="progress-bar"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="job-count">
                  {project.completedJobs} of {project.totalJobs} chunks
                  completed
                </div>
              </div>

              <div className="project-footer">
                <button
                  className="create-button"
                  onClick={() => onContribute(project.id, project.name)}
                  disabled={project.pendingJobs === 0}
                >
                  Contribute →
                </button>

                {isMine && (
                  <button
                    className="view-button"
                    onClick={() => onManage(project.id)}
                  >
                    Manage
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
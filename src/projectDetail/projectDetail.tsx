import { useCallback, useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

interface Operation {
  type: string;
  name: string;
  description: string;
  splitKind: "file-list" | "tabular";
  defaultChunkSize: number;
  gpu: boolean;
  outputFormat: string;
}

interface Dataset {
  id: string;
  originalName: string;
  format: "file-list" | "tabular";
  itemCount: number | null;
  sizeBytes: number;
  status: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  totalJobs: number;
  completedJobs: number;
  status: string;
  opType: string;
  opName: string;
  gpu: boolean;
  splitType: "file-list" | "tabular" | null;
  datasetId: string | null;
  dataset: Dataset | null;
  isSplit: boolean;
  hasResult: boolean;
}

interface Job {
  id: string;
  jobNumber: number;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  workerId: string | null;
  inputStart: number;
  inputEnd: number;
  itemCount: number | null;
  manifest: { kind?: string } | null;
  outputHash: string | null;
  durationMs: number | null;
  attempts: number;
  error: string | null;
}

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProjectDetail({
  projectId,
  onBack,
}: ProjectDetailProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [chunkSize, setChunkSize] = useState<number | null>(null);
  const [splitting, setSplitting] = useState(false);
  const [splitError, setSplitError] = useState<string | null>(null);
  const [requeueing, setRequeueing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [operations, setOperations] = useState<Operation[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/operations`)
      .then((response) => response.json())
      .then((data: Operation[]) => setOperations(data))
      .catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    const detailResponse = await fetch(`${API_URL}/projects/${projectId}`, {
      credentials: "include",
    });
    if (detailResponse.ok) {
      const detail = (await detailResponse.json()) as Project;
      setProject(detail);
    }

    const jobsResponse = await fetch(`${API_URL}/projects/${projectId}/jobs`, {
      credentials: "include",
    });
    if (jobsResponse.ok) {
      const rows = (await jobsResponse.json()) as Job[];
      setJobs(rows);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2500);
    return () => clearInterval(interval);
  }, [refresh]);

  // Operation-derived split info: the field the split form sends and its label
  // must come from the OPERATION, never from project.splitType — a fresh
  // project has split_type = NULL until its first split.
  const op = operations.find((o) => o.type === project?.opType);
  const splitKind = op?.splitKind ?? null;
  const defaultChunkSize = op?.defaultChunkSize ?? 5;
  const effectiveChunkSize = chunkSize ?? defaultChunkSize;
  const chunkSizeLabel =
    splitKind === "tabular"
      ? "rows per chunk"
      : splitKind === "file-list"
        ? "files per chunk"
        : "items per chunk";
  const allPending =
    jobs.length > 0 && jobs.every((job) => job.status === "PENDING");
  const canSplit = project
    ? project.totalJobs === 0 || allPending
    : false;
  const failedCount = jobs.filter((job) => job.status === "FAILED").length;

  async function uploadDataset(event: React.FormEvent) {
    event.preventDefault();
    setUploadError(null);

    const input = document.getElementById(
      "dataset-file",
    ) as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const response = await fetch(`${API_URL}/projects/${projectId}/dataset`, {
        method: "POST",
        credentials: "include",
        body: form,
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message ?? "Upload failed");
      }

      await refresh();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function splitDataset(event: React.FormEvent) {
    event.preventDefault();
    setSplitError(null);

    setSplitting(true);
    try {
      const response = await fetch(`${API_URL}/projects/${projectId}/split`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          splitKind === "tabular"
            ? { rowsPerChunk: effectiveChunkSize }
            : { itemsPerChunk: effectiveChunkSize },
        ),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message ?? "Split failed");
      }

      await refresh();
    } catch (error) {
      setSplitError(error instanceof Error ? error.message : "Split failed");
    } finally {
      setSplitting(false);
    }
  }

  async function requeueFailed() {
    setSplitError(null);
    setRequeueing(true);
    try {
      const response = await fetch(`${API_URL}/projects/${projectId}/requeue`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message ?? "Requeue failed");
      }
      await refresh();
    } catch (error) {
      setSplitError(error instanceof Error ? error.message : "Requeue failed");
    } finally {
      setRequeueing(false);
    }
  }

  async function downloadResult() {
    const response = await fetch(`${API_URL}/projects/${projectId}/result`, {
      credentials: "include",
    });
    if (response.ok) {
      const body = (await response.json()) as { url: string };
      setResultUrl(body.url);
      window.open(body.url, "_blank");
    }
  }

  async function retryMerge() {
    try {
      await fetch(`${API_URL}/projects/${projectId}/merge`, {
        method: "POST",
        credentials: "include",
      });
      await refresh();
    } catch (error) {
      console.error(error);
    }
  }

  if (!project) {
    return (
      <main className="main-content">
        <button className="back-button" onClick={onBack}>
          ← Back to projects
        </button>

        <div className="empty-state">
          <h2>Project not found</h2>
        </div>
      </main>
    );
  }

  const progress =
    project.totalJobs > 0
      ? Math.round((project.completedJobs / project.totalJobs) * 100)
      : 0;

  return (
    <main className="main-content">
      <button className="back-button" onClick={onBack}>
        ← Back to projects
      </button>

      <section className="detail-heading">
        <div>
          <div className="detail-status">
            <span className={`status ${project.status.toLowerCase()}`}>
              <span className="status-dot" />
              {project.status}
            </span>
            <span className="op-badge">
              {project.gpu ? "⚡ GPU · " : ""}
              {project.opName ?? project.opType}
            </span>
          </div>

          <h1>{project.name}</h1>

          <p className="subtitle">{project.description}</p>
        </div>
      </section>

      <section className="progress-card">
        <div className="progress-card-header">
          <div>
            <p className="section-label">COMPUTATION PROGRESS</p>
            <h2>
              {project.completedJobs}{" "}
              <span>/ {project.totalJobs} chunks completed</span>
            </h2>
          </div>

          <strong className="large-progress">{progress}%</strong>
        </div>

        <div className="large-progress-track">
          <div
            className="large-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      {/* Dataset upload / split */}
      <section className="dataset-section">
        <div className="section-heading">
          <div>
            <p className="section-label">DATASET</p>
            <h2>Prepare chunks</h2>
          </div>

          {project.dataset && (
            <span className="job-total">
              {project.dataset.itemCount?.toLocaleString() ?? "—"}{" "}
              {project.dataset.format === "file-list" ? "files" : "rows"} ·{" "}
              {formatBytes(project.dataset.sizeBytes)}
            </span>
          )}
        </div>

        {!project.dataset ? (
          <div className="datacard">
            <p className="instruction">
              Upload the raw dataset for this project. It gets split into
              chunks that contributors process independently.
            </p>
            <form onSubmit={uploadDataset}>
              <div className="upload-row">
                <input
                  id="dataset-file"
                  type="file"
                  accept=".zip,.csv,.tsv,.jsonl,.ndjson,.txt"
                />
                <button
                  className="create-button"
                  type="submit"
                  disabled={uploading}
                >
                  {uploading ? "Uploading..." : "Upload dataset"}
                </button>
              </div>
            </form>
            <p className="hint">
              Supported: .zip (a folder of image/data files) or a single
              .csv / .tsv / .jsonl table. The operation you chose determines
              how it will be split.
            </p>
            {uploadError && <p className="form-error">{uploadError}</p>}
          </div>
        ) : canSplit ? (
          <div className="datacard">
            <p className="instruction">
              <strong>{project.dataset.originalName}</strong> is uploaded (
              {project.dataset.format === "file-list"
                ? `${project.dataset.itemCount ?? "?"} files`
                : `${project.dataset.itemCount ?? "?"} rows`}
              ). Choose the chunk size and split it into the contributor work
              queue.
              {project.totalJobs > 0 &&
                " Nothing has been claimed yet, so you can re-split with a different size."}
            </p>
            <form onSubmit={splitDataset}>
              <label className="inline-field">
                {chunkSizeLabel}
                <input
                  type="number"
                  min="1"
                  value={chunkSize ?? ""}
                  placeholder={String(defaultChunkSize)}
                  onChange={(event) =>
                    setChunkSize(
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                    )
                  }
                />
              </label>
              <button
                className="create-button"
                type="submit"
                disabled={splitting}
              >
                {splitting
                  ? "Splitting..."
                  : project.totalJobs > 0
                    ? "Re-split chunks"
                    : "Split into chunks"}
              </button>
            </form>
            {splitError && <p className="form-error">{splitError}</p>}
            <p className="hint">
              Default: {defaultChunkSize} {chunkSizeLabel}. A smaller size
              produces more chunks that run in parallel.
            </p>
          </div>
        ) : (
          <div className="datacard">
            <p className="instruction">
              Split into <strong>{project.totalJobs} chunks</strong> of{" "}
              {splitKind === "tabular"
                ? "rows"
                : "files"}{" "}
              — contributors are processing them. The merged result appears
              below once every chunk is done.
            </p>
          </div>
        )}
      </section>

      {/* Result */}
      {project.hasResult && (
        <section className="dataset-section">
          <div className="section-heading">
            <div>
              <p className="section-label">RESULT</p>
              <h2>Merged output is ready</h2>
            </div>
          </div>

          <div className="datacard result-box">
            <p className="instruction">
              All chunks completed and the output has been merged. Download the
              combined result below.
            </p>
            <div className="result-actions">
              <button className="create-button" onClick={downloadResult}>
                ⬇ Download results
              </button>
              <button className="view-button" onClick={retryMerge}>
                Re-merge
              </button>
            </div>
            {resultUrl && (
              <p className="hint">
                If the download didn't start, open this link:{" "}
                <a href={resultUrl} target="_blank" rel="noreferrer">
                  {resultUrl.slice(0, 90)}…
                </a>
              </p>
            )}
          </div>
        </section>
      )}

      <section className="jobs-section">
        <div className="section-heading">
          <div>
            <p className="section-label">WORK QUEUE</p>
            <h2>Chunks</h2>
          </div>

          <div className="job-actions">
            <span className="job-total">{jobs.length} total</span>
            {failedCount > 0 && (
              <button
                className="view-button"
                onClick={requeueFailed}
                disabled={requeueing}
              >
                {requeueing
                  ? "Requeueing..."
                  : `↻ Requeue ${failedCount} failed chunk${
                      failedCount === 1 ? "" : "s"
                    }`}
              </button>
            )}
          </div>
        </div>

        <div className="jobs-table">
          <div className="job-row job-header">
            <span>CHUNK</span>
            <span>RANGE</span>
            <span>STATUS</span>
            <span>WORKER</span>
          </div>

          {jobs.map((job) => (
            <div className="job-row" key={job.id}>
              <strong>#{job.jobNumber}</strong>

              <span className="job-range">
                {job.manifest?.kind === "file-list"
                  ? `${job.itemCount ?? job.inputEnd - job.inputStart + 1} files (${
                      job.inputStart
                    }–${job.inputEnd})`
                  : `rows ${job.inputStart.toLocaleString()} – ${job.inputEnd.toLocaleString()}`}
              </span>

              <span
                className={`job-status ${job.status.toLowerCase()}`}
                title={job.error ?? undefined}
              >
                <span className="status-dot" />
                {job.status}
                {job.status === "FAILED" && job.error
                  ? ` · ${job.error.slice(0, 40)}`
                  : ""}
              </span>

              <span className="worker-name">
                {job.status === "COMPLETED" && job.durationMs != null
                  ? `${(job.durationMs / 1000).toFixed(1)}s`
                  : job.workerId
                    ? job.workerId.slice(0, 8)
                    : "—"}
              </span>
            </div>
          ))}

          {jobs.length === 0 && (
            <div className="job-row">
              <strong>—</strong>
              <span className="job-range">No chunks yet</span>
              <span className="job-status pending">
                <span className="status-dot" />PENDING
              </span>
              <span className="worker-name">—</span>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
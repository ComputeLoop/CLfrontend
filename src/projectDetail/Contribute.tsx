import { useCallback, useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

interface WorkerInfo {
  id: string;
  name: string;
  gpuName: string | null;
  vramMb: number | null;
  status: string;
  lastHeartbeat: string | null;
  online: boolean;
  completedChunks: number;
  createdAt: string;
}

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
  const [workerName, setWorkerName] = useState("");
  const [gpuName, setGpuName] = useState("");
  const [vramMb, setVramMb] = useState("");
  const [registering, setRegistering] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workers, setWorkers] = useState<WorkerInfo[]>([]);

  const refreshWorkers = useCallback(async () => {
    const response = await fetch(`${API_URL}/workers`, {
      credentials: "include",
    });
    if (response.ok) {
      setWorkers(await response.json());
    }
  }, []);

  useEffect(() => {
    refreshWorkers();
    const interval = setInterval(refreshWorkers, 5000);
    return () => clearInterval(interval);
  }, [refreshWorkers]);

  async function registerWorker(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    setRegistering(true);
    try {
      const response = await fetch(`${API_URL}/workers/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workerName.trim() || "my-machine",
          gpuName: gpuName.trim() || undefined,
          vramMb: vramMb ? Number(vramMb) : undefined,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message ?? "Registration failed");
      }

      const result = (await response.json()) as { apiKey: string };
      setApiKey(result.apiKey);
      setWorkerName("");
      setGpuName("");
      setVramMb("");
      await refreshWorkers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setRegistering(false);
    }
  }

  function copyText(text: string) {
    if (!text) return;
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const [osTab, setOsTab] = useState<"windows" | "unix">(() =>
    /Windows/i.test(navigator.userAgent) ? "windows" : "unix",
  );

  const bashCommand = `API_KEY=${apiKey ?? "<your key>"} PROJECT=${projectId} COMPUTELOOP_API=${API_URL} bash -c "$(curl -fsSL https://raw.githubusercontent.com/ComputeLoop/CLworker/master/start.sh)"`;

  const psCommand = `$env:API_KEY="${apiKey ?? "<your key>"}"; $env:PROJECT="${projectId}"; $env:COMPUTELOOP_API="${API_URL}"; iex ((curl.exe -fsSL https://raw.githubusercontent.com/ComputeLoop/CLworker/master/start.ps1) -join ([char]10))`;

  const activeCommand = osTab === "windows" ? psCommand : bashCommand;

  const manualCommand = `cd worker
bun install --ignore-scripts   # only needed for the GPU op
WORKER_API_KEY=${apiKey ?? "<your key>"} COMPUTELOOP_API=${API_URL} bun run index.ts ${projectId}`;

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
            Claim chunks of this dataset and process them on your machine. Your
            GPU works on real data — earn future pocket money per chunk.
          </p>
        </div>
      </section>

      <section className="progress-card">
        <p className="section-label">PROJECT ORIGIN</p>
        <p className="instruction">
          Copy-paste <strong>one command</strong> into your terminal — it
          installs the runtime if needed, downloads the worker, and starts
          claiming chunks on this project. Pick your operating system:
        </p>

        <div className="os-switch">
          <button
            className={osTab === "windows" ? "active" : ""}
            onClick={() => setOsTab("windows")}
          >
            Windows (PowerShell)
          </button>
          <button
            className={osTab === "unix" ? "active" : ""}
            onClick={() => setOsTab("unix")}
          >
            macOS / Linux (Terminal)
          </button>
        </div>

        <div className="key-row">
          <pre className="code-block key-block command-block">
            {activeCommand}
          </pre>
          <button
            className="copy-button"
            onClick={() => copyText(activeCommand)}
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>

        <details className="advanced-setup">
          <summary>Already have the worker cloned? Manual command</summary>
          <pre className="code-block command-block">{manualCommand}</pre>
        </details>

        {!apiKey && (
          <p className="hint">
            Registered machines appear below. The worker only runs the
            platform's standardized operation — your machine never executes
            renter code.
          </p>
        )}
      </section>

      {apiKey && (
        <section className="dataset-section">
          <div className="section-heading">
            <div>
              <p className="section-label">NEW WORKER · API KEY</p>
              <h2>Copy your key now</h2>
            </div>
          </div>

          <div className="datacard result-box">
            <p className="instruction warn">
              This key is shown <strong>only once</strong>. Store it somewhere
              safe — anyone with it can process chunks as this worker.
            </p>
            <div className="key-row">
              <pre className="code-block key-block">{apiKey}</pre>
              <button className="copy-button" onClick={() => copyText(apiKey)}>
                {copied ? "Copied ✓" : "Copy"}
              </button>
            </div>
          </div>
        </section>
      )}

      {!apiKey && (
        <section className="dataset-section">
          <div className="section-heading">
            <div>
              <p className="section-label">GET STARTED</p>
              <h2>Register a worker machine</h2>
            </div>
          </div>

          <div className="datacard">
            <form onSubmit={registerWorker}>
              <div className="reg-grid">
                <label>
                  Machine name
                  <input
                    type="text"
                    placeholder="e.g. lab-pc-03"
                    value={workerName}
                    onChange={(event) => setWorkerName(event.target.value)}
                  />
                </label>

                <label>
                  GPU (optional)
                  <input
                    type="text"
                    placeholder="e.g. RTX 4070"
                    value={gpuName}
                    onChange={(event) => setGpuName(event.target.value)}
                  />
                </label>

                <label>
                  VRAM MB (optional)
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 8192"
                    value={vramMb}
                    onChange={(event) => setVramMb(event.target.value)}
                  />
                </label>
              </div>

              <button
                className="create-button"
                type="submit"
                disabled={registering}
              >
                {registering ? "Registering..." : "Register worker"}
              </button>
            </form>
            {error && <p className="form-error">{error}</p>}
          </div>
        </section>
      )}

      <section className="jobs-section">
        <div className="section-heading">
          <div>
            <p className="section-label">YOUR WORKERS</p>
            <h2>Machines</h2>
          </div>

          <span className="job-total">{workers.length} registered</span>
        </div>

        <div className="jobs-table">
          <div className="worker-row job-header">
            <span>NAME</span>
            <span>GPU</span>
            <span>STATUS</span>
            <span>CHUNKS DONE</span>
          </div>

          {workers.map((worker) => (
            <div className="worker-row" key={worker.id}>
              <strong>{worker.name}</strong>

              <span className="job-range">
                {worker.gpuName ?? (worker.vramMb ? `${worker.vramMb} MB` : "CPU")}
              </span>

              <span
                className={`job-status ${
                  worker.online
                    ? "completed"
                    : worker.status.toLowerCase()
                }`}
              >
                <span className="status-dot" />
                {worker.online ? "ONLINE" : worker.status}
              </span>

              <span className="worker-name">{worker.completedChunks}</span>
            </div>
          ))}

          {workers.length === 0 && (
            <div className="worker-row">
              <strong>—</strong>
              <span className="job-range">No workers registered yet</span>
              <span className="job-status pending">
                <span className="status-dot" />OFFLINE
              </span>
              <span className="worker-name">—</span>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
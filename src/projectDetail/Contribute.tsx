import { useCallback, useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

interface WorkerInfo {
  id: string;
  name: string;
  gpuName: string | null;
  vramMb: number | null;
  gpuReady: boolean;
  gpuBackend: "cuda" | "directml" | null;
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

  const bashCommand = `bash -c "$(curl -fsSL https://raw.githubusercontent.com/ComputeLoop/CLworker/master/start.sh)"`;
  const psCommand = `iex ((curl.exe -fsSL https://raw.githubusercontent.com/ComputeLoop/CLworker/master/start.ps1) -join ([char]10))`;

  const activeCommand = osTab === "windows" ? psCommand : bashCommand;

  const headlessBashCommand = `API_KEY=${apiKey ?? "<your key>"} PROJECT=${projectId} COMPUTELOOP_API=${API_URL} bash -c "$(curl -fsSL https://raw.githubusercontent.com/ComputeLoop/CLworker/master/start.sh)"`;
  const headlessPsCommand = `$env:API_KEY="${apiKey ?? "<your key>"}"; $env:PROJECT="${projectId}"; $env:COMPUTELOOP_API="${API_URL}"; iex ((curl.exe -fsSL https://raw.githubusercontent.com/ComputeLoop/CLworker/master/start.ps1) -join ([char]10))`;
  const headlessCommand =
    osTab === "windows" ? headlessPsCommand : headlessBashCommand;

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
            Register this machine once, then choose the projects and pending
            chunks you want it to process in the local contributor client.
            Successful chunks earn mock credits shown in your wallet.
          </p>
        </div>
      </section>

      {!apiKey ? (
        <section className="dataset-section">
          <div className="section-heading">
            <div>
              <p className="section-label">STEP 1 · GET YOUR KEY</p>
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
            <p className="hint">
              Registered machines appear below. The worker only runs the
              platform's standardized operation — your machine never executes
              renter code.
            </p>
          </div>
        </section>
      ) : (
        <section className="dataset-section">
          <div className="section-heading">
            <div>
              <p className="section-label">STEP 1 · YOUR KEY IS READY</p>
              <h2>Copy your key now</h2>
            </div>
          </div>

          <div className="datacard result-box">
            <p className="instruction warn">
              This key is shown <strong>only once</strong>. Paste it into the
              contributor app in step 2 — it is stored on your machine only, and
              you will not need to type it again.
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

      <section className="progress-card">
        <p className="section-label">STEP 2 · RUN THE CONTRIBUTOR APP</p>
        <p className="instruction">
          Copy-paste <strong>one command</strong> — nothing to edit. It installs
          the runtime if needed and opens the app in your browser: paste your
          key once, pick a project from the dropdown, press Start. The key is
          remembered on this machine for next time. Pick your operating system:
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
          <summary>Headless mode — run straight in the terminal</summary>
          <p className="hint">
            The key and this project get baked into the command; no browser,
            terminal stays open:
          </p>
          <pre className="code-block command-block">{headlessCommand}</pre>
        </details>

        <details className="advanced-setup">
          <summary>Already have the worker cloned? Manual command</summary>
          <pre className="code-block command-block">{manualCommand}</pre>
        </details>
      </section>

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
            <span>NVIDIA GPU / Runtime</span>
            <span>STATUS</span>
            <span>CHUNKS DONE</span>
          </div>

          {workers.map((worker) => (
            <div className="worker-row" key={worker.id}>
              <strong>{worker.name}</strong>

              <span className="job-range">
                {worker.gpuName
                  ? `${worker.gpuName} · ${worker.gpuReady ? `${worker.gpuBackend === "directml" ? "DirectML" : "CUDA"} ready` : "GPU not verified"}`
                  : worker.vramMb
                    ? `${worker.vramMb} MB · GPU not verified`
                    : "CPU"}
              </span>

              <span
                className={`job-status ${
                  worker.online ? "completed" : worker.status.toLowerCase()
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
                <span className="status-dot" />
                OFFLINE
              </span>
              <span className="worker-name">—</span>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

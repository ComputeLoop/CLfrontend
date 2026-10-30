import { useEffect, useState } from "react";
import "./App.css";
import ProjectDetail from "./projectDetail/projectDetail";
import { useAuth } from "./context/useAuth";
import Contribute from "./projectDetail/Contribute";
import Explore from "./explore/Explore";
import AuthScreen from "./auth/AuthScreen";
import HelpPage from "./legal/HelpPage";

const API_URL = import.meta.env.VITE_API_URL;

type View = "mine" | "explore";

interface Operation {
  type: string;
  name: string;
  description: string;
  splitKind: "file-list" | "tabular";
  defaultChunkSize: number;
  gpu: boolean;
  outputFormat: string;
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
  hasDataset: boolean;
  itemCount: number | null;
  datasetFormat: string | null;
  isSplit: boolean;
  hasResult: boolean;
  rewardPerChunk: number;
  escrowCredits: number;
}

interface WalletTransaction {
  id: string;
  projectId: string | null;
  jobId: string | null;
  kind: string;
  amount: number;
  note: string;
  createdAt: string;
}

function Navbar({
  view,
  onNavigate,
  onLogout,
  credits,
  onOpenWallet,
}: {
  view: View;
  onNavigate: (view: View) => void;
  onLogout: () => void;
  credits: number;
  onOpenWallet: () => void;
}) {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="brand">
          <div className="brand-mark">C</div>
          <span>Compute Loop</span>
        </div>

        <nav className="nav-links">
          <a href="#help">Help / Terms &amp; Privacy</a>
          <a
            className={view === "mine" ? "active" : ""}
            href="#"
            onClick={(event) => {
              event.preventDefault();
              onNavigate("mine");
            }}
          >
            My Projects
          </a>
          <a
            className={view === "explore" ? "active" : ""}
            href="#"
            onClick={(event) => {
              event.preventDefault();
              onNavigate("explore");
            }}
          >
            Explore
          </a>
        </nav>

        <div className="nav-account">
          <button className="wallet-button" onClick={onOpenWallet}>
            {credits.toLocaleString()} mock credits
          </button>
          <button className="sign-in-button" onClick={onLogout}>Logout</button>
        </div>
      </div>
    </header>
  );
}

function WalletModal({
  credits,
  transactions,
  onClose,
}: {
  credits: number;
  transactions: WalletTransaction[];
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal wallet-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div><p className="eyebrow">MOCK WALLET</p><h2>{credits.toLocaleString()} credits</h2></div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <p className="hint">Demo credits only; no real payments are processed.</p>
        <div className="wallet-transactions">
          {transactions.length ? transactions.map((transaction) => (
            <div className="wallet-transaction" key={transaction.id}>
              <div><strong>{transaction.note}</strong><small>{new Date(transaction.createdAt).toLocaleString()}</small></div>
              <b className={transaction.amount < 0 ? "credit-negative" : "credit-positive"}>
                {transaction.amount > 0 ? "+" : ""}{transaction.amount}
              </b>
            </div>
          )) : <p className="hint">No credit activity yet.</p>}
        </div>
      </section>
    </div>
  );
}

function App() {
  const [helpVisible, setHelpVisible] = useState(window.location.hash === "#help");
  useEffect(() => {
    const update = () => setHelpVisible(window.location.hash === "#help");
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const [projects, setProjects] = useState<Project[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [opType, setOpType] = useState("");
  const [rewardPerChunk, setRewardPerChunk] = useState(10);
  const [createError, setCreateError] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [showWallet, setShowWallet] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [contributeProjectId, setContributeProjectId] = useState<string | null>(
    null,
  );
  const [contributeName, setContributeName] = useState<string>("");
  const [view, setView] = useState<View>("mine");
  const { user, loading, logout } = useAuth();

  async function loadWallet() {
    try {
      const response = await fetch(`${API_URL}/wallet`, { credentials: "include" });
      if (!response.ok) return;
      const wallet = (await response.json()) as {
        credits: number;
        transactions: WalletTransaction[];
      };
      setCredits(wallet.credits);
      setWalletTransactions(wallet.transactions);
    } catch (error) {
      console.error("Failed to load wallet:", error);
    }
  }

  useEffect(() => {
    if (!user) return;
    void loadWallet();
    const timer = window.setInterval(loadWallet, 5000);
    return () => window.clearInterval(timer);
  }, [user]);

  async function loadProjects() {
    try {
      const response = await fetch(`${API_URL}/projects`, {
        credentials: "include",
      });
      if (response.ok) setProjects((await response.json()) as Project[]);
    } catch (error) {
      console.error("Failed to load projects:", error);
    }
  }

  async function loadOperations() {
    try {
      const response = await fetch(`${API_URL}/operations`);
      if (!response.ok) {
        throw new Error(`Operations request failed (${response.status})`);
      }
      const data: unknown = await response.json();
      if (!Array.isArray(data)) {
        throw new Error("Operations API returned an invalid response");
      }
      const available = data as Operation[];
      setOperations(available);
      setOpType((current) =>
        available.some((operation) => operation.type === current)
          ? current
          : (available[0]?.type ?? ""),
      );
    } catch (error) {
      console.error("Failed to load operations:", error);
      setOperations([]);
      setOpType("");
    }
  }

  useEffect(() => {
    loadProjects();
    void loadOperations();
  }, []);

  function openCreateProject() {
    setShowCreate(true);
    void loadOperations();
  }

  const homeVisible =
    !selectedProjectId && !contributeProjectId && view === "mine";
  useEffect(() => {
    if (!homeVisible) return;
    loadProjects();
    const timer = window.setInterval(loadProjects, 5000);
    return () => window.clearInterval(timer);
  }, [homeVisible]);

  const selectedOp = operations.find((op) => op.type === opType);

  function navigate(next: View) {
    setView(next);
    setSelectedProjectId(null);
    setContributeProjectId(null);
  }

  async function createProject(event: React.FormEvent) {
    event.preventDefault();

    setCreating(true);

    try {
      const response = await fetch(`${API_URL}/projects`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          opType,
          rewardPerChunk,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? "Failed to create project");
      }

      await loadProjects();

      setName("");
      setDescription("");
      setRewardPerChunk(10);
      setCreateError(null);
      setShowCreate(false);
    } catch (error) {
      console.error(error);
      setCreateError(error instanceof Error ? error.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  if (helpVisible) return <div className="app"><HelpPage /></div>;

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (contributeProjectId) {
    const mine = projects.find((item) => item.id === contributeProjectId);
    const project = mine ?? {
      id: contributeProjectId,
      name: contributeName || "Project",
    };

    return (
      <div className="app">
        <Navbar view={view} onNavigate={navigate} onLogout={logout} credits={credits} onOpenWallet={() => setShowWallet(true)} />

        <Contribute
          projectId={project.id}
          projectName={project.name}
          onBack={() => setContributeProjectId(null)}
        />
        {showWallet && <WalletModal credits={credits} transactions={walletTransactions} onClose={() => setShowWallet(false)} />}
      </div>
    );
  }

  if (selectedProjectId) {
    return (
      <div className="app">
        <Navbar view={view} onNavigate={navigate} onLogout={logout} credits={credits} onOpenWallet={() => setShowWallet(true)} />

        <ProjectDetail
          projectId={selectedProjectId}
          onBack={() => setSelectedProjectId(null)}
        />
        {showWallet && <WalletModal credits={credits} transactions={walletTransactions} onClose={() => setShowWallet(false)} />}
      </div>
    );
  }

  return (
    <div className="app">
      <Navbar view={view} onNavigate={navigate} onLogout={logout} credits={credits} onOpenWallet={() => setShowWallet(true)} />

      {view === "explore" ? (
        <Explore
          currentUserId={user.id}
          onContribute={(id, name) => {
            setContributeProjectId(id);
            setContributeName(name);
          }}
          onManage={(id) => setSelectedProjectId(id)}
        />
      ) : (
        <main className="main-content">
          <section className="page-heading">
            <div>
              <p className="eyebrow">RENTER</p>
              <h1>My Projects</h1>
              <p className="subtitle">
                Upload a dataset, split it into chunks, and let contributors
                process it on their machines.
              </p>
            </div>

            <button
              className="create-button"
              onClick={openCreateProject}
            >
              <span>+</span>
              New project
            </button>
          </section>

          <section className="project-grid">
            {projects.map((project) => {
              const progress =
                project.totalJobs > 0
                  ? Math.round(
                      (project.completedJobs / project.totalJobs) * 100,
                    )
                  : 0;

              return (
                <article className="project-card" key={project.id}>
                  <div className="project-card-top">
                    <span className={`status ${project.status.toLowerCase()}`}>
                      <span className="status-dot" />
                      {project.status}
                    </span>

                    <span className="op-badge">
                      {project.gpu ? "⚡ GPU · " : ""}
                      {project.opName ?? project.opType}
                    </span>
                  </div>

                  <h2>{project.name}</h2>

                  <p className="project-description">{project.description}</p>

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
                      {project.totalJobs === 0
                        ? "No chunks yet — upload a dataset and split"
                        : `${project.completedJobs} of ${project.totalJobs} chunks completed`}
                    </div>
                    <div className="job-count">
                      Reward: {project.rewardPerChunk} credits per chunk · {project.escrowCredits} in escrow
                    </div>
                  </div>

                  <div className="project-footer">
                    <span className="contributors">
                      <span className="contributor-icon">◉</span>
                      {project.hasDataset
                        ? "Dataset uploaded"
                        : "Awaiting dataset"}
                    </span>

                    <div className="footer-actions">
                      <button
                        className="view-button"
                        onClick={() => setContributeProjectId(project.id)}
                      >
                        Contribute →
                      </button>

                      <button
                        className="create-button"
                        onClick={() => setSelectedProjectId(project.id)}
                      >
                        View project →
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            {projects.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">∅</div>
                <h2>No projects yet</h2>
                <p>Create the first project and start sharing compute power.</p>
                <button
                  className="create-button"
                  onClick={openCreateProject}
                >
                  <span>+</span>
                  Create project
                </button>
              </div>
            )}
          </section>
        </main>
      )}

      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">NEW PROJECT</p>
                <h2>Create a project</h2>
              </div>

              <button
                className="close-button"
                onClick={() => setShowCreate(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={createProject}>
              <label>
                Project name
                <input
                  type="text"
                  placeholder="e.g. Campus photo archive"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>

              <label>
                Description
                <textarea
                  placeholder="What dataset are you processing, and why?"
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>

              <label>
                Operation (how contributors process each chunk)
                <select
                  value={opType}
                  onChange={(event) => setOpType(event.target.value)}
                >
                  {operations.map((op) => (
                    <option key={op.type} value={op.type}>
                      {op.gpu ? "⚡ " : ""}
                      {op.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Reward per successful chunk (mock credits)
                <input
                  type="number"
                  min="1"
                  max="1000000"
                  value={rewardPerChunk}
                  onChange={(event) => setRewardPerChunk(Number(event.target.value))}
                />
              </label>
              <p className="hint">
                Your reward is escrowed when you split the dataset and paid to contributors as chunks complete.
              </p>
              {createError && <p className="form-error">{createError}</p>}

              {selectedOp && (
                <div className="op-detail-box">
                  <p>{selectedOp.description}</p>
                  <p className="op-output">
                    Output: {selectedOp.outputFormat}
                    {selectedOp.gpu && " · requires a contributor GPU"}
                  </p>
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="create-button"
                  disabled={creating || !opType}
                >
                  {creating ? "Creating..." : "Create project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showWallet && <WalletModal credits={credits} transactions={walletTransactions} onClose={() => setShowWallet(false)} />}
    </div>
  );
}

export default App;

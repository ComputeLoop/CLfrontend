import { useEffect, useState } from "react";
import "./App.css";
import ProjectDetail from "./projectDetail/projectDetail";
import { useAuth } from "./context/useAuth";
import Contribute from "./projectDetail/Contribute";
import Explore from "./explore/Explore";
import AuthScreen from "./auth/AuthScreen";

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
}

function Navbar({
  view,
  onNavigate,
  onLogout,
}: {
  view: View;
  onNavigate: (view: View) => void;
  onLogout: () => void;
}) {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="brand">
          <div className="brand-mark">C</div>
          <span>Compute Loop</span>
        </div>

        <nav className="nav-links">
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

        <button className="sign-in-button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [opType, setOpType] = useState("");
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

  useEffect(() => {
    loadProjects();

    fetch(`${API_URL}/operations`)
      .then((response) => response.json())
      .then((data) => {
        setOperations(data);
        if (data.length > 0) setOpType(data[0].type);
      })
      .catch((error) => console.error("Failed to load operations:", error));
  }, []);

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
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create project");
      }

      await loadProjects();

      setName("");
      setDescription("");
      setShowCreate(false);
    } catch (error) {
      console.error(error);
    } finally {
      setCreating(false);
    }
  }

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
        <Navbar view={view} onNavigate={navigate} onLogout={logout} />

        <Contribute
          projectId={project.id}
          projectName={project.name}
          onBack={() => setContributeProjectId(null)}
        />
      </div>
    );
  }

  if (selectedProjectId) {
    return (
      <div className="app">
        <Navbar view={view} onNavigate={navigate} onLogout={logout} />

        <ProjectDetail
          projectId={selectedProjectId}
          onBack={() => setSelectedProjectId(null)}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <Navbar view={view} onNavigate={navigate} onLogout={logout} />

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
              onClick={() => setShowCreate(true)}
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
                  onClick={() => setShowCreate(true)}
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
    </div>
  );
}

export default App;
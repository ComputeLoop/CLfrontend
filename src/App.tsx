import { useEffect, useState } from "react";
import "./App.css";
import ProjectDetail from "./projectDetail/projectDetail";
import { useAuth } from "./context/useAuth";
import Contribute from "./projectDetail/Contribute";
const API_URL = import.meta.env.VITE_API_URL;
import AuthScreen from "./auth/AuthScreen";
interface Project {
  id: string;
  name: string;
  description: string;
  totalJobs: number;
  completedJobs: number;
  status: "OPEN" | "RUNNING" | "COMPLETED";
}

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [totalJobs, setTotalJobs] = useState(10);
  const [creating, setCreating] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [contributeProjectId, setContributeProjectId] = useState<string | null>(
    null,
  );
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    fetch(`${API_URL}/projects`)
      .then((response) => response.json())
      .then((data) => setProjects(data))
      .catch((error) => console.error("Failed to load projects:", error));
  }, []);
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
          totalJobs,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create project");
      }

      const project = await response.json();

      setProjects((current) => [project, ...current]);

      setName("");
      setDescription("");
      setTotalJobs(10);
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
    const project = projects.find((item) => item.id === contributeProjectId);

    if (project) {
      return (
        <div className="app">
          <header className="navbar">
            <div className="brand">
              <div className="brand-mark">C</div>
              <span>Compute Loop</span>
            </div>

            <nav className="nav-links">
              <a className="active" href="#">
                Projects
              </a>
              <a href="#">Contributors</a>
            </nav>

            <button className="sign-in-button" onClick={logout}>
              Logout
            </button>
          </header>

          <Contribute
            projectId={project.id}
            projectName={project.name}
            onBack={() => setContributeProjectId(null)}
          />
        </div>
      );
    }
  }
  if (selectedProjectId) {
    return (
      <div className="app">
        <header className="navbar">
          <div className="brand">
            <div className="brand-mark">C</div>
            <span>Compute Loop</span>
          </div>

          <nav className="nav-links">
            <a className="active" href="#">
              Projects
            </a>
            <a href="#">Contributors</a>
          </nav>

          <button className="sign-in-button" onClick={logout}>
            Logout
          </button>
        </header>

        <ProjectDetail
          projectId={selectedProjectId}
          onBack={() => setSelectedProjectId(null)}
        />
      </div>
    );
  }
  return (
    <div className="app">
      <header className="navbar">
        <div className="brand">
          <div className="brand-mark">C</div>
          <span>Compute Loop</span>
        </div>

        <nav className="nav-links">
          <a className="active" href="#">
            Projects
          </a>
          <a href="#">Contributors</a>
        </nav>

        <button className="sign-in-button" onClick={logout}>
          Logout
        </button>
      </header>

      <main className="main-content">
        <section className="page-heading">
          <div>
            <p className="eyebrow">COMPUTE NETWORK</p>
            <h1>Projects</h1>
            <p className="subtitle">
              Put idle computing power to work on meaningful projects.
            </p>
          </div>

          <button className="create-button" onClick={() => setShowCreate(true)}>
            <span>+</span>
            New project
          </button>
        </section>

        <section className="project-grid">
          {projects.map((project) => {
            const progress =
              project.totalJobs > 0
                ? Math.round((project.completedJobs / project.totalJobs) * 100)
                : 0;

            return (
              <article className="project-card" key={project.id}>
                <div className="project-card-top">
                  <span className={`status ${project.status.toLowerCase()}`}>
                    <span className="status-dot" />
                    {project.status}
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
                    {project.completedJobs} of {project.totalJobs} jobs
                    completed
                  </div>
                </div>

                <div className="project-footer">
                  <button
                    className="view-button"
                    onClick={() => setContributeProjectId(project.id)}
                  >
                    Contribute →
                  </button>

                  <span className="contributors">
                    <span className="contributor-icon">◉</span>
                    Open for contributors
                  </span>

                  <button
                    className="view-button"
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    View project →
                  </button>
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
                  placeholder="e.g. Prime Search"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>

              <label>
                Description
                <textarea
                  placeholder="What should contributors help compute?"
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>

              <label>
                Number of jobs
                <input
                  type="number"
                  min="1"
                  defaultValue="10"
                  value={totalJobs}
                  onChange={(event) => setTotalJobs(Number(event.target.value))}
                  required
                />
              </label>

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
                  disabled={creating}
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

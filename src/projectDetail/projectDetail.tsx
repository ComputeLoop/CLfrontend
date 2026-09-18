import { useEffect, useState } from "react";


const API_URL = import.meta.env.VITE_API_URL;

interface Project {
  id: string;
  name: string;
  description: string;
  totalJobs: number;
  completedJobs: number;
  status: "OPEN" | "RUNNING" | "COMPLETED";
}

interface Job {
  id: string;
  projectId: string;
  jobNumber: number;
  status: "PENDING" | "RUNNING" | "COMPLETED";
  workerId: string | null;
  inputStart: number;
  inputEnd: number;
  result: string | null;
}

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
}

export default function ProjectDetail({
  projectId,
  onBack,
}: ProjectDetailProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const projectResponse = await fetch(`${API_URL}/projects`);

      if (projectResponse.ok) {
        const projects = (await projectResponse.json()) as Project[];
        const found = projects.find((item) => item.id === projectId);

        if (found && !cancelled) {
          setProject(found);
        }
      }

      const jobsResponse = await fetch(`${API_URL}/projects/${projectId}/jobs`);

      if (jobsResponse.ok && !cancelled) {
        const jobs = (await jobsResponse.json()) as Job[];
        setJobs(jobs);
      }
    }

    refresh();

    const interval = setInterval(refresh, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [projectId]);

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
              <span>/ {project.totalJobs} jobs completed</span>
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

      <section className="jobs-section">
        <div className="section-heading">
          <div>
            <p className="section-label">WORK QUEUE</p>
            <h2>Jobs</h2>
          </div>

          <span className="job-total">{jobs.length} total</span>
        </div>

        <div className="jobs-table">
          <div className="job-row job-header">
            <span>JOB</span>
            <span>RANGE</span>
            <span>STATUS</span>
            <span>WORKER</span>
          </div>

          {jobs.map((job) => (
            <div className="job-row" key={job.id}>
              <strong>#{job.jobNumber}</strong>

              <span className="job-range">
                {job.inputStart.toLocaleString()} –{" "}
                {job.inputEnd.toLocaleString()}
              </span>

              <span className={`job-status ${job.status.toLowerCase()}`}>
                <span className="status-dot" />
                {job.status}
              </span>

              <span className="worker-name">{job.workerId ?? "—"}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

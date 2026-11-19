import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "../context/useAuth";

const API = (import.meta.env.VITE_API_URL || "http://localhost:6767").replace(/\/$/, "") + "/team";
type Role = "owner" | "admin" | "member";
type Team = { id: string; name: string; paidUntil: number; paid: number; role: Role };
type Member = { id: string; username: string; role: Role };
type App = { id: string; name: string; gpu: number; sourceUrl: string | null; instructions: string };
type Task = { id: string; jobId: string; label: string; args: string; state: "pending" | "running" | "done" | "failed"; error?: string; inputBytes: number; claimedBy: string | null; assignee: string | null; claimExpiresAt: number | null };
type Board = { role: Role; paidUntil: number; paid: boolean; members: Member[]; apps: App[]; jobs: { id: string; name: string; appId: string }[]; tasks: Task[] };
type Account = { workspaces: Team[]; balance: number; freeLimit: number; paidLimit: number; price: number; idrPerCoin: number; invites: { id: string; name: string }[]; transactions: { kind: string; amount: number; at: number }[] };
const path = (team: string) => `/workspaces/${team}`;
const idr = (amount: number) => `Rp ${amount.toLocaleString("id-ID")}`;

async function api<T>(route: string, payload?: object): Promise<T> {
  const response = await fetch(API + route, {
    credentials: "include",
    ...(payload === undefined ? {} : {
      method: "POST",
      ...(payload instanceof FormData ? { body: payload } : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
    }),
  });
  const data = await response.json().catch(() => null) as T & { message?: string } | null;
  if (!response.ok) throw new Error(data?.message ?? `Request failed (${response.status}).`);
  return data as T;
}

type DraftTask = { id: number; label: string; args: string; file?: File };
type Perform = (fn: () => Promise<void | string>) => void;

function WorkspaceDeletion({ team, busy, perform }: { team: Team; busy: boolean; perform: Perform }) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  return <section className="team-panel team-danger">
    <h2>Delete workspace</h2>
    <p>This permanently deletes the workspace’s jobs, tasks, worker uploads, inputs, and results. Members lose access.</p>
    {open ? <form className="team-form" onSubmit={(event) => {
      event.preventDefault();
      if (busy || confirmation !== team.name) return;
      perform(async () => {
        const result = await api<{ cleanupComplete: boolean }>(`${path(team.id)}/delete`, { confirmName: confirmation });
        return result.cleanupComplete ? `Deleted “${team.name}”.` : `Deleted “${team.name}”, but some stored files could not be removed.`;
      });
    }}>
      <label>Type <strong>{team.name}</strong> to confirm<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} maxLength={96} autoComplete="off" spellCheck={false} required disabled={busy} /></label>
      <div className="team-actions">
        <button type="button" className="team-secondary" disabled={busy} onClick={() => { setOpen(false); setConfirmation(""); }}>Cancel</button>
        <button type="submit" disabled={busy || confirmation !== team.name}>Permanently delete workspace</button>
      </div>
    </form> : <button type="button" disabled={busy} onClick={() => setOpen(true)}>Delete workspace…</button>}
  </section>;
}

function WorkerLink({ app, teamId }: { app: App; teamId: string }) {
  return app.sourceUrl
    ? <a href={app.sourceUrl} target="_blank" rel="noreferrer">Open worker download link ↗</a>
    : <a href={`${API}${path(teamId)}/apps/${app.id}/package`}>Download worker ZIP</a>;
}

function WorkerForm({ teamId, busy, perform }: { teamId: string; busy: boolean; perform: Perform }) {
  const [source, setSource] = useState("upload");
  return <form className="team-form" onSubmit={(event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    perform(async () => { await api(`${path(teamId)}/apps`, data); form.reset(); });
  }}>
    <label>Worker name<input name="name" required maxLength={96} placeholder="Fruit classifier v1" /></label>
    <label>Hardware requirement<select name="device"><option value="cpu">CPU / no GPU required</option><option value="gpu">NVIDIA GPU required</option></select></label>
    <label>How members get the worker<select value={source} onChange={(event) => setSource(event.target.value)}><option value="upload">Upload a ZIP</option><option value="link">Link to a release or download</option></select></label>
    {source === "upload" ? <label>Worker ZIP (up to 32 MiB)<input name="package" type="file" accept=".zip" required /></label> : <label>Download URL (HTTPS)<input name="sourceUrl" type="url" required maxLength={2000} placeholder="https://github.com/your-team/your-worker/releases/tag/v1.0" /></label>}
    <label>Run instructions for members<textarea name="instructions" rows={5} maxLength={8000} required placeholder={'List the supported OS and dependencies, the exact command with the task input, and where it writes result.json.'} /></label>
    <button disabled={busy}>Publish worker</button>
  </form>;
}

const taskStatus: Record<Task["state"], string> = { pending: "Available", running: "Claimed", done: "Submitted", failed: "Failed" };

function TaskCard({ task, app, teamId, userId, admin, busy, perform }: { task: Task; app?: App; teamId: string; userId?: string; admin: boolean; busy: boolean; perform: Perform }) {
  const taskPath = `${path(teamId)}/tasks/${task.id}`;
  const mine = task.state === "running" && task.claimedBy === userId;
  return <li className="team-task">
    <div className="team-panel-heading"><div><strong>{task.label}</strong>{task.assignee && <small>{mine ? "Claimed by you" : `Claimed by ${task.assignee}`}</small>}</div>
      <span className="team-actions"><span className={`team-badge ${task.state}`}>{taskStatus[task.state]}</span>
        {task.state === "done" && <a href={`${API}${taskPath}/result`}>Download result</a>}
        {admin && task.state === "failed" && <button className="team-secondary" disabled={busy} onClick={() => perform(async () => { await api(`${taskPath}/retry`, {}); })}>Retry</button>}
      </span>
    </div>
    {task.error && <small className="task-error">{task.error}</small>}
    {app && task.state !== "done" && <details>
      <summary>{mine ? "Continue this task" : "How to run this task"}</summary>
      <ol className="task-steps">
        <li><strong>Claim the task.</strong> This reserves the task for you for 24 hours.
          {task.state === "pending" && !!app.instructions && <div className="team-actions"><button disabled={busy} onClick={() => perform(async () => { await api(`${taskPath}/claim`, {}); })}>Claim this task</button></div>}
          {task.state === "running" && !mine && <p className="team-muted">Another member has claimed this task.</p>}
        </li>
        <li><strong>Get the files.</strong> The researcher published <strong>{app.name}</strong>{app.gpu ? " (NVIDIA GPU required)" : ""} for this job.<div className="team-actions"><WorkerLink app={app} teamId={teamId} />{task.inputBytes > 0 && <a href={`${API}${taskPath}/input`}>Download task input ZIP</a>}</div></li>
        <li><strong>Run it on your computer.</strong>{app.instructions ? <pre>{app.instructions}</pre> : <p>Ask the researcher to publish this worker with run instructions.</p>}{task.args !== "[]" && <p>Arguments for this task: <code>{task.args}</code></p>}</li>
        <li><strong>Submit your result.</strong> Upload the <code>result.json</code> produced by the worker here (up to 4 MiB).
          {mine && <form className="team-form" onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const result = new FormData(form);
            perform(async () => { await api(`${taskPath}/complete`, result); form.reset(); });
          }}><label>Result JSON<input name="result" type="file" accept=".json,application/json" required /></label><button disabled={busy}>Submit result</button></form>}
        </li>
      </ol>
      {mine && <div className="team-actions"><button className="team-secondary" disabled={busy} onClick={() => perform(async () => { await api(`${taskPath}/release`, {}); })}>Release task</button>{task.claimExpiresAt && <span className="team-muted">Claim expires {new Date(task.claimExpiresAt).toLocaleString()}</span>}</div>}
    </details>}
  </li>;
}

function JobForm({ teamId, apps, busy, perform }: { teamId: string; apps: App[]; busy: boolean; perform: Perform }) {
  const [drafts, setDrafts] = useState<DraftTask[]>([{ id: 1, label: "Batch 1", args: "[]" }]);
  const [next, setNext] = useState(2);
  function change(id: number, patch: Partial<DraftTask>) { setDrafts((rows) => rows.map((row) => row.id === id ? { ...row, ...patch } : row)); }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    perform(async () => {
      const data = new FormData(form);
      const items = drafts.map((draft) => {
        let args: unknown;
        try { args = JSON.parse(draft.args); } catch { throw new Error(`${draft.label}: arguments must be a JSON array of strings.`); }
        if (!Array.isArray(args) || args.some((arg) => typeof arg !== "string")) throw new Error(`${draft.label}: arguments must be a JSON array of strings.`);
        if (!draft.file) return { label: draft.label, args };
        const inputIndex = data.getAll("inputs").length;
        data.append("inputs", draft.file);
        return { label: draft.label, args, inputIndex };
      });
      data.set("manifest", JSON.stringify(items));
      await api(`${path(teamId)}/jobs`, data);
      form.reset();
      setDrafts([{ id: next, label: "Batch 1", args: "[]" }]);
      setNext(next + 1);
    });
  }
  return <form onSubmit={submit} className="team-form">
    <div className="team-columns"><label>Job name<input name="name" required maxLength={96} placeholder="Classify lab images" /></label>
      <label>Researcher’s worker<select name="appId" required>{apps.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.gpu ? "GPU" : "CPU"}</option>)}</select></label></div>
    <p className="team-muted">Create one task for each independent batch. Attach the input for that batch and include any arguments your instructions refer to.</p>
    {drafts.map((row, i) => <fieldset key={row.id} className="task-edit"><legend>Task {i + 1}</legend>
      <label>Label<input value={row.label} required maxLength={96} onChange={(event) => change(row.id, { label: event.target.value })} /></label>
      <label>Arguments (JSON array)<input value={row.args} onChange={(event) => change(row.id, { args: event.target.value })} placeholder='["--start", "0", "--end", "500"]' required /></label>
      <label>Input ZIP (optional)<input type="file" accept=".zip" onChange={(event) => change(row.id, { file: event.target.files?.[0] })} /></label>
      {drafts.length > 1 && <button type="button" className="team-secondary" onClick={() => setDrafts(drafts.filter((task) => task.id !== row.id))}>Remove task</button>}
    </fieldset>)}
    <div className="team-actions"><button type="button" className="team-secondary" disabled={drafts.length >= 100} onClick={() => { setDrafts([...drafts, { id: next, label: `Batch ${drafts.length + 1}`, args: "[]" }]); setNext(next + 1); }}>Add task</button><button disabled={busy}>Publish job</button></div>
  </form>;
}

export function WorkspaceDashboard() {
  const { user, logout } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [workspace, setWorkspace] = useState("");
  const [boardState, setBoardState] = useState<{ id: string; value: Board }>();
  const [tab, setTab] = useState<"jobs" | "team" | "billing">("jobs");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [coins, setCoins] = useState(30);
  const topUpInput = useRef<HTMLInputElement>(null);
  const focusTopUp = useRef(false);
  const board = boardState?.id === workspace ? boardState.value : undefined;
  const team = account?.workspaces.find((item) => item.id === workspace);
  const applyAccount = useCallback((result: Account) => {
    setAccount(result);
    setWorkspace((current) => result.workspaces.some((item) => item.id === current) ? current : result.workspaces[0]?.id ?? "");
  }, []);
  const refreshBoard = useCallback(async (id: string) => {
    if (id) setBoardState({ id, value: await api<Board>(path(id)) });
  }, []);
  useEffect(() => {
    let cancelled = false;
    const load = () => void api<Account>("/me").then((result) => {
      if (!cancelled) applyAccount(result);
    }).catch((e: Error) => { if (!cancelled) setError(e.message); });
    load();
    const timer = window.setInterval(load, 15_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [applyAccount]);
  useEffect(() => {
    if (!workspace) return;
    let cancelled = false;
    const load = () => { void api<Board>(path(workspace)).then((value) => {
      if (!cancelled) setBoardState({ id: workspace, value });
    }).catch((e: Error) => {
      if (!cancelled) { setError(e.message); setBoardState(undefined); }
    }); };
    load();
    const timer = window.setInterval(load, 3000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [workspace]);
  useEffect(() => {
    if (tab === "billing" && focusTopUp.current) {
      topUpInput.current?.focus();
      focusTopUp.current = false;
    }
  }, [tab]);
  function openTopUp() {
    setError("");
    setMessage("");
    if (tab === "billing") {
      topUpInput.current?.focus();
    } else {
      focusTopUp.current = true;
      setTab("billing");
    }
  }
  const perform: Perform = (fn) => {
    setBusy(true); setError(""); setMessage("");
    void fn().then(async (notice) => {
      const result = await api<Account>("/me");
      applyAccount(result);
      if (result.workspaces.some((item) => item.id === workspace)) await refreshBoard(workspace);
      setError("");
      setMessage(notice ?? "Done.");
    }).catch((e: Error) => setError(e.message)).finally(() => setBusy(false));
  };
  const field = (event: FormEvent<HTMLFormElement>, action: (data: FormData) => Promise<void>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    perform(async () => { await action(data); form.reset(); });
  };
  const paid = board?.paid ?? Boolean(team?.paid);
  const admin = board?.role === "owner" || board?.role === "admin";
  const owner = board?.role === "owner";
  const published = board?.apps.filter((app) => app.instructions) ?? [];
  return <div className="team-shell">
    <header className="navbar team-top">
      <div className="navbar-inner team-top-inner">
        <a className="brand team-brand" href="#"><span className="brand-mark" aria-hidden="true">C</span>Compute Loop</a>
        <span className="team-top-note">CAMPUS COMPUTE</span>
        <a className="team-top-help" href="#help">Help &amp; packaging guide</a>
        <div className="nav-account team-top-actions">
          <span className="wallet-button team-coin-balance"><span aria-hidden="true">🪙:</span><span className="team-visually-hidden">Compute coins: </span> {account?.balance.toLocaleString("id-ID") ?? "—"}</span>
          <button type="button" className="create-button" disabled={!account} onClick={openTopUp}>Top up</button>
          <button type="button" className="sign-in-button" onClick={() => void logout()}>Sign out</button>
        </div>
      </div>
    </header>
    <main className="team-layout">
      <aside className="team-sidebar">
        <p className="team-kicker">WORKSPACES</p>
        {account?.workspaces.map((item) => <button key={item.id} className="workspace-choice" aria-pressed={workspace === item.id} onClick={() => { setWorkspace(item.id); setTab("jobs"); setError(""); setMessage(""); }}>{item.name}<small>{item.role}</small></button>)}
        <form className="team-form" onSubmit={(event) => field(event, async (data) => { const created = await api<{id: string}>("/workspaces", { name: data.get("name") }); setWorkspace(created.id); setTab("jobs"); })}>
          <label>New workspace<input name="name" placeholder="Lab or team name" required maxLength={96} /></label><button disabled={busy}>Create workspace</button>
        </form>
        {!!account?.invites.length && <div className="team-invitations"><p className="team-kicker">INVITATIONS</p>{account.invites.map((invite) => <p key={invite.id}>{invite.name} <button className="team-secondary" disabled={busy} onClick={() => perform(async () => { await api(`${path(invite.id)}/join`, {}); setWorkspace(invite.id); setTab("jobs"); })}>Accept</button></p>)}</div>}
      </aside>
      <div className="team-content">
        <section className="team-hero"><p className="team-kicker">{team ? `${paid ? "TEAM PLAN" : "FREE PLAN"} · ${team.role.toUpperCase()}` : "SHARED COMPUTE FOR STUDENT RESEARCH"}</p>
          <h1>{team?.name ?? "Put your team’s machines to work."}</h1>
          <p>{team ? (admin ? "Publish your worker and run instructions, then split the job into tasks members can run on their own computers." : "Pick a task, download the worker your researcher published, and submit the result after running it on your computer.") : `Hi ${user?.username ?? "there"}. Create a workspace or accept an invitation to run your team’s batch workloads.`}</p></section>
        {error && <p className="team-alert" role="alert">{error}</p>}{message && <p className="team-message" role="status">{message}</p>}
        {team && <nav className="team-tabs" aria-label="Workspace sections">{([ ["jobs", "Jobs & tasks"], ["team", "Members"], ["billing", "Demo billing"] ] as const).map(([value, label]) => <button key={value} aria-pressed={tab === value} onClick={() => { setTab(value); setError(""); setMessage(""); }}>{label}</button>)}</nav>}
        {tab === "jobs" && board && <>
          {admin && <section className="team-panel"><div className="team-panel-heading"><h2>Workers your team publishes</h2><a href="#help">Worker publishing guide</a></div>
            <p className="team-muted">A worker is the script or program your members download and run. Upload it or link to a release, and tell members exactly how to use it.</p>
            {!!board.apps.length && <ul className="team-list">{board.apps.map((item) => <li key={item.id}><span><strong>{item.name}</strong>{!item.instructions && <small>Missing run instructions — republish for new jobs</small>}</span><WorkerLink app={item} teamId={workspace} /></li>)}</ul>}
            <details><summary>Publish a worker</summary><WorkerForm key={workspace} teamId={workspace} busy={busy} perform={perform} /></details>
          </section>}
          <section className="team-panel"><div className="team-panel-heading"><h2>Jobs &amp; tasks</h2></div>
            {admin && published.length > 0 && <details><summary>Create a batch job</summary><JobForm key={workspace} teamId={workspace} apps={published} busy={busy} perform={perform} /></details>}
            {!board.jobs.length && <p className="team-muted">{admin ? "Publish a worker, then create a batch job to give members tasks to run." : "Your researcher hasn’t published any tasks yet."}</p>}
            {board.jobs.map((job) => {
              const tasks = board.tasks.filter((item) => item.jobId === job.id);
              const done = tasks.filter((item) => item.state === "done").length;
              return <article key={job.id} className="team-job"><div className="team-panel-heading"><div><h3>{job.name}</h3><span className="team-muted">{done} / {tasks.length} complete</span></div>{done > 0 && <a href={`${API}${path(workspace)}/jobs/${job.id}/results`}>{done === tasks.length ? "Download results" : "Download partial results"}</a>}</div>
                <progress max={tasks.length} value={done} aria-label={`${job.name} progress`} />
                <ul className="team-list">{tasks.map((item) => <TaskCard key={item.id} task={item} app={board.apps.find((app) => app.id === job.appId)} teamId={workspace} userId={user?.id} admin={admin} busy={busy} perform={perform} />)}</ul>
              </article>;
            })}
          </section>
        </>}
        {tab === "team" && board && <>
          <section className="team-panel"><h2>Members <small>{board.members.length} / {paid ? account?.paidLimit : account?.freeLimit}</small></h2>
            <ul className="team-list">{board.members.map((member) => <li key={member.id}><span><strong>{member.username}</strong> · {member.role}</span>{owner && member.role !== "owner" && <span className="team-actions"><button className="team-secondary" disabled={busy} onClick={() => perform(async () => { await api(`${path(workspace)}/members/${member.id}`, { role: member.role === "admin" ? "member" : "admin" }); })}>{member.role === "admin" ? "Make member" : "Make admin"}</button><button className="team-secondary" disabled={busy} onClick={() => { if (window.confirm(`Remove ${member.username} from this workspace?`)) perform(async () => { await api(`${path(workspace)}/members/${member.id}`, { role: "remove" }); }); }}>Remove</button></span>}</li>)}</ul>
            {owner && <form className="team-form" onSubmit={(event) => field(event, async (data) => { await api(`${path(workspace)}/invites`, { username: data.get("username") }); })}><label>Invite an existing account by username<input name="username" required maxLength={96} /></label><button disabled={busy}>Send invitation</button></form>}
          </section>
          {owner && team && <WorkspaceDeletion key={team.id} team={team} busy={busy} perform={perform} />}
        </>}
        {tab === "billing" && account && <section className="team-panel"><p className="team-kicker">SIMULATION · NO REAL MONEY</p><h2>Compute coins</h2><p><strong>{account.balance}</strong> coins in your account. For this demo, 1 coin represents {idr(account.idrPerCoin)}. Coins only pay for workspace plans.</p>
          <form className="team-form" onSubmit={(event) => { event.preventDefault(); perform(async () => { await api("/top-up", { coins }); }); }}><label>Coins to top up<input ref={topUpInput} className="team-topup-input" type="number" min={1} max={1000} required value={Number.isNaN(coins) ? "" : coins} onChange={(event) => setCoins(event.target.valueAsNumber)} /></label><button disabled={busy || !Number.isFinite(coins)}>Simulate top-up · {idr((coins || 0) * account.idrPerCoin)}</button></form>
          <hr /><h3>Workspace plans</h3><p>Free: {account.freeLimit} members. Team: {account.paidLimit} members for {account.price} coins ({idr(account.price * account.idrPerCoin)}) per 30 days. The owner counts toward the limit. Demo pricing is provisional.</p>
          {owner && <button disabled={busy} onClick={() => { if (window.confirm(`Spend ${account.price} demo coins to add 30 days to ${team?.name}?`)) perform(async () => { await api(`${path(workspace)}/subscribe`, {}); }); }}>{paid ? "Extend demo subscription" : "Activate demo subscription"}</button>}
          {paid && board && <p>Team plan active through {new Date(board.paidUntil).toLocaleDateString()}.</p>}
          {!!account.transactions.length && <ul className="team-list">{account.transactions.map((item, i) => <li key={`${item.at}-${i}`}><span>{item.kind} <small>{new Date(item.at).toLocaleString()}</small></span><strong>{item.amount > 0 ? "+" : ""}{item.amount} coins</strong></li>)}</ul>}
        </section>}
      </div>
    </main>
  </div>;
}

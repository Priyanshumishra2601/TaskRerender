import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  LogOut,
  Search,
  Loader2,
} from "lucide-react";
import { api, getStoredUser, setSession, getToken } from "./api.js";

const TECH_OPTIONS = ["React", "Node", "MySQL", "Java", "Python", "AWS", "Docker", "Kubernetes", "HTML", "CSS","NEXTJS","TYPESCRIPT ", "POSTMAN"];

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

function isOverdue(task) {
  if (task.status === "Completed" || !task.dueDate) return false;
  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);
  return due < startOfToday();
}

function heatColor(count, max) {
  if (!count) return "#e8eaed";
  const t = Math.min(1, count / max);
  if (t < 0.25) return "#c6e1ff";
  if (t < 0.5) return "#7cb0ff";
  if (t < 0.75) return "#4285f4";
  return "#185abc";
}

function chunkWeeks(daysArr) {
  const cols = [];
  for (let i = 0; i < daysArr.length; i += 7) {
    cols.push(daysArr.slice(i, i + 7));
  }
  return cols;
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(() => getStoredUser());
  const [authTab, setAuthTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [panel, setPanel] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [members, setMembers] = useState([]);
  const [ptitle, setPtitle] = useState("");
  const [pdesc, setPdesc] = useState("");
  const [ptech, setPtech] = useState([]);
  const [tProject, setTProject] = useState("");
  const [tTitle, setTTitle] = useState("");
  const [tDue, setTDue] = useState("");
  const [tAssign, setTAssign] = useState("");

  const refresh = useCallback(async () => {
    if (!getToken()) return;
    setLoading(true);
    try {
      const [p, t, s, a, m] = await Promise.all([
        api.projects(),
        api.tasks(),
        api.stats(),
        api.activity(84),
        api.members(),
      ]);
      setProjects(p);
      setTasks(t);
      setStats(s);
      setActivity(a);
      setMembers(m);
    } catch (e) {
      toast.error(e.message || "Could not load data");
      if (e.status === 401) {
        setSession(null, null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const t = getToken();
      if (!t) {
        setBooting(false);
        return;
      }
      try {
        const me = await api.me();
        setUser(me);
        setSession(t, me);
        await refresh();
      } catch {
        setSession(null, null);
        setUser(null);
      } finally {
        setBooting(false);
      }
    })();
  }, [refresh]);

  useEffect(() => {
    if (user && projects.length && !tProject) {
      setTProject(String(projects[0].id));
    }
  }, [user, projects, tProject]);

  const q = search.trim().toLowerCase();

  const filteredProjects = useMemo(() => {
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.techStack || []).some((x) => String(x).toLowerCase().includes(q))
    );
  }, [projects, q]);

  const filteredTasks = useMemo(() => {
    if (!q) return tasks;
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.projectTitle || "").toLowerCase().includes(q)
    );
  }, [tasks, q]);

  const showProjectForm = panel === "dashboard" || panel === "projects";
  const showTaskList = panel === "dashboard" || panel === "tasks";

  const maxAct = useMemo(
    () => Math.max(1, ...activity.map((x) => x.count)),
    [activity]
  );
  const weekCols = useMemo(() => chunkWeeks(activity), [activity]);

  async function onLogin(e) {
    e.preventDefault();
    try {
      const data = await api.login({ email, password });
      setSession(data.token, data.user);
      setUser(data.user);
      toast.success("Signed in");
      await refresh();
    } catch (err) {
      toast.error(err.message || "Sign in failed");
    }
  }

  async function onRegister(e) {
    e.preventDefault();
    try {
      const data = await api.register({ name, email, password });
      setSession(data.token, data.user);
      setUser(data.user);
      toast.success("Account created");
      await refresh();
    } catch (err) {
      toast.error(err.message || "Could not register");
    }
  }

  function logout() {
    setSession(null, null);
    setUser(null);
    setProjects([]);
    setTasks([]);
    setStats(null);
    setActivity([]);
    toast.success("Signed out");
  }

  function toggleTech(opt) {
    setPtech((prev) =>
      prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]
    );
  }

  async function createProject(e) {
    e.preventDefault();
    if (!ptitle.trim()) {
      toast.error("Title required");
      return;
    }
    try {
      const p = await api.createProject({
        title: ptitle.trim(),
        description: pdesc.trim() || undefined,
        techStack: ptech,
      });
      setProjects((prev) => [p, ...prev]);
      setPtitle("");
      setPdesc("");
      setPtech([]);
      toast.success("Project created");
      await refresh();
    } catch (err) {
      toast.error(err.message || "Could not create project");
    }
  }

  async function createTask(e) {
    e.preventDefault();
    if (!tProject || !tTitle.trim()) {
      toast.error("Project and task title required");
      return;
    }
    try {
      await api.createTask({
        projectId: Number(tProject),
        title: tTitle.trim(),
        dueDate: tDue || undefined,
        assignedTo: tAssign ? Number(tAssign) : undefined,
      });
      setTTitle("");
      setTDue("");
      setTAssign("");
      toast.success("Task created");
      await refresh();
    } catch (err) {
      toast.error(err.message || "Could not create task");
    }
  }

  async function onStatusChange(task, status) {
    try {
      await api.updateTaskStatus(task.id, status);
      toast.success("Task updated");
      await refresh();
    } catch (err) {
      toast.error(err.message || "Update failed");
    }
  }

  async function onAssign(task, assignedTo) {
    try {
      await api.assignTask(task.id, assignedTo ? Number(assignedTo) : null);
      toast.success("Assignment updated");
      await refresh();
    } catch (err) {
      toast.error(err.message || "Could not assign");
    }
  }

  if (booting) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm font-medium">Loading</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-card transition hover:shadow-lg">
          <h1 className="text-center text-2xl font-semibold tracking-tight text-slate-900">
            Workspace
          </h1>
          <p className="mt-1 text-center text-sm text-slate-500">
            Sign in to manage projects and tasks
          </p>
          <div className="mt-6 flex rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setAuthTab("login")}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
                authTab === "login"
                  ? "bg-white text-slate-900 shadow-soft"
                  : "text-slate-600"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setAuthTab("register")}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
                authTab === "register"
                  ? "bg-white text-slate-900 shadow-soft"
                  : "text-slate-600"
              }`}
            >
              Register
            </button>
          </div>
          {authTab === "login" ? (
            <form onSubmit={onLogin} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Email
                </label>
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-blue-500/30 transition focus:ring-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Password
                </label>
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-blue-500/30 transition focus:ring-2"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-full bg-[#1a73e8] py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-[#1558b8] active:scale-[0.99]"
              >
                Continue
              </button>
            </form>
          ) : (
            <form onSubmit={onRegister} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Name
                </label>
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-blue-500/30 transition focus:ring-2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Email
                </label>
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-blue-500/30 transition focus:ring-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Password
                </label>
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-blue-500/30 transition focus:ring-2"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  required
                  autoComplete="new-password"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-full bg-[#1a73e8] py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-[#1558b8] active:scale-[0.99]"
              >
                Create account
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <aside className="group/side flex shrink-0 flex-row border-b border-slate-200/80 bg-white md:h-full md:w-[56px] md:flex-col md:border-b-0 md:border-r md:py-4 md:transition-[width] md:duration-300 md:ease-out md:hover:w-44 md:overflow-hidden">
        <div className="flex flex-1 flex-row justify-around gap-1 px-2 py-2 md:flex-col md:px-2 md:py-0">
          <NavIcon
            active={panel === "dashboard"}
            onClick={() => setPanel("dashboard")}
            icon={LayoutDashboard}
            label="Dashboard"
          />
          <NavIcon
            active={panel === "projects"}
            onClick={() => setPanel("projects")}
            icon={FolderKanban}
            label="Projects"
          />
          <NavIcon
            active={panel === "tasks"}
            onClick={() => setPanel("tasks")}
            icon={CheckSquare}
            label="Tasks"
          />
        </div>
        <div className="flex flex-row px-2 py-2 md:flex-col md:border-t md:border-slate-100 md:pt-3">
          <button
            type="button"
            title="Logout"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="hidden text-sm font-medium whitespace-nowrap md:inline-block md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-300 md:group-hover/side:max-w-[120px] md:group-hover/side:opacity-100">
              Logout
            </span>
          </button>
        </div>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects and tasks"
              className="w-full rounded-full border border-slate-200/90 bg-white py-3.5 pr-4 pl-12 text-sm shadow-soft outline-none ring-blue-500/20 transition focus:border-blue-300 focus:ring-2"
            />
          </div>

          {showProjectForm && (
            <>
              <div className="mt-8 rounded-3xl bg-white p-6 shadow-card transition hover:shadow-lg">
                <h2 className="text-lg font-semibold text-slate-900">
                  New project
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Capture a title, description, and stack
                </p>
                <form onSubmit={createProject} className="mt-5 space-y-4">
                  <input
                    value={ptitle}
                    onChange={(e) => setPtitle(e.target.value)}
                    placeholder="Project title"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none ring-blue-500/25 transition focus:ring-2"
                  />
                  <textarea
                    value={pdesc}
                    onChange={(e) => setPdesc(e.target.value)}
                    placeholder="Description"
                    rows={3}
                    className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none ring-blue-500/25 transition focus:ring-2"
                  />
                  <div>
                    <p className="text-xs font-medium text-slate-600">
                      Tech stack
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {TECH_OPTIONS.map((opt) => {
                        const on = ptech.includes(opt);
                        return (
                          <button
                            type="button"
                            key={opt}
                            onClick={() => toggleTech(opt)}
                            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                              on
                                ? "bg-[#e8f0fe] text-[#1967d2] ring-1 ring-[#aecbfa]"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="rounded-full bg-[#1a73e8] px-6 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-[#1558b8] active:scale-[0.99]"
                  >
                    Create Project
                  </button>
                </form>
              </div>

              <section className="mt-10">
                <div className="flex items-end justify-between gap-4">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Submitted projects
                  </h2>
                  {loading && (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  )}
                </div>
                {filteredProjects.length === 0 ? (
                  <div className="mt-4 rounded-3xl border border-dashed border-slate-200 bg-white/60 px-6 py-12 text-center text-sm text-slate-500">
                    {projects.length === 0
                      ? "No projects yet. Create one above."
                      : "No matches for your search."}
                  </div>
                ) : (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {filteredProjects.map((p) => (
                      <article
                        key={p.id}
                        className="group rounded-3xl border border-slate-100 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-card"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-slate-900 transition group-hover:text-[#1967d2]">
                            {p.title}
                          </h3>
                          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                            {p.status}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                          {p.description || "No description"}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {(p.techStack || []).map((t) => (
                            <span
                              key={t}
                              className="rounded-full bg-[#f1f3f4] px-2 py-0.5 text-[11px] font-medium text-slate-700"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                        <p className="mt-3 text-xs text-slate-400">
                          {formatDate(p.createdAt)}
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {showTaskList && panel === "tasks" && user.role === "Admin" && (
            <div className="mt-10 rounded-3xl bg-white p-6 shadow-card">
              <h2 className="text-lg font-semibold text-slate-900">
                New task
              </h2>
              <form onSubmit={createTask} className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-600">
                    Project
                  </label>
                  <select
                    value={tProject}
                    onChange={(e) => setTProject(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500/25 focus:ring-2"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-600">
                    Title
                  </label>
                  <input
                    value={tTitle}
                    onChange={(e) => setTTitle(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500/25 focus:ring-2"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">
                    Due date
                  </label>
                  <input
                    type="date"
                    value={tDue}
                    onChange={(e) => setTDue(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500/25 focus:ring-2"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">
                    Assign to
                  </label>
                  <select
                    value={tAssign}
                    onChange={(e) => setTAssign(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500/25 focus:ring-2"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-slate-800"
                  >
                    Create task
                  </button>
                </div>
              </form>
            </div>
          )}

          {showTaskList && (
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-slate-900">Tasks</h2>
              {filteredTasks.length === 0 ? (
                <div className="mt-4 rounded-3xl border border-dashed border-slate-200 bg-white/60 px-6 py-12 text-center text-sm text-slate-500">
                  {tasks.length === 0
                    ? "No tasks yet."
                    : "No tasks match your search."}
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {filteredTasks.map((task) => {
                    const overdue = isOverdue(task);
                    const canStatus =
                      user.role === "Admin" || task.assignedTo === user.id;
                    return (
                      <div
                        key={task.id}
                        className={`rounded-2xl border bg-white p-4 shadow-soft transition hover:shadow-card ${
                          overdue
                            ? "border-red-200 ring-1 ring-red-100"
                            : "border-slate-100"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-900">
                                {task.title}
                              </p>
                              {overdue && (
                                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-700">
                                  Overdue
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              {task.projectTitle}
                              {task.assigneeName
                                ? ` · ${task.assigneeName}`
                                : ""}
                              {task.dueDate
                                ? ` · Due ${formatDate(task.dueDate)}`
                                : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {canStatus ? (
                              <select
                                value={task.status}
                                onChange={(e) =>
                                  onStatusChange(task, e.target.value)
                                }
                                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium outline-none transition hover:bg-white"
                              >
                                <option>Pending</option>
                                <option>In Progress</option>
                                <option>Completed</option>
                              </select>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                                {task.status}
                              </span>
                            )}
                            {user.role === "Admin" && (
                              <select
                                value={
                                  task.assignedTo != null
                                    ? String(task.assignedTo)
                                    : ""
                                }
                                onChange={(e) =>
                                  onAssign(
                                    task,
                                    e.target.value === ""
                                      ? null
                                      : e.target.value
                                  )
                                }
                                className="rounded-full border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none"
                              >
                                <option value="">Assign…</option>
                                {members.map((m) => (
                                  <option key={m.id} value={String(m.id)}>
                                    {m.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          <div className="mt-12 space-y-6 lg:hidden">
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-soft">
              <h3 className="text-sm font-semibold text-slate-900">Activity</h3>
              <p className="mt-1 text-xs text-slate-500">Completions per day</p>
              <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
                {weekCols.map((col, ci) => (
                  <div key={ci} className="flex flex-col gap-1">
                    {col.map((cell, ri) => (
                      <div
                        key={`${ci}-${ri}`}
                        title={`${cell.date}: ${cell.count}`}
                        className="h-3 w-3 rounded-[3px]"
                        style={{
                          backgroundColor: heatColor(cell.count, maxAct),
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-soft">
              <h3 className="text-sm font-semibold text-slate-900">Stats</h3>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <StatCard label="Total tasks" value={stats?.totalTasks ?? "—"} />
                <StatCard label="Completed" value={stats?.completedTasks ?? "—"} />
                <StatCard label="Pending" value={stats?.pendingTasks ?? "—"} />
                <StatCard
                  label="Overdue"
                  value={stats?.overdueTasks ?? "—"}
                  accent
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <aside className="hidden w-[280px] shrink-0 border-l border-slate-200/80 bg-white/90 p-5 backdrop-blur lg:block lg:overflow-y-auto">
        <h3 className="text-sm font-semibold text-slate-900">Activity</h3>
        <p className="mt-1 text-xs text-slate-500">Completions per day</p>
        <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
          {weekCols.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-1">
              {col.map((cell, ri) => (
                <div
                  key={`${ci}-${ri}`}
                  title={`${cell.date}: ${cell.count}`}
                  className="h-3 w-3 rounded-[3px] transition hover:scale-110"
                  style={{
                    backgroundColor: heatColor(cell.count, maxAct),
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        <h3 className="mt-8 text-sm font-semibold text-slate-900">Stats</h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <StatCard label="Total tasks" value={stats?.totalTasks ?? "—"} />
          <StatCard label="Completed" value={stats?.completedTasks ?? "—"} />
          <StatCard label="Pending" value={stats?.pendingTasks ?? "—"} />
          <StatCard
            label="Overdue"
            value={stats?.overdueTasks ?? "—"}
            accent
          />
        </div>
        <div className="mt-6 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
          <p className="font-medium text-slate-800">{user.name}</p>
          <p className="mt-0.5">{user.email}</p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
            {user.role}
          </p>
        </div>
      </aside>
    </div>
  );
}

function NavIcon({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 transition ${
        active
          ? "bg-[#e8f0fe] text-[#1967d2]"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="hidden text-sm font-medium whitespace-nowrap md:inline-block md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-300 md:group-hover/side:max-w-[120px] md:group-hover/side:opacity-100">
        {label}
      </span>
    </button>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div
      className={`rounded-2xl border px-3 py-3 shadow-soft transition hover:-translate-y-0.5 hover:shadow-card ${
        accent ? "border-red-100 bg-red-50/50" : "border-slate-100 bg-white"
      }`}
    >
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold ${
          accent ? "text-red-700" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

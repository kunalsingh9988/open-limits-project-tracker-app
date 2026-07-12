import { FormEvent, ReactNode, useEffect, useState } from "react";
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  AlertTriangle,
  Archive,
  Bell,
  CalendarDays,
  Check,
  ClipboardList,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  Flag,
  Gauge,
  HelpCircle,
  LayoutDashboard,
  Link as LinkIcon,
  ListChecks,
  Lock,
  LogOut,
  MessageSquare,
  Plus,
  Reply,
  Search,
  Settings,
  Shield,
  Sparkles,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { addDays, format, startOfWeek } from "date-fns";
import { useAppStore } from "./store";
import {
  PRIORITIES,
  PROJECT_STATUSES,
  TASK_STATUSES,
  TIME_SLOTS,
  UPDATE_TEMPLATE,
} from "./config";
import type {
  Account,
  CalendarSlot,
  ChecklistItem,
  DailyClientUpdate,
  Priority,
  Project,
  ProjectDocument,
  ProjectLink,
  ProjectStatus,
  ResourceLink,
  StorePreview,
  Task,
  TaskStatus,
} from "./types";
import {
  checklistPercent,
  copyText,
  daysLeft,
  isOverdue,
  projectDone,
  ratingFor,
  scopedProjects,
  scopedTasks,
  taskDone,
  todayISO,
} from "./utils";
import logoUrl from "./assets/open-limits-logo.svg";

const statusClass: Record<string, string> = {
  "Not Started": "bg-gray-100 text-gray-700",
  "To Do": "bg-gray-100 text-gray-700",
  "Development In Progress": "bg-blue-100 text-blue-800",
  "UI In Progress": "bg-blue-100 text-blue-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Revision: "bg-amber-100 text-amber-800",
  "On Hold": "bg-amber-100 text-amber-800",
  "Client Waiting": "bg-amber-100 text-amber-800",
  Completed: "bg-emerald-100 text-emerald-800",
  Done: "bg-emerald-100 text-emerald-800",
  Delivered: "bg-violet-100 text-violet-800",
  Cancelled: "bg-red-100 text-red-800",
  Overdue: "bg-red-100 text-red-800",
};

const TEAM_COLOR_PALETTE = [
  "#5B5FEF",
  "#2563EB",
  "#0891B2",
  "#0D9488",
  "#059669",
  "#65A30D",
  "#CA8A04",
  "#EA580C",
  "#DC2626",
  "#E11D48",
  "#DB2777",
  "#C026D3",
  "#9333EA",
  "#7C3AED",
  "#4F46E5",
  "#475569",
  "#64748B",
  "#A16207",
  "#B45309",
  "#0F766E",
];

function statusTone(status?: string) {
  const key = (status || "").toLowerCase();
  if (status && statusClass[status]) return statusClass[status];
  if (/(delivered|complete|done|approved|live|launch)/.test(key)) return "bg-emerald-100 text-emerald-800";
  if (/(cancel|reject|block|risk|stuck|overdue|failed)/.test(key)) return "bg-red-100 text-red-800";
  if (/(hold|wait|revision|review|client|qa|pending)/.test(key)) return "bg-amber-100 text-amber-800";
  if (/(progress|develop|design|ui|working|build)/.test(key)) return "bg-blue-100 text-blue-800";
  if (/(priority|urgent|close)/.test(key)) return "bg-orange-100 text-orange-800";
  return "bg-slate-100 text-slate-700";
}

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Button({
  children,
  icon,
  tone = "default",
  type = "button",
  onClick,
  disabled,
}: {
  children: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "primary" | "danger" | "quiet";
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        tone === "primary" &&
          "border-[var(--accent)] bg-[var(--accent)] text-white hover:brightness-95",
        tone === "danger" && "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
        tone === "quiet" && "border-transparent bg-transparent text-gray-600 hover:bg-gray-100",
        tone === "default" && "border-gray-200 bg-white text-gray-800 hover:bg-gray-50",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function IconButton({
  label,
  children,
  onClick,
  tone = "default",
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  tone?: "default" | "danger" | "primary";
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-md border text-sm transition",
        tone === "primary" &&
          "border-[var(--accent)] bg-[var(--accent)] text-white hover:brightness-95",
        tone === "danger" && "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
        tone === "default" && "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
      )}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-gray-600">
      {label}
      {children}
    </label>
  );
}

function ColorTagPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (color: string) => void;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const selected = value || TEAM_COLOR_PALETTE[0];
  const isCustom = !TEAM_COLOR_PALETTE.some((color) => color.toLowerCase() === selected.toLowerCase());

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-10 gap-2 sm:flex sm:flex-wrap">
        {TEAM_COLOR_PALETTE.map((color) => {
          const active = selected.toLowerCase() === color.toLowerCase();
          return (
            <button
              key={color}
              type="button"
              title={color}
              aria-label={`Use color ${color}`}
              onClick={() => {
                onChange(color);
                setCustomOpen(false);
              }}
              className={cn(
                "size-7 rounded-md border transition hover:scale-105",
                active ? "border-gray-900 ring-2 ring-gray-900/20" : "border-gray-200",
              )}
              style={{ backgroundColor: color }}
            />
          );
        })}
        <button
          type="button"
          onClick={() => setCustomOpen((open) => !open)}
          className={cn(
            "col-span-3 h-7 rounded-md border px-2 text-xs font-semibold text-gray-700 sm:col-span-1",
            customOpen || isCustom ? "border-[var(--accent)] bg-blue-50" : "border-gray-200 bg-white",
          )}
        >
          Custom
        </button>
      </div>
      {(customOpen || isCustom) ? (
        <div className="flex items-center gap-2">
          <input
            className="h-9 w-16 rounded-md border border-gray-200 bg-white p-1"
            type="color"
            value={selected}
            onChange={(event) => onChange(event.target.value)}
          />
          <span className="mono text-xs text-gray-500">{selected}</span>
        </div>
      ) : null}
    </div>
  );
}

function inputClass() {
  return "h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[var(--accent)]";
}

function textareaClass() {
  return "min-h-20 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[var(--accent)]";
}

function makeId(prefix: string) {
  return `${prefix}-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now().toString(36)}`;
}

function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium", className)}>
      {children}
    </span>
  );
}

type ActionStatus = { tone: "success" | "error" | "info"; message: string };

function ActionNotice({ status }: { status?: ActionStatus }) {
  if (!status) return null;
  return (
    <div className={cn(
      "rounded-md px-3 py-2 text-sm",
      status.tone === "success" && "border border-emerald-200 bg-emerald-50 text-emerald-800",
      status.tone === "error" && "border border-red-200 bg-red-50 text-red-800",
      status.tone === "info" && "border border-blue-200 bg-blue-50 text-blue-800",
    )}>
      {status.message}
    </div>
  );
}

function EmptyState({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
      <p className="font-semibold text-gray-800">{title}</p>
      {detail ? <p className="mx-auto mt-1 max-w-xl leading-6">{detail}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

function Login() {
  const login = useAppStore((state) => state.login);
  const bootstrapFirstAdmin = useAppStore((state) => state.bootstrapFirstAdmin);
  const authError = useAppStore((state) => state.authError);
  const [loginMode, setLoginMode] = useState<"Admin" | "Employee">("Admin");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const demoCredentials = {
    Admin: { username: "admin", password: "admin123" },
    Employee: { username: "kunal", password: "kunal123" },
  } as const;

  function switchMode(mode: "Admin" | "Employee") {
    setLoginMode(mode);
    if (mode === "Admin") {
      setUsername("admin");
      setPassword("admin123");
    } else {
      setUsername("kunal");
      setPassword("kunal123");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    const ok = await login(username, password);
    setLoading(false);
    if (ok) navigate("/dashboard");
  }

  async function createFirstAdmin() {
    setLoading(true);
    const ok = await bootstrapFirstAdmin("Open Limits Admin", username, password);
    setLoading(false);
    if (ok) navigate("/dashboard");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--bg)] px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-6 flex items-center gap-3">
          <img src={logoUrl} alt="Open Limits logo" className="size-12 rounded-lg border border-gray-100" />
          <div>
            <h1 className="text-xl font-semibold">Open Limits</h1>
            <p className="text-sm text-gray-500">Project Tracker</p>
          </div>
        </div>
        <div className="mb-4 grid grid-cols-2 rounded-lg bg-gray-100 p-1">
          {(["Admin", "Employee"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => switchMode(mode)}
              className={cn(
                "flex h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold transition",
                loginMode === mode
                  ? "bg-white text-[var(--accent)] shadow-sm"
                  : "text-gray-500 hover:text-gray-800",
              )}
            >
              {mode === "Admin" ? <Shield size={16} /> : <Users size={16} />}
              {mode}
            </button>
          ))}
        </div>
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="font-semibold">Building phase login</p>
            <button
              type="button"
              onClick={() => {
                setUsername(demoCredentials[loginMode].username);
                setPassword(demoCredentials[loginMode].password);
              }}
              className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
            >
              Use {loginMode}
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-md bg-white/70 p-2">
              <p className="text-xs font-semibold uppercase text-amber-700">Admin</p>
              <p className="mono mt-1">ID: admin</p>
              <p className="mono">Password: admin123</p>
            </div>
            <div className="rounded-md bg-white/70 p-2">
              <p className="text-xs font-semibold uppercase text-amber-700">Employee</p>
              <p className="mono mt-1">ID: kunal</p>
              <p className="mono">Password: kunal123</p>
            </div>
          </div>
        </div>
        <div className="grid gap-3">
          <Field label="Username">
            <input className={inputClass()} value={username} onChange={(e) => setUsername(e.target.value)} />
          </Field>
          <Field label="Password">
            <input
              className={inputClass()}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {authError ? <p className="text-sm text-red-600">{authError}</p> : null}
          <Button type="submit" tone="primary" icon={<Lock size={16} />} disabled={loading}>
            {loading ? "Signing in" : `Log in as ${loginMode}`}
          </Button>
          {loginMode === "Admin" ? (
            <Button icon={<Shield size={16} />} onClick={createFirstAdmin} disabled={loading}>
              Create first admin
            </Button>
          ) : null}
        </div>
        <p className="mt-5 rounded-md bg-gray-50 p-3 text-xs leading-5 text-gray-600">
          Use Supabase Auth credentials. Usernames map to username@openlimits.local, so admin can log in with admin after the first admin is created.
        </p>
      </form>
    </main>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const state = useAppStore();
  const user = state.accounts.find((account) => account.id === state.sessionAccountId);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [nextPassword, setNextPassword] = useState("");
  const [shellStatus, setShellStatus] = useState<ActionStatus>();
  const unread = state.notifications.filter(
    (notification) => notification.recipientId === user?.id && !notification.read,
  ).length;
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" replace />;

  const adminNav = [
    ["/dashboard", "Dashboard", LayoutDashboard],
    ["/projects", "Projects", ClipboardList],
    ["/tasks", "Tasks", ListChecks],
    ["/updates", "Updates", MessageSquare],
    ["/calendar", "Calendar", CalendarDays],
    ["/performance", "Performance", Gauge],
    ["/directory", "Directory", Users],
    ["/team", "Team & Roles", Shield],
    ["/inspiration", "Inspiration", Sparkles],
    ["/help", "Help", HelpCircle],
    ["/settings", "Settings", Settings],
  ] as const;
  const employeeNav = [
    ["/dashboard", "My Work", LayoutDashboard],
    ["/projects", "Projects", ClipboardList],
    ["/tasks", "Tasks", ListChecks],
    ["/updates", "Updates", MessageSquare],
    ["/calendar", "Calendar", CalendarDays],
    ["/performance", "Performance", Gauge],
    ["/directory", "Directory", Users],
    ["/inspiration", "Inspiration", Sparkles],
    ["/help", "Help", HelpCircle],
  ] as const;
  const nav = user.accessRole === "Admin" ? adminNav : employeeNav;

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-16 lg:pb-0">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-gray-200 bg-white lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-5">
          <img src={logoUrl} alt="Open Limits logo" className="size-10 rounded-md border border-gray-100" />
          <div>
            <p className="font-semibold">Open Limits</p>
            <p className="text-xs text-gray-500">Project Tracker</p>
          </div>
        </div>
        <nav className="grid gap-1 p-3">
          {nav.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600",
                  isActive && "bg-gray-100 text-gray-950",
                )
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur lg:ml-64">
        <div className="flex h-16 items-center justify-between px-4 lg:px-6">
          <div>
            <p className="text-sm font-semibold">{user.name}</p>
            <p className="text-xs text-gray-500">{user.accessRole} · {user.role}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <IconButton
                label="Notifications"
                onClick={() => {
                  setNotificationsOpen((value) => !value);
                  state.markNotificationsRead();
                }}
              >
                <Bell size={17} />
              </IconButton>
              {unread ? (
                <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[var(--alert)] text-[10px] font-bold text-white">
                  {unread}
                </span>
              ) : null}
              {notificationsOpen ? (
                <div className="absolute right-0 mt-2 w-80 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                  <p className="mb-2 text-sm font-semibold">Notifications</p>
                  <div className="grid max-h-80 gap-2 overflow-auto">
                    {state.notifications
                      .filter((notification) => notification.recipientId === user.id)
                      .slice(0, 8)
                      .map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => notification.link && navigate(notification.link)}
                          className="rounded-md bg-gray-50 p-2 text-left text-xs text-gray-700 hover:bg-gray-100"
                        >
                          {notification.message}
                          <span className="mt-1 block text-gray-400">
                            {format(new Date(notification.createdAt), "MMM d, h:mm a")}
                          </span>
                        </button>
                      ))}
                    {!state.notifications.some((notification) => notification.recipientId === user.id) ? (
                      <p className="text-sm text-gray-500">No notifications yet.</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
            <IconButton label="Change password" onClick={() => setPasswordOpen((value) => !value)}>
              <Lock size={17} />
            </IconButton>
            <IconButton label="Log out" onClick={state.logout}>
              <LogOut size={17} />
            </IconButton>
          </div>
        </div>
        {passwordOpen ? (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (nextPassword.length < 6) return;
              setShellStatus({ tone: "info", message: "Updating password..." });
              try {
                await state.changePassword(user.id, nextPassword);
                setNextPassword("");
                setPasswordOpen(false);
                setShellStatus({ tone: "success", message: "Password updated." });
              } catch (error) {
                setShellStatus({ tone: "error", message: error instanceof Error ? error.message : "Could not update password." });
              }
            }}
            className="flex flex-wrap items-end gap-2 border-t border-gray-100 px-4 py-3 lg:px-6"
          >
            <Field label="New password">
              <input
                className={inputClass()}
                type="password"
                value={nextPassword}
                onChange={(e) => setNextPassword(e.target.value)}
                minLength={6}
              />
            </Field>
            <Button type="submit" tone="primary" icon={<Check size={16} />}>
              Update
            </Button>
          </form>
        ) : null}
        {shellStatus ? <div className="border-t border-gray-100 px-4 py-3 lg:px-6"><ActionNotice status={shellStatus} /></div> : null}
      </header>

      <main className="lg:ml-64">
        <div className="mx-auto max-w-7xl px-4 py-5 lg:px-6">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-gray-200 bg-white lg:hidden">
        {nav.slice(0, 5).map(([to, label, Icon]) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "grid flex-1 place-items-center gap-1 px-1 py-2 text-[11px] text-gray-500",
                isActive && "text-[var(--accent)]",
              )
            }
          >
            <Icon size={18} />
            <span className="max-w-full truncate">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-gray-950">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function Dashboard() {
  const state = useAppStore();
  const user = state.accounts.find((account) => account.id === state.sessionAccountId);
  const projects = scopedProjects(state.projects, user);
  const tasks = scopedTasks(state.tasks, user, state.projects);
  const [quickProjectId, setQuickProjectId] = useState("");
  const [quickUpdate, setQuickUpdate] = useState({ done: "", blockers: "", next: "", video: "" });
  const [dashboardStatus, setDashboardStatus] = useState<ActionStatus>();
  const today = todayISO();
  const activeProjects = projects.filter((project) => !["Delivered", "Cancelled"].includes(project.status));
  const overdueTasks = tasks.filter((task) => isOverdue(task.deadline, taskDone(task)));
  const dueToday = tasks.filter((task) => task.deadline === today && !taskDone(task));
  const atRisk = projects.filter(
    (project) =>
      isOverdue(project.deadline, projectDone(project)) ||
      project.status === "On Hold" ||
      Boolean(project.delayBlocker),
  );
  const deliveredWeek = projects.filter((project) => {
    if (!project.deliveredAt) return false;
    const diff = daysLeft(project.deliveredAt);
    return diff !== undefined && diff <= 0 && diff >= -7;
  });
  const noUpdateToday = activeProjects.filter(
    (project) =>
      !state.dailyUpdates.some(
        (update) => update.projectId === project.id && update.date === today,
      ),
  );
  const todaySlots = state.calendarSlots.filter(
    (slot) =>
      slot.date === today &&
      (user?.accessRole === "Admin" || slot.teamMemberId === user?.id),
  );
  const employees = state.accounts.filter((account) => account.accessRole === "Employee" && account.active);
  const updateCoverage = activeProjects.length ? Math.round(((activeProjects.length - noUpdateToday.length) / activeProjects.length) * 100) : 100;
  const workloadRows = employees.map((person) => {
    const personTasks = state.tasks.filter((task) => task.personId === person.id && !taskDone(task));
    const personProjects = state.projects.filter((project) => [project.mainDeveloperId, project.developer2Id, project.designerId].includes(person.id) && !projectDone(project));
    return {
      person,
      tasks: personTasks.length,
      dueToday: personTasks.filter((task) => task.deadline === today).length,
      overdue: personTasks.filter((task) => isOverdue(task.deadline, taskDone(task))).length,
      projects: personProjects.length,
    };
  }).sort((a, b) => b.overdue - a.overdue || b.tasks - a.tasks);
  const employeeUpdateProjects = user?.accessRole === "Employee" ? activeProjects : [];
  const selectedQuickProjectId = quickProjectId || employeeUpdateProjects[0]?.id || "";
  const selectedQuickProject = employeeUpdateProjects.find((project) => project.id === selectedQuickProjectId);
  const quickExisting = state.dailyUpdates.find((update) => update.projectId === selectedQuickProjectId && update.date === today);

  async function saveQuickUpdate() {
    if (!selectedQuickProjectId) return;
    setDashboardStatus({ tone: "info", message: "Saving today update..." });
    try {
      await state.upsertUpdate({
        ...quickExisting,
        projectId: selectedQuickProjectId,
        date: today,
        morningUpdate: [
          quickUpdate.done ? `Done: ${quickUpdate.done}` : "",
          quickUpdate.blockers ? `Blockers: ${quickUpdate.blockers}` : "",
          quickUpdate.next ? `Next: ${quickUpdate.next}` : "",
        ].filter(Boolean).join("\n"),
        eveningUpdate: quickExisting?.eveningUpdate || "",
        videoRecordingLink: quickUpdate.video || quickExisting?.videoRecordingLink || "",
      });
      setQuickUpdate({ done: "", blockers: "", next: "", video: "" });
      setDashboardStatus({ tone: "success", message: `Saved update for ${selectedQuickProject?.projectName || "project"}.` });
    } catch (error) {
      setDashboardStatus({ tone: "error", message: error instanceof Error ? error.message : "Could not save update." });
    }
  }

  function copyWeeklyReport() {
    const lines = [
      "Open Limits Weekly Project Report",
      `Generated: ${format(new Date(), "MMM d, yyyy h:mm a")}`,
      "",
      `Active projects: ${activeProjects.length}`,
      `At risk: ${atRisk.length}`,
      `Overdue tasks: ${overdueTasks.length}`,
      `Missing updates today: ${noUpdateToday.length}`,
      "",
      "Needs attention:",
      ...atRisk.slice(0, 10).map((project) => `- ${project.projectName}: ${project.delayBlocker || project.status || "Review needed"}`),
      "",
      "Workload:",
      ...workloadRows.map((row) => `- ${row.person.name}: ${row.projects} projects, ${row.tasks} open tasks, ${row.overdue} overdue`),
    ];
    void copyText(lines.join("\n"));
    setDashboardStatus({ tone: "success", message: "Weekly report copied." });
  }

  const stats = [
    ["Due today", dueToday.length, CalendarDays],
    ["Active projects", activeProjects.length, ClipboardList],
    ["At risk", atRisk.length, AlertTriangle],
    ["Overdue tasks", overdueTasks.length, Flag],
    ["Delivered this week", deliveredWeek.length, Archive],
    ["No update today", noUpdateToday.length, MessageSquare],
  ] as const;

  return (
    <>
      <PageTitle
        title={user?.accessRole === "Admin" ? "Dashboard" : "My Work"}
        subtitle={user?.accessRole === "Admin" ? "Command center for project health, updates, and team workload." : "Your daily tasks, deadlines, plans, and project update form."}
        action={user?.accessRole === "Admin" ? <Button icon={<Copy size={16} />} onClick={copyWeeklyReport}>Copy weekly report</Button> : null}
      />
      <div className="mb-4"><ActionNotice status={dashboardStatus} /></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map(([label, value, Icon]) => (
          <div key={label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{label}</p>
              <Icon size={18} className="text-gray-400" />
            </div>
            <p className="mono mt-3 text-3xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        {user?.accessRole === "Employee" ? (
          <section className="rounded-lg border border-blue-200 bg-white p-4 shadow-sm xl:col-span-2">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold">Today Update</h2>
                <p className="text-sm text-gray-500">Send your progress, blockers, and next step without opening a long form.</p>
              </div>
              {quickExisting ? <Pill className="bg-emerald-100 text-emerald-800"><Check size={12} /> Submitted today</Pill> : <Pill className="bg-amber-100 text-amber-800">Pending today</Pill>}
            </div>
            {employeeUpdateProjects.length ? (
              <div className="grid gap-3 md:grid-cols-4">
                <Field label="Project">
                  <select className={inputClass()} value={selectedQuickProjectId} onChange={(event) => setQuickProjectId(event.target.value)}>
                    {employeeUpdateProjects.map((project) => <option key={project.id} value={project.id}>{project.projectName}</option>)}
                  </select>
                </Field>
                <Field label="What got done">
                  <input className={inputClass()} value={quickUpdate.done} onChange={(event) => setQuickUpdate({ ...quickUpdate, done: event.target.value })} />
                </Field>
                <Field label="Blocker">
                  <input className={inputClass()} value={quickUpdate.blockers} onChange={(event) => setQuickUpdate({ ...quickUpdate, blockers: event.target.value })} />
                </Field>
                <Field label="Next step">
                  <input className={inputClass()} value={quickUpdate.next} onChange={(event) => setQuickUpdate({ ...quickUpdate, next: event.target.value })} />
                </Field>
                <Field label="Video / proof link">
                  <input className={inputClass()} value={quickUpdate.video} onChange={(event) => setQuickUpdate({ ...quickUpdate, video: event.target.value })} />
                </Field>
                <div className="flex items-end md:col-span-3">
                  <Button tone="primary" icon={<Check size={16} />} onClick={saveQuickUpdate} disabled={!quickUpdate.done && !quickUpdate.blockers && !quickUpdate.next && !quickUpdate.video}>
                    Save today update
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyState title="No active assigned projects" detail="Once an admin assigns you to a project, your quick daily update form will appear here." />
            )}
          </section>
        ) : null}
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Today Rail</h2>
          <div className="grid gap-2">
            {[...todaySlots.map((slot) => ({ kind: "slot", item: slot })), ...dueToday.map((task) => ({ kind: "task", item: task }))].map((entry) =>
              entry.kind === "slot" ? (
                <div key={(entry.item as CalendarSlot).id} className="flex items-center justify-between rounded-md bg-gray-50 p-3 text-sm">
                  <span>
                    <span className="mono text-gray-500">{(entry.item as CalendarSlot).startTime}</span>{" "}
                    {(entry.item as CalendarSlot).taskText || "Planned work"}
                  </span>
                  <Pill className={statusTone((entry.item as CalendarSlot).status || "To Do")}>
                    {(entry.item as CalendarSlot).status || "To Do"}
                  </Pill>
                </div>
              ) : (
                <div key={(entry.item as Task).id} className="flex items-center justify-between rounded-md bg-gray-50 p-3 text-sm">
                  <span>{(entry.item as Task).taskDescription}</span>
                  <Pill className="bg-red-100 text-red-800">
                    <Flag size={12} /> Due today
                  </Pill>
                </div>
              ),
            )}
            {!todaySlots.length && !dueToday.length ? (
              <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-500">Nothing scheduled or due today.</p>
            ) : null}
          </div>
        </section>
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Needs Attention</h2>
          <div className="grid gap-2">
            {atRisk.slice(0, 6).map((project) => (
              <NavLink key={project.id} to="/projects" className="rounded-md bg-gray-50 p-3 text-sm hover:bg-gray-100">
                <span className="font-medium">{project.projectName}</span>
                <span className="block text-xs text-gray-500">{project.delayBlocker || project.status}</span>
              </NavLink>
            ))}
            {!atRisk.length ? <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-500">No at-risk projects.</p> : null}
          </div>
        </section>
        {user?.accessRole === "Admin" ? (
          <>
            <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">Daily Update Coverage</h2>
                <Pill className={updateCoverage >= 80 ? "bg-emerald-100 text-emerald-800" : updateCoverage >= 50 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}>{updateCoverage}%</Pill>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div className={cn("h-2 rounded-full", updateCoverage >= 80 ? "bg-emerald-500" : updateCoverage >= 50 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${updateCoverage}%` }} />
              </div>
              <div className="mt-3 grid gap-2">
                {noUpdateToday.slice(0, 6).map((project) => (
                  <NavLink key={project.id} to="/updates" className="flex items-center justify-between rounded-md bg-gray-50 p-3 text-sm hover:bg-gray-100">
                    <span className="font-medium">{project.projectName}</span>
                    <span className="text-xs text-gray-500">{personName(state.accounts, project.mainDeveloperId || project.designerId)}</span>
                  </NavLink>
                ))}
                {!noUpdateToday.length ? <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-500">All active projects have an update today.</p> : null}
              </div>
            </section>
            <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 font-semibold">Team Workload</h2>
              <div className="grid gap-2">
                {workloadRows.slice(0, 8).map((row) => (
                  <div key={row.person.id} className="rounded-md bg-gray-50 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{row.person.name}</span>
                      <Pill className={row.overdue ? "bg-red-100 text-red-800" : row.tasks > 6 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>
                        {row.overdue ? `${row.overdue} overdue` : `${row.tasks} open`}
                      </Pill>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{row.projects} active projects · {row.dueToday} due today</p>
                  </div>
                ))}
                {!workloadRows.length ? <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-500">No active employees yet.</p> : null}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </>
  );
}

function personName(accounts: Account[], id?: string) {
  return accounts.find((account) => account.id === id)?.name || "Unassigned";
}

function AddProjectForm({ onClose }: { onClose: () => void }) {
  const state = useAppStore();
  const employees = state.accounts.filter((account) => account.accessRole === "Employee" && account.active);
  const [project, setProject] = useState<Partial<Project>>({ status: "Not Started", isPriority: false, projectDocuments: [], projectLinks: [] });
  const statusOptions = Array.from(new Set([...PROJECT_STATUSES, ...state.projects.map((item) => item.status), project.status].filter(Boolean))) as string[];
  const [newMemberFor, setNewMemberFor] = useState<"developer" | "designer" | null>(null);
  const [newMember, setNewMember] = useState({ name: "", username: "", password: "", colorTag: TEAM_COLOR_PALETTE[0] });
  const [newStatus, setNewStatus] = useState("");
  const [addingStatus, setAddingStatus] = useState(false);
  const [linkDraft, setLinkDraft] = useState({ label: "", url: "" });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<ActionStatus>();

  async function createInlineMember() {
    if (!newMemberFor) return;
    if (!newMember.name.trim() || !newMember.username.trim() || !newMember.password.trim()) {
      setStatus({ tone: "error", message: "Name, username, and password are required for a new teammate." });
      return;
    }
    const roleName = newMemberFor === "developer" ? "Developer" : "Designer";
    const roleId = state.jobRoles.find((role) => role.name.toLowerCase().includes(roleName.toLowerCase()))?.id || state.jobRoles[0]?.id || "";
    setSaving(true);
    setStatus({ tone: "info", message: `Creating ${roleName.toLowerCase()} account...` });
    try {
      await state.upsertAccount({
        name: newMember.name,
        username: newMember.username,
        passwordHash: newMember.password,
        accessRole: "Employee",
        jobRoleId: roleId,
        role: roleName,
        colorTag: newMember.colorTag,
        active: true,
      });
      const created = useAppStore.getState().accounts.find((account) => account.username === newMember.username.trim().toLowerCase());
      if (created) {
        setProject((current) => ({
          ...current,
          [newMemberFor === "developer" ? "mainDeveloperId" : "designerId"]: created.id,
        }));
      }
      setNewMember({ name: "", username: "", password: "", colorTag: TEAM_COLOR_PALETTE[0] });
      setNewMemberFor(null);
      setStatus({ tone: "success", message: `${roleName} account created and selected.` });
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : "Could not create teammate." });
    } finally {
      setSaving(false);
    }
  }

  async function addDocuments(files: FileList | null) {
    if (!files?.length) return;
    const documents = await Promise.all(Array.from(files).map((file) => new Promise<ProjectDocument>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        id: makeId("doc"),
        name: file.name,
        type: file.type || file.name.split(".").pop() || "file",
        size: file.size,
        dataUrl: String(reader.result || ""),
        addedAt: new Date().toISOString(),
      });
      reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
      reader.readAsDataURL(file);
    })));
    setProject((current) => ({
      ...current,
      projectDocuments: [...(current.projectDocuments || []), ...documents],
    }));
  }

  function addNamedLink() {
    if (!linkDraft.url.trim()) return;
    setProject((current) => ({
      ...current,
      projectLinks: [
        ...(current.projectLinks || []),
        { id: makeId("link"), label: linkDraft.label.trim() || "Project link", url: linkDraft.url.trim() },
      ],
    }));
    setLinkDraft({ label: "", url: "" });
  }

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        setStatus({ tone: "info", message: "Creating project..." });
        try {
          await state.createProject(project);
          setStatus({ tone: "success", message: "Project created." });
          onClose();
        } catch (error) {
          setStatus({ tone: "error", message: error instanceof Error ? error.message : "Could not create project." });
        } finally {
          setSaving(false);
        }
      }}
      className="mb-5 grid gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm lg:grid-cols-3"
    >
      <div className="lg:col-span-3"><ActionNotice status={status} /></div>
      <Field label="Project">
        <input className={inputClass()} required onChange={(e) => setProject({ ...project, projectName: e.target.value })} />
      </Field>
      <Field label="Client username">
        <input className={inputClass()} onChange={(e) => setProject({ ...project, clientUsername: e.target.value })} />
      </Field>
      <Field label="Deadline">
        <input className={inputClass()} type="date" onChange={(e) => setProject({ ...project, deadline: e.target.value })} />
      </Field>
      <Field label="Developer">
        <select
          className={inputClass()}
          value={project.mainDeveloperId || ""}
          onChange={(e) => {
            if (e.target.value === "__add_new") {
              setNewMemberFor("developer");
              return;
            }
            setProject({ ...project, mainDeveloperId: e.target.value || undefined });
          }}
        >
          <option value="">Unassigned</option>
          <option value="__add_new">+ Add new developer</option>
          {employees.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
        </select>
      </Field>
      <Field label="Designer">
        <select
          className={inputClass()}
          value={project.designerId || ""}
          onChange={(e) => {
            if (e.target.value === "__add_new") {
              setNewMemberFor("designer");
              return;
            }
            setProject({ ...project, designerId: e.target.value || undefined });
          }}
        >
          <option value="">Unassigned</option>
          <option value="__add_new">+ Add new designer</option>
          {employees.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
        </select>
      </Field>
      <Field label="Status">
        <select
          className={inputClass()}
          value={project.status}
          onChange={(e) => {
            if (e.target.value === "__add_status") {
              setNewStatus("");
              setAddingStatus(true);
              return;
            }
            setAddingStatus(false);
            setProject({ ...project, status: e.target.value as ProjectStatus });
          }}
        >
          {statusOptions.filter(Boolean).map((status) => <option key={status}>{status}</option>)}
          <option value="__add_status">+ Add new status</option>
        </select>
      </Field>
      {newMemberFor ? (
        <div className="grid gap-3 rounded-md border border-blue-100 bg-blue-50 p-3 lg:col-span-3 lg:grid-cols-4">
          <Field label={`New ${newMemberFor}`}>
            <input className={inputClass()} value={newMember.name} onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} placeholder="Full name" />
          </Field>
          <Field label="Username">
            <input className={inputClass()} value={newMember.username} onChange={(e) => setNewMember({ ...newMember, username: e.target.value })} placeholder="login ID" />
          </Field>
          <Field label="Password">
            <input className={inputClass()} value={newMember.password} onChange={(e) => setNewMember({ ...newMember, password: e.target.value })} placeholder="temporary password" />
          </Field>
          <div className="grid gap-1 text-xs font-medium text-gray-600 lg:col-span-3">
            Color tag
            <ColorTagPicker value={newMember.colorTag} onChange={(colorTag) => setNewMember({ ...newMember, colorTag })} />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={createInlineMember} tone="primary" disabled={saving}>Create</Button>
            <Button onClick={() => setNewMemberFor(null)}>Cancel</Button>
          </div>
        </div>
      ) : null}
      {addingStatus ? (
        <div className="grid gap-3 rounded-md border border-amber-100 bg-amber-50 p-3 lg:col-span-3 lg:grid-cols-[1fr_auto_auto]">
          <Field label="New status name">
            <input className={inputClass()} value={newStatus} onChange={(e) => setNewStatus(e.target.value)} placeholder="For example: Client Review" />
          </Field>
          <div className="flex items-end">
            <Pill className={statusTone(newStatus || "Custom")}>{newStatus || "Color preview"}</Pill>
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => {
                if (!newStatus.trim()) return;
                setProject({ ...project, status: newStatus.trim() });
                setAddingStatus(false);
                setNewStatus("");
              }}
              tone="primary"
            >
              Use status
            </Button>
          </div>
        </div>
      ) : null}
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input type="checkbox" onChange={(e) => setProject({ ...project, isPriority: e.target.checked })} />
        Priority
      </label>
      <div className="grid gap-3 rounded-md border border-gray-100 bg-gray-50 p-3 lg:col-span-3 lg:grid-cols-[1fr_1fr_auto]">
        <Field label="Link name">
          <input className={inputClass()} value={linkDraft.label} onChange={(e) => setLinkDraft({ ...linkDraft, label: e.target.value })} placeholder="Client brief, staging, video..." />
        </Field>
        <Field label="URL">
          <input className={inputClass()} value={linkDraft.url} onChange={(e) => setLinkDraft({ ...linkDraft, url: e.target.value })} placeholder="https://" />
        </Field>
        <div className="flex items-end">
          <Button onClick={addNamedLink} icon={<Plus size={16} />}>Add link</Button>
        </div>
        {(project.projectLinks || []).length ? (
          <div className="flex flex-wrap gap-2 lg:col-span-3">
            {(project.projectLinks || []).map((link) => (
              <Pill key={link.id} className="bg-white text-gray-700">
                {link.label}
                <button type="button" onClick={() => setProject({ ...project, projectLinks: (project.projectLinks || []).filter((item) => item.id !== link.id) })} className="ml-1 text-gray-400">x</button>
              </Pill>
            ))}
          </div>
        ) : null}
      </div>
      <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3 lg:col-span-3">
        <Field label="Project documents">
          <input className={cn(inputClass(), "h-auto py-2")} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.fig" onChange={(event) => void addDocuments(event.target.files)} />
        </Field>
        {(project.projectDocuments || []).length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {(project.projectDocuments || []).map((document) => (
              <Pill key={document.id} className="bg-white text-gray-700">
                <FileText size={13} /> {document.name}
                <button type="button" onClick={() => setProject({ ...project, projectDocuments: (project.projectDocuments || []).filter((item) => item.id !== document.id) })} className="ml-1 text-gray-400">x</button>
              </Pill>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex items-end gap-2 lg:col-span-2">
        <Button type="submit" tone="primary" icon={<Plus size={16} />} disabled={saving}>{saving ? "Adding..." : "Add project"}</Button>
        <Button onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
}

function CommentsPanel({ entityType, entityId }: { entityType: "project" | "task"; entityId: string }) {
  const state = useAppStore();
  const [text, setText] = useState("");
  const comments = state.comments.filter((comment) => comment.entityType === entityType && comment.entityId === entityId);
  const logs = state.activityLog.filter((log) => log.entityType === entityType && log.entityId === entityId);
  return (
    <details className="mt-2 rounded-md bg-gray-50 p-3 text-sm">
      <summary className="cursor-pointer font-medium text-gray-700">Comments & activity</summary>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          state.createComment(entityType, entityId, text);
          setText("");
        }}
        className="mt-3 flex gap-2"
      >
        <input className={cn(inputClass(), "flex-1")} value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment" />
        <Button type="submit" tone="primary" icon={<Plus size={16} />}>Add</Button>
      </form>
      <div className="mt-3 grid gap-2">
        {comments.map((comment) => (
          <p key={comment.id} className="rounded-md bg-white p-2 text-gray-700">
            <span className="font-medium">{personName(state.accounts, comment.authorId)}:</span> {comment.text}
          </p>
        ))}
        {logs.slice(0, 4).map((log) => (
          <p key={log.id} className="text-xs text-gray-500">
            {log.action} · {format(new Date(log.createdAt), "MMM d, h:mm a")}
          </p>
        ))}
      </div>
    </details>
  );
}

function ChecklistEditor({
  value,
  onChange,
}: {
  value: ChecklistItem[];
  onChange: (next: ChecklistItem[]) => void;
}) {
  const [text, setText] = useState("");
  return (
    <div className="grid gap-2">
      {value.map((item, index) => (
        <label key={`${item.text}-${index}`} className="flex items-center gap-2 text-xs text-gray-700">
          <input
            type="checkbox"
            checked={item.done}
            onChange={(e) =>
              onChange(value.map((entry, idx) => idx === index ? { ...entry, done: e.target.checked } : entry))
            }
          />
          <span className={item.done ? "line-through text-gray-400" : ""}>{item.text}</span>
        </label>
      ))}
      <div className="flex gap-2">
        <input className={cn(inputClass(), "h-8 flex-1 text-xs")} value={text} onChange={(e) => setText(e.target.value)} placeholder="Checklist item" />
        <IconButton
          label="Add checklist item"
          onClick={() => {
            if (!text.trim()) return;
            onChange([...value, { text: text.trim(), done: false }]);
            setText("");
          }}
        >
          <Plus size={14} />
        </IconButton>
      </div>
    </div>
  );
}

type ProjectFilter = "all" | "delivered" | "overdue" | "soon" | "unassigned";

function projectTeam(project: Project, accounts: Account[]) {
  return [
    { label: "Project Manager", id: project.mainDeveloperId || project.designerId },
    { label: "Developer", id: project.mainDeveloperId },
    { label: "Developer 2", id: project.developer2Id },
    { label: "Designer", id: project.designerId },
  ].filter((member, index, list) => {
    if (!member.id) return false;
    return list.findIndex((item) => item.id === member.id && item.label === member.label) === index;
  }).map((member) => ({
    ...member,
    name: personName(accounts, member.id),
    color: accounts.find((account) => account.id === member.id)?.colorTag || "#5B5FEF",
  }));
}

function projectHealth(project: Project) {
  const left = daysLeft(project.deadline);
  const overdue = isOverdue(project.deadline, projectDone(project));
  if (project.status === "Delivered") return { label: "Delivered", className: statusTone("Delivered") };
  if (overdue) return { label: "Overdue", className: statusTone("Overdue") };
  if (left !== undefined && left <= 3) return { label: "Close deadline", className: "bg-orange-100 text-orange-800" };
  if (!project.mainDeveloperId && !project.designerId && !project.developer2Id) return { label: "Unassigned", className: "bg-slate-100 text-slate-700" };
  return { label: "Healthy", className: "bg-emerald-100 text-emerald-800" };
}

function Projects() {
  const state = useAppStore();
  const user = state.accounts.find((account) => account.id === state.sessionAccountId);
  const isAdmin = user?.accessRole === "Admin";
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState("");
  const [projectStatus, setProjectStatus] = useState<ActionStatus>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeFilter = (searchParams.get("filter") as ProjectFilter) || "all";
  const baseProjects = scopedProjects(state.projects, user);
  const projects = baseProjects.filter((project) => {
    if (activeFilter === "delivered") return project.status === "Delivered";
    if (activeFilter === "overdue") return isOverdue(project.deadline, projectDone(project));
    if (activeFilter === "soon") {
      const left = daysLeft(project.deadline);
      return left !== undefined && left >= 0 && left <= 3 && !projectDone(project);
    }
    if (activeFilter === "unassigned") {
      return !project.mainDeveloperId && !project.developer2Id && !project.designerId;
    }
    return true;
  }).filter((project) => {
    const haystack = `${project.projectName} ${project.clientUsername} ${project.status} ${project.tags.join(" ")}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });
  const filters: Array<{ id: ProjectFilter; label: string; count: number; icon: ReactNode }> = [
    { id: "all", label: "All", count: baseProjects.length, icon: <ClipboardList size={15} /> },
    { id: "delivered", label: "Delivered", count: baseProjects.filter((project) => project.status === "Delivered").length, icon: <Archive size={15} /> },
    { id: "overdue", label: "Overdue", count: baseProjects.filter((project) => isOverdue(project.deadline, projectDone(project))).length, icon: <AlertTriangle size={15} /> },
    { id: "soon", label: "Close deadline", count: baseProjects.filter((project) => {
      const left = daysLeft(project.deadline);
      return left !== undefined && left >= 0 && left <= 3 && !projectDone(project);
    }).length, icon: <Flag size={15} /> },
    { id: "unassigned", label: "Not assigned", count: baseProjects.filter((project) => !project.mainDeveloperId && !project.developer2Id && !project.designerId).length, icon: <Users size={15} /> },
  ];

  async function patchProject(project: Project, patch: Partial<Project>) {
    setProjectStatus({ tone: "info", message: "Saving project..." });
    try {
      await state.updateProject(project.id, patch);
      setProjectStatus({ tone: "success", message: "Project saved." });
    } catch (error) {
      setProjectStatus({ tone: "error", message: error instanceof Error ? error.message : "Could not update project." });
    }
  }

  async function deleteProject(project: Project) {
    if (!confirm(`Delete "${project.projectName}"? This cannot be undone.`)) return;
    setProjectStatus({ tone: "info", message: "Deleting project..." });
    try {
      await state.deleteProject(project.id);
      setProjectStatus({ tone: "success", message: "Project deleted." });
    } catch (error) {
      setProjectStatus({ tone: "error", message: error instanceof Error ? error.message : "Could not delete project." });
    }
  }

  return (
    <>
      <PageTitle
        title="Projects"
        subtitle={isAdmin ? "Project cards show ownership, urgency, team roles, and completion at a glance." : "Only projects where you are assigned are visible here."}
        action={
          <div className="flex gap-2">
            {isAdmin ? (
              <Button tone="primary" icon={<Plus size={16} />} onClick={() => setShowAdd(true)}>
                Add Project
              </Button>
            ) : null}
          </div>
        }
      />
      {showAdd ? <AddProjectForm onClose={() => setShowAdd(false)} /> : null}
      <div className="mb-4"><ActionNotice status={projectStatus} /></div>
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
        <Search size={16} className="text-gray-400" />
        <input className="h-9 flex-1 bg-transparent text-sm outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search project, client, status, or tag" />
      </div>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setSearchParams(filter.id === "all" ? {} : { filter: filter.id })}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition",
              activeFilter === filter.id
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
            )}
          >
            {filter.icon}
            {filter.label}
            <span className={cn("mono rounded px-1.5 py-0.5 text-xs", activeFilter === filter.id ? "bg-white/20" : "bg-gray-100")}>{filter.count}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects
          .sort((a, b) => Number(b.isPriority) - Number(a.isPriority) || Number(isOverdue(b.deadline, projectDone(b))) - Number(isOverdue(a.deadline, projectDone(a))) || (daysLeft(a.deadline) ?? 9999) - (daysLeft(b.deadline) ?? 9999))
          .map((project) => (
            <ProjectCard key={project.id} project={project} onPatch={patchProject} onDelete={deleteProject} />
          ))}
      </div>
      {!projects.length ? (
        <EmptyState
          title="No projects found"
          detail={isAdmin ? "Create a project, assign at least one owner, add a deadline, and checklist items so progress and risk can be tracked." : "No assigned projects match this filter yet."}
          action={isAdmin ? <Button tone="primary" icon={<Plus size={16} />} onClick={() => setShowAdd(true)}>Add Project</Button> : null}
        />
      ) : null}
    </>
  );
}

function ProjectCard({
  project,
  onPatch,
  onDelete,
}: {
  project: Project;
  onPatch: (project: Project, patch: Partial<Project>) => void | Promise<void>;
  onDelete: (project: Project) => void | Promise<void>;
}) {
  const state = useAppStore();
  const navigate = useNavigate();
  const user = state.accounts.find((account) => account.id === state.sessionAccountId);
  const isAdmin = user?.accessRole === "Admin";
  const left = daysLeft(project.deadline);
  const overdue = isOverdue(project.deadline, projectDone(project));
  const progress = checklistPercent(project.checklist);
  const health = projectHealth(project);
  const team = projectTeam(project, state.accounts);
  const openTasks = state.tasks.filter((task) => task.projectId === project.id && !taskDone(task)).length;
  const links = projectLinks(project).slice(0, 3);

  return (
    <article className="flex min-h-[260px] flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-1">
            <Pill className={health.className}>{health.label}</Pill>
            {project.isPriority ? <Pill className="bg-orange-100 text-orange-800"><Flag size={12} /> Priority</Pill> : null}
          </div>
          <h2 className="truncate text-base font-semibold leading-snug">{project.projectName}</h2>
          <p className="mt-1 text-sm text-gray-500">@{project.clientUsername || "client"}</p>
        </div>
        {isAdmin ? (
          <IconButton label="Delete project" tone="danger" onClick={() => onDelete(project)}>
            <Trash2 size={16} />
          </IconButton>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 text-sm">
        <div>
          <p className="text-xs text-gray-500">Project manager</p>
          <p className="mt-1 truncate text-sm font-semibold">{personName(state.accounts, project.mainDeveloperId || project.designerId)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Deadline</p>
          <p className={cn("mono mt-1 text-sm font-semibold", overdue && "text-red-600")}>
            {project.deadline || "No date"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Time left</p>
          <p className={cn("mt-1 text-sm font-semibold", overdue && "text-red-600")}>
            {left === undefined ? "Not set" : overdue ? "Overdue" : `${left} days`}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Status</p>
          <Pill className={cn("mt-1", statusTone(project.status))}>{project.status}</Pill>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">Completed</span>
          <span className="mono font-semibold">{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100">
          <div
            className={cn("h-2 rounded-full", progress >= 70 ? "bg-emerald-500" : progress >= 35 ? "bg-blue-500" : "bg-orange-500")}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Pill className="bg-slate-100 text-slate-700">{team.length || 0} people</Pill>
        <Pill className="bg-blue-50 text-blue-700">{openTasks} open tasks</Pill>
        <Pill className="bg-gray-100 text-gray-700">{project.projectDocuments?.length || 0} files</Pill>
        {links.map((link) => (
          <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
            <LinkIcon size={13} /> {link.label}
          </a>
        ))}
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Team</p>
        <div className="flex -space-x-2">
          {team.slice(0, 4).map((member) => (
            <span
              key={`${member.label}-${member.id}`}
              title={`${member.name} · ${member.label}`}
              className="inline-flex size-8 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white"
              style={{ background: member.color }}
            >
              {member.name.slice(0, 1)}
            </span>
          ))}
          {!team.length ? <span className="text-sm text-gray-500">Unassigned</span> : null}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <select className={cn(inputClass(), "max-w-[190px]")} value={project.status} onChange={(e) => onPatch(project, { status: e.target.value as ProjectStatus })}>
          {Array.from(new Set([...PROJECT_STATUSES, project.status])).map((status) => <option key={status}>{status}</option>)}
        </select>
        <Button tone="primary" icon={<ExternalLink size={15} />} onClick={() => navigate(`/projects/${project.id}`)}>
          Open detail
        </Button>
      </div>
    </article>
  );
}

function projectLinks(project: Project): ProjectLink[] {
  return [
    project.previewLink ? { id: "preview", label: "Preview", url: project.previewLink } : undefined,
    project.figmaLink ? { id: "figma", label: "Figma", url: project.figmaLink } : undefined,
    project.driveAssetsLink ? { id: "assets", label: "Assets", url: project.driveAssetsLink } : undefined,
    project.briefDocLink ? { id: "brief", label: "Brief", url: project.briefDocLink } : undefined,
    project.clientChatsLink ? { id: "chat", label: "Client chat", url: project.clientChatsLink } : undefined,
    ...(project.projectLinks || []),
  ].filter((link): link is ProjectLink => Boolean(link?.url));
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ProjectChat({ projectId }: { projectId: string }) {
  const state = useAppStore();
  const user = state.accounts.find((account) => account.id === state.sessionAccountId);
  const isAdmin = user?.accessRole === "Admin";
  const [commentText, setCommentText] = useState("");
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const comments = state.comments
    .filter((comment) => comment.entityType === "project" && comment.entityId === projectId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const topLevel = comments.filter((comment) => !comment.parentId);
  const emojis = ["👍", "✅", "👀", "🚧", "❤️"];

  async function submitComment(parentId?: string) {
    const text = parentId ? replyText[parentId] : commentText;
    if (!text?.trim()) return;
    await state.createComment("project", projectId, text, parentId);
    if (parentId) setReplyText({ ...replyText, [parentId]: "" });
    else setCommentText("");
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquare size={18} className="text-[var(--accent)]" />
        <h2 className="text-base font-semibold">Project conversation</h2>
      </div>
      {isAdmin ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submitComment();
          }}
          className="mb-4 flex flex-col gap-2 sm:flex-row"
        >
          <input className={cn(inputClass(), "flex-1")} value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add an admin note for the team" />
          <Button type="submit" tone="primary" icon={<Plus size={16} />}>Post</Button>
        </form>
      ) : null}
      <div className="grid gap-3">
        {topLevel.map((comment) => {
          const replies = comments.filter((item) => item.parentId === comment.id);
          const reactionCounts = Object.entries(comment.reactions || {}).reduce<Record<string, number>>((acc, [, emoji]) => {
            acc[emoji] = (acc[emoji] || 0) + 1;
            return acc;
          }, {});
          return (
            <div key={comment.id} className="rounded-lg bg-gray-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{personName(state.accounts, comment.authorId)}</p>
                  <p className="mt-1 text-sm text-gray-700">{comment.text}</p>
                  <p className="mt-1 text-xs text-gray-400">{format(new Date(comment.createdAt), "MMM d, h:mm a")}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => state.reactToComment(comment.id, emoji)}
                    className={cn(
                      "rounded-md border px-2 py-1 text-xs",
                      comment.reactions?.[user?.id || ""] === emoji ? "border-[var(--accent)] bg-blue-50" : "border-gray-200 bg-white",
                    )}
                  >
                    {emoji} {reactionCounts[emoji] || ""}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid gap-2 border-l-2 border-gray-200 pl-3">
                {replies.map((reply) => (
                  <div key={reply.id} className="rounded-md bg-white p-2 text-sm">
                    <span className="font-semibold">{personName(state.accounts, reply.authorId)}:</span> {reply.text}
                  </div>
                ))}
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitComment(comment.id);
                  }}
                  className="flex flex-col gap-2 sm:flex-row"
                >
                  <input className={cn(inputClass(), "flex-1")} value={replyText[comment.id] || ""} onChange={(e) => setReplyText({ ...replyText, [comment.id]: e.target.value })} placeholder="Reply to this note" />
                  <Button type="submit" icon={<Reply size={15} />}>Reply</Button>
                </form>
              </div>
            </div>
          );
        })}
        {!topLevel.length ? <EmptyState title="No comments yet" detail={isAdmin ? "Post the first project note so the team can reply or react." : "The admin has not posted a project note yet."} /> : null}
      </div>
    </section>
  );
}

function ProjectDetail() {
  const { projectId } = useParams();
  const state = useAppStore();
  const user = state.accounts.find((account) => account.id === state.sessionAccountId);
  const isAdmin = user?.accessRole === "Admin";
  const project = state.projects.find((item) => item.id === projectId);
  const [status, setStatus] = useState<ActionStatus>();
  const [linkDraft, setLinkDraft] = useState({ label: "", url: "" });
  const employees = state.accounts.filter((account) => account.accessRole === "Employee" && account.active);
  const navigate = useNavigate();

  if (!project || !scopedProjects(state.projects, user).some((item) => item.id === project.id)) {
    return <EmptyState title="Project not found" detail="This project either does not exist or is not assigned to your account." />;
  }

  const selectedProject = project;
  const tasks = state.tasks.filter((task) => task.projectId === selectedProject.id);
  const progress = checklistPercent(selectedProject.checklist);
  const team = projectTeam(selectedProject, state.accounts);

  async function patch(patchValue: Partial<Project>) {
    setStatus({ tone: "info", message: "Saving project..." });
    try {
      await state.updateProject(selectedProject.id, patchValue);
      setStatus({ tone: "success", message: "Project saved." });
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : "Could not save project." });
    }
  }

  async function addDocuments(files: FileList | null) {
    if (!files?.length) return;
    const documents = await Promise.all(Array.from(files).map((file) => new Promise<ProjectDocument>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        id: makeId("doc"),
        name: file.name,
        type: file.type || file.name.split(".").pop() || "file",
        size: file.size,
        dataUrl: String(reader.result || ""),
        addedAt: new Date().toISOString(),
      });
      reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
      reader.readAsDataURL(file);
    })));
    await patch({ projectDocuments: [...(selectedProject.projectDocuments || []), ...documents] });
  }

  function addNamedLink() {
    if (!linkDraft.url.trim()) return;
    void patch({
      projectLinks: [
        ...(selectedProject.projectLinks || []),
        { id: makeId("link"), label: linkDraft.label.trim() || "Project link", url: linkDraft.url.trim() },
      ],
    });
    setLinkDraft({ label: "", url: "" });
  }

  return (
    <>
      <PageTitle
        title={project.projectName}
        subtitle={`${project.clientUsername || "No client"} · ${team.length || 0} assigned · ${tasks.length} tasks`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => navigate("/projects")}>Back to Projects</Button>
            <Pill className={statusTone(project.status)}>{project.status}</Pill>
          </div>
        }
      />
      <div className="mb-4"><ActionNotice status={status} /></div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-md bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Completion</p>
              <p className="mt-1 text-2xl font-bold">{progress}%</p>
              <div className="mt-2 h-2 rounded-full bg-gray-200"><div className="h-2 rounded-full bg-[var(--accent)]" style={{ width: `${progress}%` }} /></div>
            </div>
            <div className="rounded-md bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Deadline</p>
              <p className={cn("mt-1 text-lg font-semibold", isOverdue(project.deadline, projectDone(project)) && "text-red-600")}>{project.deadline || "Not set"}</p>
            </div>
            <div className="rounded-md bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Health</p>
              <Pill className={cn("mt-2", projectHealth(project).className)}>{projectHealth(project).label}</Pill>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {isAdmin ? (
              <>
                <Field label="Developer">
                  <select className={inputClass()} value={project.mainDeveloperId || ""} onChange={(e) => void patch({ mainDeveloperId: e.target.value || undefined })}>
                    <option value="">Unassigned</option>
                    {employees.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                  </select>
                </Field>
                <Field label="Designer">
                  <select className={inputClass()} value={project.designerId || ""} onChange={(e) => void patch({ designerId: e.target.value || undefined })}>
                    <option value="">Unassigned</option>
                    {employees.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                  </select>
                </Field>
                <Field label="Deadline">
                  <input className={inputClass()} type="date" value={project.deadline || ""} onChange={(e) => void patch({ deadline: e.target.value })} />
                </Field>
              </>
            ) : null}
            <Field label="Status">
              <select className={inputClass()} value={project.status} onChange={(e) => void patch({ status: e.target.value })}>
                {Array.from(new Set([...PROJECT_STATUSES, project.status])).map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            {project.status === "On Hold" ? (
              <Field label="Blocker">
                <input className={inputClass()} value={project.delayBlocker || ""} onChange={(e) => void patch({ delayBlocker: e.target.value })} />
              </Field>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div>
              <h2 className="mb-2 text-sm font-semibold">Checklist</h2>
              <ChecklistEditor value={project.checklist} onChange={(checklist) => void patch({ checklist })} />
            </div>
            <Field label="Latest note">
              <textarea className={textareaClass()} value={project.notesLastUpdate || ""} onChange={(e) => void patch({ notesLastUpdate: e.target.value })} />
            </Field>
          </div>
        </section>

        <section className="grid gap-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-base font-semibold">Links</h2>
            <div className="grid gap-2">
              {projectLinks(project).map((link) => (
                <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
                  <span className="truncate">{link.label}</span>
                  <ExternalLink size={14} />
                </a>
              ))}
              {!projectLinks(project).length ? <p className="text-sm text-gray-500">No links added yet.</p> : null}
            </div>
            {isAdmin ? (
              <div className="mt-3 grid gap-2">
                {(project.projectLinks || []).map((link) => (
                  <div key={link.id} className="grid gap-2 sm:grid-cols-[0.7fr_1fr_auto]">
                    <input className={inputClass()} value={link.label} onChange={(e) => void patch({ projectLinks: (project.projectLinks || []).map((item) => item.id === link.id ? { ...item, label: e.target.value } : item) })} />
                    <input className={inputClass()} value={link.url} onChange={(e) => void patch({ projectLinks: (project.projectLinks || []).map((item) => item.id === link.id ? { ...item, url: e.target.value } : item) })} />
                    <IconButton label="Remove link" tone="danger" onClick={() => void patch({ projectLinks: (project.projectLinks || []).filter((item) => item.id !== link.id) })}><Trash2 size={15} /></IconButton>
                  </div>
                ))}
                <div className="grid gap-2 sm:grid-cols-[0.7fr_1fr_auto]">
                  <input className={inputClass()} value={linkDraft.label} onChange={(e) => setLinkDraft({ ...linkDraft, label: e.target.value })} placeholder="Link name" />
                  <input className={inputClass()} value={linkDraft.url} onChange={(e) => setLinkDraft({ ...linkDraft, url: e.target.value })} placeholder="https://" />
                  <IconButton label="Add link" tone="primary" onClick={addNamedLink}><Plus size={15} /></IconButton>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-base font-semibold">Documents</h2>
            <div className="grid gap-2">
              {(project.projectDocuments || []).map((document) => (
                <div key={document.id} className="flex items-center justify-between gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{document.name}</p>
                    <p className="text-xs text-gray-500">{fileSize(document.size)}</p>
                  </div>
                  <div className="flex gap-2">
                    <a href={document.dataUrl} download={document.name} className="inline-flex size-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700"><FileText size={15} /></a>
                    {isAdmin ? <IconButton label="Remove document" tone="danger" onClick={() => void patch({ projectDocuments: (project.projectDocuments || []).filter((item) => item.id !== document.id) })}><Trash2 size={15} /></IconButton> : null}
                  </div>
                </div>
              ))}
              {!project.projectDocuments?.length ? <p className="text-sm text-gray-500">No documents attached yet.</p> : null}
            </div>
            {isAdmin ? (
              <input className={cn(inputClass(), "mt-3 h-auto w-full py-2")} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.fig" onChange={(event) => void addDocuments(event.target.files)} />
            ) : null}
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">Project tasks</h2>
          <div className="grid gap-2">
            {tasks.map((task) => (
              <div key={task.id} className="rounded-md border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{task.taskDescription}</p>
                  <Pill className={statusTone(task.status)}>{task.status}</Pill>
                </div>
                <p className="mt-1 text-xs text-gray-500">{personName(state.accounts, task.personId)} · {task.deadline || "No deadline"}</p>
              </div>
            ))}
            {!tasks.length ? <p className="text-sm text-gray-500">No tasks connected to this project yet.</p> : null}
          </div>
        </section>
        <ProjectChat projectId={project.id} />
      </div>
    </>
  );
}

function AddTaskForm({ onClose }: { onClose: () => void }) {
  const state = useAppStore();
  const employees = state.accounts.filter((account) => account.accessRole === "Employee" && account.active);
  const [task, setTask] = useState<Partial<Task>>({ priority: "Medium", status: "To Do", personId: employees[0]?.id });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<ActionStatus>();
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        setStatus({ tone: "info", message: "Creating task..." });
        try {
          await state.createTask(task);
          setStatus({ tone: "success", message: "Task created." });
          onClose();
        } catch (error) {
          setStatus({ tone: "error", message: error instanceof Error ? error.message : "Could not create task." });
        } finally {
          setSaving(false);
        }
      }}
      className="mb-5 grid gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-3"
    >
      <div className="md:col-span-3"><ActionNotice status={status} /></div>
      <Field label="Task">
        <input className={inputClass()} required onChange={(e) => setTask({ ...task, taskDescription: e.target.value })} />
      </Field>
      <Field label="Person">
        <select className={inputClass()} value={task.personId} onChange={(e) => setTask({ ...task, personId: e.target.value })}>
          {employees.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
        </select>
      </Field>
      <Field label="Project">
        <select className={inputClass()} onChange={(e) => setTask({ ...task, projectId: e.target.value, clientOrStore: state.projects.find((project) => project.id === e.target.value)?.clientUsername || task.clientOrStore })}>
          <option value="">No project</option>
          {state.projects.map((project) => <option key={project.id} value={project.id}>{project.projectName}</option>)}
        </select>
      </Field>
      <Field label="Client or store">
        <input className={inputClass()} onChange={(e) => setTask({ ...task, clientOrStore: e.target.value })} />
      </Field>
      <Field label="Deadline">
        <input className={inputClass()} type="date" onChange={(e) => setTask({ ...task, deadline: e.target.value })} />
      </Field>
      <Field label="Priority">
        <select className={inputClass()} value={task.priority} onChange={(e) => setTask({ ...task, priority: e.target.value as Priority })}>
          {PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}
        </select>
      </Field>
      <div className="flex items-end gap-2 md:col-span-3">
        <Button type="submit" tone="primary" icon={<Plus size={16} />} disabled={saving}>{saving ? "Adding..." : "Add task"}</Button>
        <Button onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
}

function Tasks() {
  const state = useAppStore();
  const user = state.accounts.find((account) => account.id === state.sessionAccountId);
  const isAdmin = user?.accessRole === "Admin";
  const [showAdd, setShowAdd] = useState(false);
  const [taskFilter, setTaskFilter] = useState<"all" | TaskStatus | "overdue" | "today" | "soon">("all");
  const [query, setQuery] = useState("");
  const [taskStatus, setTaskStatus] = useState<ActionStatus>();
  const tasks = scopedTasks(state.tasks, user, state.projects);
  const visibleTasks = tasks.filter((task) => {
    if (taskFilter === "all") return true;
    if (taskFilter === "overdue") return isOverdue(task.deadline, taskDone(task));
    if (taskFilter === "today") return task.deadline === todayISO() && !taskDone(task);
    if (taskFilter === "soon") {
      const left = daysLeft(task.deadline);
      return left !== undefined && left >= 0 && left <= 3 && !taskDone(task);
    }
    return task.status === taskFilter;
  }).filter((task) => {
    const project = state.projects.find((item) => item.id === task.projectId);
    const owner = personName(state.accounts, task.personId);
    return `${task.taskDescription} ${task.clientOrStore} ${project?.projectName || ""} ${owner} ${task.status}`.toLowerCase().includes(query.toLowerCase());
  });
  const filterOptions: Array<{ id: "all" | TaskStatus | "overdue" | "today" | "soon"; label: string; count: number }> = [
    { id: "all", label: "All", count: tasks.length },
    { id: "today", label: "Due today", count: tasks.filter((task) => task.deadline === todayISO() && !taskDone(task)).length },
    { id: "soon", label: "Due soon", count: tasks.filter((task) => {
      const left = daysLeft(task.deadline);
      return left !== undefined && left >= 0 && left <= 3 && !taskDone(task);
    }).length },
    { id: "overdue", label: "Overdue", count: tasks.filter((task) => isOverdue(task.deadline, taskDone(task))).length },
    ...TASK_STATUSES.map((status) => ({
      id: status,
      label: status,
      count: tasks.filter((task) => task.status === status).length,
    })),
  ];

  async function patchTask(task: Task, patch: Partial<Task>) {
    setTaskStatus({ tone: "info", message: "Saving task..." });
    try {
      await state.updateTask(task.id, patch);
      setTaskStatus({ tone: "success", message: "Task saved." });
    } catch (error) {
      setTaskStatus({ tone: "error", message: error instanceof Error ? error.message : "Could not update task." });
    }
  }

  async function deleteTask(task: Task) {
    if (!confirm(`Delete "${task.taskDescription}"? This cannot be undone.`)) return;
    setTaskStatus({ tone: "info", message: "Deleting task..." });
    try {
      await state.deleteTask(task.id);
      setTaskStatus({ tone: "success", message: "Task deleted." });
    } catch (error) {
      setTaskStatus({ tone: "error", message: error instanceof Error ? error.message : "Could not delete task." });
    }
  }

  return (
    <>
      <PageTitle
        title="Tasks"
        subtitle={isAdmin ? "Task cards group project context, owner, priority, deadline, and checklist progress." : "Only your own tasks from your assigned projects appear here."}
        action={
          <div className="flex gap-2">
            {isAdmin ? <Button tone="primary" icon={<Plus size={16} />} onClick={() => setShowAdd(true)}>Add Task</Button> : null}
          </div>
        }
      />
      {showAdd ? <AddTaskForm onClose={() => setShowAdd(false)} /> : null}
      <div className="mb-4"><ActionNotice status={taskStatus} /></div>
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
        <Search size={16} className="text-gray-400" />
        <input className="h-9 flex-1 bg-transparent text-sm outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search task, project, owner, or status" />
      </div>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {filterOptions.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setTaskFilter(filter.id)}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition",
              taskFilter === filter.id
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
            )}
          >
            {filter.label}
            <span className={cn("mono rounded px-1.5 py-0.5 text-xs", taskFilter === filter.id ? "bg-white/20" : "bg-gray-100")}>{filter.count}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleTasks
          .sort((a, b) => Number(isOverdue(b.deadline, taskDone(b))) - Number(isOverdue(a.deadline, taskDone(a))) || (b.priority === "High" ? 2 : b.priority === "Medium" ? 1 : 0) - (a.priority === "High" ? 2 : a.priority === "Medium" ? 1 : 0) || (daysLeft(a.deadline) ?? 9999) - (daysLeft(b.deadline) ?? 9999))
          .map((task) => (
          <TaskCard key={task.id} task={task} onPatch={patchTask} onDelete={deleteTask} />
        ))}
      </div>
      {!visibleTasks.length ? (
        <EmptyState
          title="No tasks found"
          detail={isAdmin ? "Create tasks with owners, project links, deadlines, and checklists so work is trackable." : "You have no matching work here. Try All, or ask admin to assign a task/project."}
          action={isAdmin ? <Button tone="primary" icon={<Plus size={16} />} onClick={() => setShowAdd(true)}>Add Task</Button> : null}
        />
      ) : null}
    </>
  );
}

function TaskCard({ task, onPatch, onDelete }: { task: Task; onPatch: (task: Task, patch: Partial<Task>) => void | Promise<void>; onDelete: (task: Task) => void | Promise<void> }) {
  const state = useAppStore();
  const user = state.accounts.find((account) => account.id === state.sessionAccountId);
  const isAdmin = user?.accessRole === "Admin";
  const project = state.projects.find((item) => item.id === task.projectId);
  const employees = state.accounts.filter((account) => account.accessRole === "Employee" && account.active);
  const progress = checklistPercent(task.checklist);
  const overdue = isOverdue(task.deadline, taskDone(task));
  const left = daysLeft(task.deadline);
  return (
    <article className="flex min-h-[360px] flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Pill className={cn(overdue ? statusTone("Overdue") : statusTone(task.status))}>
            {overdue ? "Overdue" : task.status}
          </Pill>
          <h3 className="mt-2 text-lg font-semibold leading-snug">{task.taskDescription}</h3>
          <p className="mt-1 text-sm text-gray-500">{project?.projectName || task.clientOrStore || "No project"}</p>
        </div>
        <Pill className={task.priority === "High" ? "bg-orange-100 text-orange-800" : task.priority === "Medium" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-700"}>
          <Star size={12} /> {task.priority}
        </Pill>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 text-sm">
        <div>
          <p className="text-xs text-gray-500">Owner</p>
          {isAdmin ? (
            <select className={cn(inputClass(), "mt-1 w-full")} value={task.personId} onChange={(e) => onPatch(task, { personId: e.target.value })}>
              {employees.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
          ) : (
            <p className="mt-1 font-semibold">{personName(state.accounts, task.personId)}</p>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-500">Deadline</p>
          <p className={cn("mono mt-1 font-semibold", overdue && "text-red-600")}>{task.deadline || "No date"}</p>
          {left !== undefined ? <p className="mt-1 text-xs text-gray-500">{overdue ? "Past due" : `${left} days left`}</p> : null}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">Checklist</span>
          <span className="mono font-semibold">{progress}%</span>
        </div>
        <ChecklistEditor value={task.checklist} onChange={(checklist) => onPatch(task, { checklist })} />
      </div>

      <div className="mt-4 grid gap-2">
        <select className={inputClass()} value={task.status} onChange={(e) => onPatch(task, { status: e.target.value as TaskStatus })}>
          {TASK_STATUSES.map((status) => <option key={status}>{status}</option>)}
        </select>
        <textarea className={textareaClass()} value={task.notes || ""} onChange={(e) => onPatch(task, { notes: e.target.value })} placeholder="Notes" />
      </div>

      <div className="mt-auto pt-3">
        <CommentsPanel entityType="task" entityId={task.id} />
        {isAdmin ? (
          <div className="mt-3 flex justify-end">
            <IconButton label="Delete task" tone="danger" onClick={() => onDelete(task)}>
              <Trash2 size={16} />
            </IconButton>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function Updates() {
  const state = useAppStore();
  const user = state.accounts.find((account) => account.id === state.sessionAccountId);
  const projects = scopedProjects(state.projects, user).filter((project) => project.status !== "Delivered");
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [date, setDate] = useState(todayISO());
  const [updateStatus, setUpdateStatus] = useState<ActionStatus>();
  const existing = state.dailyUpdates.find((update) => update.projectId === projectId && update.date === date);
  const [draft, setDraft] = useState<Partial<DailyClientUpdate>>({});
  const current = { ...existing, ...draft };
  const formatted = `Morning Update:\n${current.morningUpdate || ""}\n\nEvening Update:\n${current.eveningUpdate || ""}\n\nVideo Recording:\n${current.videoRecordingLink || ""}`;
  const activeProjects = projects.filter((project) => !["Cancelled", "Delivered"].includes(project.status));
  const missingToday = activeProjects.filter((project) => !state.dailyUpdates.some((update) => update.projectId === project.id && update.date === todayISO()));

  async function saveUpdate() {
    if (!projectId) return;
    setUpdateStatus({ tone: "info", message: "Saving update..." });
    try {
      await state.upsertUpdate({ ...existing, ...draft, projectId, date });
      setDraft({});
      setUpdateStatus({ tone: "success", message: "Daily update saved." });
    } catch (error) {
      setUpdateStatus({ tone: "error", message: error instanceof Error ? error.message : "Could not save update." });
    }
  }

  return (
    <>
      <PageTitle title="Daily Updates" subtitle="Log client-facing morning, evening, and video updates per project." />
      <div className="mb-4"><ActionNotice status={updateStatus} /></div>
      {projects.length ? null : (
        <EmptyState title="No active projects for updates" detail="Updates appear here after projects are created and assigned." />
      )}
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Project">
            <select className={inputClass()} value={projectId} onChange={(e) => { setProjectId(e.target.value); setDraft({}); }}>
              {!projects.length ? <option value="">No project available</option> : null}
              {projects.map((project) => <option key={project.id} value={project.id}>{project.projectName}</option>)}
            </select>
          </Field>
          <Field label="Date">
            <input className={inputClass()} type="date" value={date} onChange={(e) => { setDate(e.target.value); setDraft({}); }} />
          </Field>
          <div className="flex items-end gap-2">
            <Button icon={<MessageSquare size={16} />} onClick={() => setDraft({ ...draft, morningUpdate: UPDATE_TEMPLATE })}>
              Template
            </Button>
            <Button icon={<Copy size={16} />} onClick={() => { copyText(formatted); setUpdateStatus({ tone: "success", message: "Update copied." }); }}>
              Copy
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Morning update">
            <textarea className={textareaClass()} value={current.morningUpdate || ""} onChange={(e) => setDraft({ ...draft, morningUpdate: e.target.value })} />
          </Field>
          <Field label="Evening update">
            <textarea className={textareaClass()} value={current.eveningUpdate || ""} onChange={(e) => setDraft({ ...draft, eveningUpdate: e.target.value })} />
          </Field>
          <Field label="Video recording link">
            <input className={inputClass()} value={current.videoRecordingLink || ""} onChange={(e) => setDraft({ ...draft, videoRecordingLink: e.target.value })} />
          </Field>
          <div className="flex items-end">
            <Button
              tone="primary"
              icon={<Check size={16} />}
              onClick={saveUpdate}
              disabled={!projectId}
            >
              Save update
            </Button>
          </div>
        </div>
      </section>
      {user?.accessRole === "Admin" ? (
        <section className="mt-5 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Missing Updates Today</h2>
            <Pill className={missingToday.length ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>{missingToday.length}</Pill>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {missingToday.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => {
                  setProjectId(project.id);
                  setDate(todayISO());
                  setDraft({});
                }}
                className="rounded-md bg-gray-50 p-3 text-left text-sm hover:bg-gray-100"
              >
                <span className="font-medium">{project.projectName}</span>
                <span className="block text-xs text-gray-500">{personName(state.accounts, project.mainDeveloperId || project.designerId)} · {project.deadline || "No deadline"}</span>
              </button>
            ))}
            {!missingToday.length ? <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-500 md:col-span-2">Every active project has an update today.</p> : null}
          </div>
        </section>
      ) : null}
      <section className="mt-5 grid gap-3">
        {state.dailyUpdates
          .filter((update) => projects.some((project) => project.id === update.projectId))
          .slice(0, 10)
          .map((update) => (
            <article key={update.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <p className="font-semibold">{state.projects.find((project) => project.id === update.projectId)?.projectName}</p>
              <p className="mono text-xs text-gray-500">{update.date}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{update.morningUpdate || update.eveningUpdate}</p>
            </article>
          ))}
      </section>
    </>
  );
}

function Calendar() {
  const state = useAppStore();
  const user = state.accounts.find((account) => account.id === state.sessionAccountId);
  const isAdmin = user?.accessRole === "Admin";
  const [mode, setMode] = useState<"day" | "week">("day");
  const [date, setDate] = useState(todayISO());
  const [personId, setPersonId] = useState(user?.id || "");
  const [calendarStatus, setCalendarStatus] = useState<ActionStatus>();
  const activePerson = isAdmin ? personId : user?.id || "";
  const days = mode === "day" ? [date] : Array.from({ length: 7 }, (_, i) => format(addDays(startOfWeek(new Date(date), { weekStartsOn: 1 }), i), "yyyy-MM-dd"));
  const slots = state.calendarSlots.filter((slot) => slot.teamMemberId === activePerson && days.includes(slot.date));
  const scheduleCandidates = state.tasks.filter((task) => {
    if (task.personId !== activePerson || taskDone(task)) return false;
    const left = daysLeft(task.deadline);
    const scheduled = state.calendarSlots.some((slot) => slot.taskId === task.id || (slot.teamMemberId === activePerson && slot.taskText === task.taskDescription));
    return !scheduled && (left === undefined || left <= 7);
  });

  async function saveSlot(day: string, time: string, existing?: CalendarSlot) {
    const taskText = prompt("Task text", existing?.taskText || "");
    if (taskText === null) return;
    setCalendarStatus({ tone: "info", message: "Saving calendar slot..." });
    try {
      await state.upsertSlot({
        ...existing,
        teamMemberId: activePerson,
        date: day,
        startTime: time,
        taskText,
        status: existing?.status || "To Do",
        priority: existing?.priority || "Medium",
      });
      setCalendarStatus({ tone: "success", message: "Calendar slot saved." });
    } catch (error) {
      setCalendarStatus({ tone: "error", message: error instanceof Error ? error.message : "Could not save slot." });
    }
  }

  async function deleteSlot(slot: CalendarSlot) {
    if (!confirm("Delete this calendar slot?")) return;
    setCalendarStatus({ tone: "info", message: "Deleting calendar slot..." });
    try {
      await state.deleteSlot(slot.id);
      setCalendarStatus({ tone: "success", message: "Calendar slot deleted." });
    } catch (error) {
      setCalendarStatus({ tone: "error", message: error instanceof Error ? error.message : "Could not delete slot." });
    }
  }

  return (
    <>
      <PageTitle title="Calendar" subtitle="10:00 to 18:00 planner in 30-minute slots." />
      <div className="mb-4"><ActionNotice status={calendarStatus} /></div>
      <div className="mb-4 flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
        <Button tone={mode === "day" ? "primary" : "default"} onClick={() => setMode("day")}>Day</Button>
        <Button tone={mode === "week" ? "primary" : "default"} onClick={() => setMode("week")}>Week</Button>
        <input className={inputClass()} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        {isAdmin ? (
          <select className={inputClass()} value={personId} onChange={(e) => setPersonId(e.target.value)}>
            <option value="">Select employee</option>
            {state.accounts.filter((account) => account.accessRole === "Employee").map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        ) : null}
      </div>
      {activePerson ? (
        <section className="mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Tasks to Schedule</h2>
            <Pill className={scheduleCandidates.length ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>{scheduleCandidates.length}</Pill>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {scheduleCandidates.slice(0, 10).map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => {
                  void state.upsertSlot({
                    teamMemberId: activePerson,
                    date,
                    startTime: "10:00",
                    taskText: task.taskDescription,
                    taskId: task.id,
                    priority: task.priority,
                    status: "To Do",
                  });
                  setCalendarStatus({ tone: "success", message: "Task added to today's 10:00 slot. Adjust the time if needed." });
                }}
                className="min-w-64 rounded-md border border-gray-200 bg-gray-50 p-3 text-left text-sm hover:bg-gray-100"
              >
                <span className="font-medium">{task.taskDescription}</span>
                <span className="block text-xs text-gray-500">{task.deadline || "No deadline"} · {task.priority}</span>
              </button>
            ))}
            {!scheduleCandidates.length ? <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-500">No urgent unscheduled tasks for this person.</p> : null}
          </div>
        </section>
      ) : (
        <EmptyState title="Select an employee" detail="Choose an employee to inspect or plan calendar slots." />
      )}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-3">Time</th>
              {days.map((day) => <th key={day} className="px-3 py-3">{format(new Date(day), "EEE, MMM d")}</th>)}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((time) => (
              <tr key={time} className="border-t border-gray-100">
                <td className="mono px-3 py-3 text-gray-500">{time}</td>
                {days.map((day) => {
                  const slot = slots.find((item) => item.date === day && item.startTime === time);
                  return (
                    <td key={`${day}-${time}`} className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => saveSlot(day, time, slot)}
                        className="min-h-12 w-full rounded-md border border-gray-200 bg-gray-50 p-2 text-left hover:bg-gray-100"
                      >
                        <span className="block font-medium">{slot?.taskText || "Add plan"}</span>
                        {slot ? <Pill className={cn("mt-1", statusTone(slot.status || "To Do"))}>{slot.status}</Pill> : null}
                      </button>
                      {slot ? (
                        <button
                          type="button"
                          onClick={() => deleteSlot(slot)}
                          className="mt-1 text-xs font-medium text-red-600 hover:text-red-700"
                        >
                          Delete slot
                        </button>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Performance() {
  const state = useAppStore();
  const user = state.accounts.find((account) => account.id === state.sessionAccountId);
  const people = user?.accessRole === "Admin" ? state.accounts.filter((account) => account.accessRole === "Employee") : state.accounts.filter((account) => account.id === user?.id);
  const rows = people.map((person) => {
    const tasks = state.tasks.filter((task) => task.personId === person.id);
    const done = tasks.filter(taskDone).length;
    const overdue = tasks.filter((task) => isOverdue(task.deadline, taskDone(task))).length;
    const donePercent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    const projects = state.projects.filter((project) => [project.mainDeveloperId, project.developer2Id, project.designerId].includes(person.id));
    return {
      name: person.name.split(" ")[0],
      fullName: person.name,
      tasks: tasks.length,
      done,
      donePercent,
      overdue,
      projects: projects.length,
      rating: ratingFor(donePercent, overdue),
    };
  });
  const line = rows.map((row) => ({ name: row.name, completed: row.done }));

  return (
    <>
      <PageTitle title="Performance" subtitle="Computed live from projects and tasks. Ratings are not stored." />
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Done % Leaderboard</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="donePercent" fill="#5B5FEF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Completed Tasks</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={line}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="completed" stroke="#5B5FEF" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
      <div className="mt-5 overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-3">Person</th>
              <th className="px-3 py-3">Projects</th>
              <th className="px-3 py-3">Tasks</th>
              <th className="px-3 py-3">Done</th>
              <th className="px-3 py-3">Overdue</th>
              <th className="px-3 py-3">Rating</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.fullName} className="border-t border-gray-100">
                <td className="px-3 py-3 font-medium">{row.fullName}</td>
                <td className="mono px-3 py-3">{row.projects}</td>
                <td className="mono px-3 py-3">{row.tasks}</td>
                <td className="mono px-3 py-3">{row.donePercent}%</td>
                <td className="mono px-3 py-3">{row.overdue}</td>
                <td className="px-3 py-3"><Pill className={row.rating === "At risk" ? statusTone("Overdue") : row.rating === "On track" ? statusTone("Done") : statusTone("Revision")}>{row.rating}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Directory({ inspirationOnly = false }: { inspirationOnly?: boolean }) {
  const state = useAppStore();
  const user = state.accounts.find((account) => account.id === state.sessionAccountId);
  const isAdmin = user?.accessRole === "Admin";
  const [query, setQuery] = useState("");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [resourceDraft, setResourceDraft] = useState<Partial<ResourceLink>>({ category: inspirationOnly ? "Inspiration" : "General" });
  const [storeDraft, setStoreDraft] = useState<Partial<StorePreview>>({});
  const [directoryStatus, setDirectoryStatus] = useState<ActionStatus>();
  const resources = state.resourceLinks.filter((resource) => {
    const matches = `${resource.name} ${resource.value} ${resource.category}`.toLowerCase().includes(query.toLowerCase());
    return matches && (inspirationOnly ? resource.category === "Inspiration" : true);
  });
  const stores = state.storePreviews.filter((store) => `${store.storeName} ${store.previewLink}`.toLowerCase().includes(query.toLowerCase()));

  function masked(id: string, value?: string, sensitive = false) {
    if (!value) return "Empty";
    if (!sensitive) return value;
    return isAdmin && revealed[id] ? value : "••••••••";
  }

  async function saveResource() {
    setDirectoryStatus({ tone: "info", message: "Saving resource..." });
    try {
      await state.upsertResource(resourceDraft);
      setResourceDraft({ category: inspirationOnly ? "Inspiration" : "General" });
      setDirectoryStatus({ tone: "success", message: "Resource saved." });
    } catch (error) {
      setDirectoryStatus({ tone: "error", message: error instanceof Error ? error.message : "Could not save resource." });
    }
  }

  async function deleteResource(resource: ResourceLink) {
    if (!confirm(`Delete "${resource.name}"?`)) return;
    setDirectoryStatus({ tone: "info", message: "Deleting resource..." });
    try {
      await state.deleteResource(resource.id);
      setDirectoryStatus({ tone: "success", message: "Resource deleted." });
    } catch (error) {
      setDirectoryStatus({ tone: "error", message: error instanceof Error ? error.message : "Could not delete resource." });
    }
  }

  async function saveStore() {
    setDirectoryStatus({ tone: "info", message: "Saving store preview..." });
    try {
      await state.upsertStorePreview(storeDraft);
      setStoreDraft({});
      setDirectoryStatus({ tone: "success", message: "Store preview saved." });
    } catch (error) {
      setDirectoryStatus({ tone: "error", message: error instanceof Error ? error.message : "Could not save store preview." });
    }
  }

  async function deleteStore(store: StorePreview) {
    if (!confirm(`Delete "${store.storeName}"?`)) return;
    setDirectoryStatus({ tone: "info", message: "Deleting store preview..." });
    try {
      await state.deleteStorePreview(store.id);
      setDirectoryStatus({ tone: "success", message: "Store preview deleted." });
    } catch (error) {
      setDirectoryStatus({ tone: "error", message: error instanceof Error ? error.message : "Could not delete store preview." });
    }
  }

  return (
    <>
      <PageTitle
        title={inspirationOnly ? "Inspiration" : "Directory"}
        subtitle={inspirationOnly ? "Reusable inspiration links for team reference." : "Team directory, resources, and store preview links."}
      />
      <div className="mb-4"><ActionNotice status={directoryStatus} /></div>
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
        <Search size={16} className="text-gray-400" />
        <input className="h-9 flex-1 bg-transparent text-sm outline-none" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search directory" />
      </div>
      {!inspirationOnly ? (
        <section className="mb-5 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Team</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {state.accounts.filter((account) => account.active).map((account) => (
              <div key={account.id} className="rounded-md bg-gray-50 p-3">
                <div className="mb-2 size-3 rounded-full" style={{ background: account.colorTag }} />
                <p className="font-medium">{account.name}</p>
                <p className="text-sm text-gray-500">{account.role}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {isAdmin ? (
        <section className="mb-5 grid gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-4">
          <Field label="Resource name">
            <input className={inputClass()} value={resourceDraft.name || ""} onChange={(e) => setResourceDraft({ ...resourceDraft, name: e.target.value })} />
          </Field>
          <Field label="Category">
            <select className={inputClass()} value={resourceDraft.category} onChange={(e) => setResourceDraft({ ...resourceDraft, category: e.target.value as ResourceLink["category"] })}>
              {["SOP", "Tutorial", "Tool", "Figma", "Account", "Inspiration", "General"].map((category) => <option key={category}>{category}</option>)}
            </select>
          </Field>
          <Field label="Value">
            <input className={inputClass()} value={resourceDraft.value || ""} onChange={(e) => setResourceDraft({ ...resourceDraft, value: e.target.value })} />
          </Field>
          <div className="flex items-end gap-2">
            <label className="flex h-9 items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(resourceDraft.isSensitive)} onChange={(e) => setResourceDraft({ ...resourceDraft, isSensitive: e.target.checked })} /> Sensitive</label>
            <IconButton label="Add resource" tone="primary" onClick={saveResource}><Plus size={16} /></IconButton>
          </div>
        </section>
      ) : null}
      <section className="grid gap-3 lg:grid-cols-2">
        {resources.map((resource) => (
          <article key={resource.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Pill className="bg-gray-100 text-gray-700">{resource.category}</Pill>
                <h2 className="mt-2 font-semibold">{resource.name}</h2>
                <p className="mt-1 break-all text-sm text-gray-600">{masked(resource.id, resource.value, resource.isSensitive)}</p>
              </div>
              <div className="flex gap-2">
                {resource.isSensitive && isAdmin ? (
                  <IconButton label="Reveal" onClick={() => setRevealed({ ...revealed, [resource.id]: !revealed[resource.id] })}>
                    {revealed[resource.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </IconButton>
                ) : null}
                {(!resource.isSensitive || isAdmin) ? (
                  <IconButton label="Copy" onClick={() => copyText(resource.value)}><Copy size={16} /></IconButton>
                ) : null}
                {isAdmin ? <IconButton label="Delete" tone="danger" onClick={() => deleteResource(resource)}><Trash2 size={16} /></IconButton> : null}
              </div>
            </div>
          </article>
        ))}
      </section>
      {!resources.length ? (
        <div className="mt-3">
          <EmptyState title={inspirationOnly ? "No inspiration links found" : "No resources found"} detail={isAdmin ? "Add useful links, SOPs, passwords, tools, or references from the form above." : "No matching resources are available yet."} />
        </div>
      ) : null}
      {!inspirationOnly ? (
        <>
          {isAdmin ? (
            <section className="my-5 grid gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-4">
              <Field label="Store">
                <input className={inputClass()} value={storeDraft.storeName || ""} onChange={(e) => setStoreDraft({ ...storeDraft, storeName: e.target.value })} />
              </Field>
              <Field label="Preview link">
                <input className={inputClass()} value={storeDraft.previewLink || ""} onChange={(e) => setStoreDraft({ ...storeDraft, previewLink: e.target.value })} />
              </Field>
              <Field label="Password">
                <input className={inputClass()} value={storeDraft.password || ""} onChange={(e) => setStoreDraft({ ...storeDraft, password: e.target.value })} />
              </Field>
              <div className="flex items-end">
                <Button tone="primary" icon={<Plus size={16} />} onClick={saveStore}>Add Store</Button>
              </div>
            </section>
          ) : null}
          <section className="mt-5 grid gap-3 lg:grid-cols-2">
            {stores.map((store) => (
              <article key={store.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{store.storeName}</h2>
                    <a className="mt-1 block break-all text-sm text-[var(--accent)]" href={store.previewLink} target="_blank" rel="noreferrer">{store.previewLink}</a>
                    <p className="mt-1 text-sm text-gray-600">Password: {masked(store.id, store.password, true)}</p>
                  </div>
                  <div className="flex gap-2">
                    {isAdmin ? <IconButton label="Reveal" onClick={() => setRevealed({ ...revealed, [store.id]: !revealed[store.id] })}>{revealed[store.id] ? <EyeOff size={16} /> : <Eye size={16} />}</IconButton> : null}
                    {isAdmin ? <IconButton label="Copy combo" onClick={() => copyText(`${store.previewLink || ""}\n${store.password || ""}`)}><Copy size={16} /></IconButton> : null}
                    {isAdmin ? <IconButton label="Delete" tone="danger" onClick={() => deleteStore(store)}><Trash2 size={16} /></IconButton> : null}
                  </div>
                </div>
              </article>
            ))}
          </section>
          {!stores.length ? <div className="mt-3"><EmptyState title="No store previews found" detail={isAdmin ? "Add store previews so the team can quickly find preview links and passwords." : "No matching store previews are available yet."} /></div> : null}
        </>
      ) : null}
    </>
  );
}

function Team() {
  const state = useAppStore();
  const user = state.accounts.find((account) => account.id === state.sessionAccountId);
  const [draft, setDraft] = useState<Partial<Account>>({ accessRole: "Employee", active: true, colorTag: TEAM_COLOR_PALETTE[0] });
  const [roleDraft, setRoleDraft] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountStatus, setAccountStatus] = useState<{ tone: "success" | "error" | "info"; message: string }>();
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const [passwordSavingId, setPasswordSavingId] = useState<string>();
  if (user?.accessRole !== "Admin") return <Navigate to="/dashboard" replace />;

  async function handleAddAccount() {
    const username = draft.username?.trim();
    if (!draft.name?.trim() || !username || !draft.passwordHash?.trim()) {
      setAccountStatus({ tone: "error", message: "Name, username, and password are required." });
      return;
    }

    setAccountBusy(true);
    setAccountStatus({ tone: "info", message: "Creating account in Supabase..." });
    try {
      await state.upsertAccount(draft);
      setDraft({ accessRole: "Employee", active: true, colorTag: TEAM_COLOR_PALETTE[0] });
      setAccountStatus({ tone: "success", message: `Created ${username}. They can now log in with ID ${username}.` });
    } catch (error) {
      setAccountStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Could not create account.",
      });
    } finally {
      setAccountBusy(false);
    }
  }

  async function handleSavePassword(account: Account) {
    const nextPassword = passwordDrafts[account.id] ?? account.passwordHash;
    if (!nextPassword?.trim()) {
      setAccountStatus({ tone: "error", message: "Password is required." });
      return;
    }

    setPasswordSavingId(account.id);
    setAccountStatus({ tone: "info", message: `Updating password for ${account.username}...` });
    try {
      await state.resetAccountPassword(account.id, nextPassword);
      setPasswordDrafts((drafts) => {
        const next = { ...drafts };
        delete next[account.id];
        return next;
      });
      setAccountStatus({ tone: "success", message: `Updated password for ${account.username}.` });
    } catch (error) {
      setAccountStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Could not update password.",
      });
    } finally {
      setPasswordSavingId(undefined);
    }
  }

  return (
    <>
      <PageTitle title="Team & Roles" subtitle="Admin-only account and job role management." />
      <section className="mb-5 grid gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <Field label="Name"><input className={inputClass()} value={draft.name || ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
        <Field label="Username"><input className={inputClass()} value={draft.username || ""} onChange={(e) => setDraft({ ...draft, username: e.target.value })} /></Field>
        <Field label="Password">
          <div className="flex h-9 rounded-md border border-gray-200 bg-white focus-within:border-[var(--accent)]">
            <input
              className="min-w-0 flex-1 rounded-md bg-transparent px-3 text-sm text-gray-900 outline-none"
              type={newPasswordVisible ? "text" : "password"}
              value={draft.passwordHash || ""}
              onChange={(e) => setDraft({ ...draft, passwordHash: e.target.value })}
            />
            <button
              type="button"
              title={newPasswordVisible ? "Hide password" : "Show password"}
              aria-label={newPasswordVisible ? "Hide password" : "Show password"}
              onClick={() => setNewPasswordVisible((value) => !value)}
              className="inline-flex size-9 items-center justify-center text-gray-500 hover:text-gray-800"
            >
              {newPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>
        <Field label="Job role">
          <select className={inputClass()} value={draft.jobRoleId || state.jobRoles[0]?.id} onChange={(e) => setDraft({ ...draft, jobRoleId: e.target.value, role: state.jobRoles.find((role) => role.id === e.target.value)?.name })}>
            {state.jobRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
        </Field>
        <Field label="Access">
          <select className={inputClass()} value={draft.accessRole} onChange={(e) => setDraft({ ...draft, accessRole: e.target.value as Account["accessRole"] })}>
            <option>Employee</option>
            <option>Admin</option>
          </select>
        </Field>
        <div className="grid gap-1 text-xs font-medium text-gray-600 md:col-span-3">
          Color tag
          <ColorTagPicker value={draft.colorTag} onChange={(colorTag) => setDraft({ ...draft, colorTag })} />
        </div>
        <div className="flex items-end"><Button tone="primary" icon={<Plus size={16} />} disabled={accountBusy} onClick={handleAddAccount}>{accountBusy ? "Adding..." : "Add account"}</Button></div>
        <div className="md:col-span-4"><ActionNotice status={accountStatus} /></div>
        <p className="text-xs leading-5 text-gray-500 md:col-span-4">
          New users are created in Supabase Auth with username@openlimits.local. They log in here with the simple username and password you set.
        </p>
      </section>
      <section className="mb-5 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">Job Roles</h2>
        <div className="mb-3 flex gap-2">
          <input className={cn(inputClass(), "flex-1")} value={roleDraft} onChange={(e) => setRoleDraft(e.target.value)} />
          <IconButton label="Add role" tone="primary" onClick={() => { state.upsertJobRole({ name: roleDraft }); setRoleDraft(""); }}><Plus size={16} /></IconButton>
        </div>
        <div className="flex flex-wrap gap-2">
          {state.jobRoles.map((role) => (
            <Pill key={role.id} className="bg-gray-100 text-gray-700">
              {role.name}
              <button type="button" title="Delete role" onClick={() => confirm(`Delete role "${role.name}"?`) && state.deleteJobRole(role.id)}><Trash2 size={12} /></button>
            </Pill>
          ))}
        </div>
      </section>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr><th className="px-3 py-3">Name</th><th className="px-3 py-3">Username</th><th className="px-3 py-3">Password</th><th className="px-3 py-3">Access</th><th className="px-3 py-3">Role</th><th className="px-3 py-3">Active</th><th className="px-3 py-3">Actions</th></tr>
          </thead>
          <tbody>
            {state.accounts.map((account) => (
              <tr key={account.id} className="border-t border-gray-100">
                <td className="px-3 py-3 font-medium">{account.name}</td>
                <td className="mono px-3 py-3">{account.username}</td>
                <td className="px-3 py-3">
                  <div className="flex max-w-[260px] items-center gap-2">
                    <input
                      className={cn(inputClass(), "mono h-8 min-w-0 flex-1")}
                      type={visiblePasswords[account.id] ? "text" : "password"}
                      value={passwordDrafts[account.id] ?? account.passwordHash}
                      placeholder="No saved password"
                      onChange={(e) => setPasswordDrafts({ ...passwordDrafts, [account.id]: e.target.value })}
                    />
                    <IconButton
                      label={visiblePasswords[account.id] ? "Hide password" : "Show password"}
                      onClick={() => setVisiblePasswords({ ...visiblePasswords, [account.id]: !visiblePasswords[account.id] })}
                    >
                      {visiblePasswords[account.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </IconButton>
                    <IconButton label="Save password" tone="primary" onClick={() => handleSavePassword(account)}>
                      {passwordSavingId === account.id ? <span className="text-xs">...</span> : <Check size={16} />}
                    </IconButton>
                  </div>
                </td>
                <td className="px-3 py-3">{account.accessRole}</td>
                <td className="px-3 py-3">{account.role}</td>
                <td className="px-3 py-3">
                  <input type="checkbox" checked={account.active} onChange={(e) => state.upsertAccount({ ...account, active: e.target.checked })} />
                </td>
                <td className="flex gap-2 px-3 py-3">
                  <Pill className="bg-gray-100 text-gray-600">Supabase Auth</Pill>
                  {account.id !== "acct-admin" ? <IconButton label="Delete account" tone="danger" onClick={() => confirm(`Delete account "${account.username}"?`) && state.deleteAccount(account.id)}><Trash2 size={16} /></IconButton> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SettingsData() {
  const state = useAppStore();
  const user = state.accounts.find((account) => account.id === state.sessionAccountId);
  if (user?.accessRole !== "Admin") return <Navigate to="/dashboard" replace />;
  return (
    <>
      <PageTitle title="Settings" subtitle="Supabase is the source of truth for all app data." />
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md bg-gray-50 p-3">
            <p className="text-xs font-semibold uppercase text-gray-500">Backend</p>
            <p className="mt-1 font-semibold">{state.backendReady ? "Connected" : "Missing env vars"}</p>
          </div>
          <div className="rounded-md bg-gray-50 p-3">
            <p className="text-xs font-semibold uppercase text-gray-500">Projects</p>
            <p className="mono mt-1 text-xl font-semibold">{state.projects.length}</p>
          </div>
          <div className="rounded-md bg-gray-50 p-3">
            <p className="text-xs font-semibold uppercase text-gray-500">Tasks</p>
            <p className="mono mt-1 text-xl font-semibold">{state.tasks.length}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          Local JSON import, local reset, and manual sync have been removed. Every create, edit, delete, comment, notification, and status update now writes directly to Supabase.
        </p>
      </section>
    </>
  );
}

function Help() {
  return (
    <>
      <PageTitle title="Help" subtitle="Rules shown here are the same rules enforced by the app." />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Status Rules</h2>
          <ul className="mt-3 grid gap-2 text-sm text-gray-600">
            <li>Delivered projects automatically receive a delivered date.</li>
            <li>On Hold projects require a blocker note.</li>
            <li>Linked calendar slots marked Done also mark the linked task Done.</li>
          </ul>
        </section>
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Performance Ratings</h2>
          <ul className="mt-3 grid gap-2 text-sm text-gray-600">
            <li>On track: 0 overdue tasks and Done % at least 70.</li>
            <li>Watch: 1 to 2 overdue tasks, or below on-track thresholds.</li>
            <li>At risk: 3 or more overdue tasks, or Done % below 20.</li>
          </ul>
        </section>
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="font-semibold">Local Auth Notice</h2>
          <p className="mt-3 text-sm text-gray-600">
            Passwords are hashed with the Web Crypto API and stored locally for this mock workflow. This is not production-grade authentication.
          </p>
        </section>
      </div>
    </>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const sessionAccountId = useAppStore((state) => state.sessionAccountId);
  const loading = useAppStore((state) => state.loading);
  const loadRemoteData = useAppStore((state) => state.loadRemoteData);
  const subscribeRealtime = useAppStore((state) => state.subscribeRealtime);
  const [checkedSession, setCheckedSession] = useState(false);
  const location = useLocation();
  useEffect(() => {
    let mounted = true;
    if (sessionAccountId) {
      setCheckedSession(true);
      return () => {
        mounted = false;
      };
    }
    setCheckedSession(false);
    void loadRemoteData().finally(() => {
      if (!mounted) return;
      subscribeRealtime();
      setCheckedSession(true);
    });
    return () => {
      mounted = false;
    };
  }, [loadRemoteData, sessionAccountId, subscribeRealtime]);
  if (!sessionAccountId && (!checkedSession || loading)) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--bg)] px-4 text-sm text-gray-600">
        Restoring session...
      </main>
    );
  }
  if (!sessionAccountId) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Shell>{children}</Shell>;
}

export default function App() {
  const sessionAccountId = useAppStore((state) => state.sessionAccountId);
  return (
    <Routes>
      <Route path="/login" element={sessionAccountId ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/" element={<Navigate to={sessionAccountId ? "/dashboard" : "/login"} replace />} />
      <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/projects" element={<RequireAuth><Projects /></RequireAuth>} />
      <Route path="/projects/:projectId" element={<RequireAuth><ProjectDetail /></RequireAuth>} />
      <Route path="/delivered" element={<Navigate to="/projects?filter=delivered" replace />} />
      <Route path="/tasks" element={<RequireAuth><Tasks /></RequireAuth>} />
      <Route path="/updates" element={<RequireAuth><Updates /></RequireAuth>} />
      <Route path="/calendar" element={<RequireAuth><Calendar /></RequireAuth>} />
      <Route path="/performance" element={<RequireAuth><Performance /></RequireAuth>} />
      <Route path="/directory" element={<RequireAuth><Directory /></RequireAuth>} />
      <Route path="/inspiration" element={<RequireAuth><Directory inspirationOnly /></RequireAuth>} />
      <Route path="/team" element={<RequireAuth><Team /></RequireAuth>} />
      <Route path="/settings" element={<RequireAuth><SettingsData /></RequireAuth>} />
      <Route path="/help" element={<RequireAuth><Help /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

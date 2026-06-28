import { create } from "zustand";
import seed from "./data/seed.json";
import { STORAGE_KEYS } from "./config";
import type {
  Account,
  ActivityLogEntry,
  CalendarSlot,
  Comment,
  DailyClientUpdate,
  JobRole,
  Notification,
  Project,
  ResourceLink,
  SeedData,
  StorePreview,
  Task,
} from "./types";
import {
  assignedToProject,
  nowISO,
  scopedProjects,
  scopedTasks,
  sha256,
  taskDone,
  uid,
} from "./utils";

type EntityCollection =
  | "accounts"
  | "jobRoles"
  | "projects"
  | "tasks"
  | "dailyUpdates"
  | "calendarSlots"
  | "resourceLinks"
  | "storePreviews"
  | "comments"
  | "activityLog"
  | "notifications";

type ImportPayload = Partial<Omit<SeedData, "version">> & { version?: string };

interface AppState extends Omit<SeedData, "version"> {
  seededVersion: string;
  sessionAccountId?: string;
  authError?: string;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (accountId: string, nextPassword: string) => Promise<void>;
  markNotificationsRead: () => void;
  resetToSeed: () => void;
  exportData: () => SeedData;
  importData: (payload: ImportPayload) => void;
  createProject: (project: Partial<Project>) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  createTask: (task: Partial<Task>) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  upsertUpdate: (update: Partial<DailyClientUpdate>) => void;
  upsertSlot: (slot: Partial<CalendarSlot>) => void;
  deleteSlot: (id: string) => void;
  createComment: (
    entityType: "project" | "task",
    entityId: string,
    text: string,
  ) => void;
  upsertResource: (resource: Partial<ResourceLink>) => void;
  deleteResource: (id: string) => void;
  upsertStorePreview: (storePreview: Partial<StorePreview>) => void;
  deleteStorePreview: (id: string) => void;
  upsertAccount: (account: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  resetAccountPassword: (id: string, password: string) => Promise<void>;
  upsertJobRole: (role: Partial<JobRole>) => void;
  deleteJobRole: (id: string) => void;
}

const seedData = seed as SeedData;

function read<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function writeAll(data: SeedData) {
  (Object.keys(STORAGE_KEYS) as Array<keyof typeof STORAGE_KEYS>).forEach((key) => {
    if (key === "session" || key === "seededVersion") return;
    const collection = key as EntityCollection;
    write(STORAGE_KEYS[collection], data[collection]);
  });
  localStorage.setItem(STORAGE_KEYS.seededVersion, data.version);
}

function initialData() {
  const seededVersion = localStorage.getItem(STORAGE_KEYS.seededVersion);
  if (!seededVersion) writeAll(seedData);
  const session = read<{ accountId?: string }>(STORAGE_KEYS.session, {});
  return {
    seededVersion: localStorage.getItem(STORAGE_KEYS.seededVersion) || seedData.version,
    sessionAccountId: session.accountId,
    accounts: read<Account[]>(STORAGE_KEYS.accounts, seedData.accounts),
    jobRoles: read<JobRole[]>(STORAGE_KEYS.jobRoles, seedData.jobRoles),
    projects: read<Project[]>(STORAGE_KEYS.projects, seedData.projects),
    tasks: read<Task[]>(STORAGE_KEYS.tasks, seedData.tasks),
    dailyUpdates: read<DailyClientUpdate[]>(
      STORAGE_KEYS.dailyUpdates,
      seedData.dailyUpdates,
    ),
    calendarSlots: read<CalendarSlot[]>(
      STORAGE_KEYS.calendarSlots,
      seedData.calendarSlots,
    ),
    resourceLinks: read<ResourceLink[]>(
      STORAGE_KEYS.resourceLinks,
      seedData.resourceLinks,
    ),
    storePreviews: read<StorePreview[]>(
      STORAGE_KEYS.storePreviews,
      seedData.storePreviews,
    ),
    comments: read<Comment[]>(STORAGE_KEYS.comments, seedData.comments),
    activityLog: read<ActivityLogEntry[]>(
      STORAGE_KEYS.activityLog,
      seedData.activityLog,
    ),
    notifications: read<Notification[]>(
      STORAGE_KEYS.notifications,
      seedData.notifications,
    ),
  };
}

function actor(state: AppState) {
  return state.accounts.find((account) => account.id === state.sessionAccountId);
}

function requireAdmin(state: AppState) {
  if (actor(state)?.accessRole !== "Admin") {
    throw new Error("Admin permission required.");
  }
}

function canEditProject(state: AppState, project: Project, patch: Partial<Project>) {
  const user = actor(state);
  if (!user) return false;
  if (user.accessRole === "Admin") return true;
  if (!assignedToProject(project, user.id)) return false;
  const allowed = new Set([
    "status",
    "notesLastUpdate",
    "checklist",
    "previewLink",
    "figmaLink",
    "driveAssetsLink",
    "briefDocLink",
    "clientChatsLink",
    "tags",
    "delayBlocker",
  ]);
  return Object.keys(patch).every((key) => allowed.has(key));
}

function canEditTask(state: AppState, task: Task, patch: Partial<Task>) {
  const user = actor(state);
  if (!user) return false;
  if (user.accessRole === "Admin") return true;
  if (task.personId !== user.id) return false;
  const allowed = new Set(["status", "notes", "checklist", "completedAt"]);
  return Object.keys(patch).every((key) => allowed.has(key));
}

function logEntry(state: AppState, entry: Omit<ActivityLogEntry, "id" | "createdAt">) {
  const next = [
    {
      id: uid("log"),
      createdAt: nowISO(),
      ...entry,
    },
    ...state.activityLog,
  ];
  write(STORAGE_KEYS.activityLog, next);
  return next;
}

function notifyMany(
  state: AppState,
  recipientIds: string[],
  message: string,
  link?: string,
) {
  const unique = Array.from(new Set(recipientIds.filter(Boolean)));
  const notifications = [
    ...unique.map((recipientId) => ({
      id: uid("notif"),
      recipientId,
      message,
      link,
      read: false,
      createdAt: nowISO(),
    })),
    ...state.notifications,
  ];
  write(STORAGE_KEYS.notifications, notifications);
  return notifications;
}

function saveCollection<K extends EntityCollection>(key: K, value: AppState[K]) {
  write(STORAGE_KEYS[key], value);
  return { [key]: value } as Pick<AppState, K>;
}

export const useAppStore = create<AppState>((set, get) => ({
  ...initialData(),

  async login(username, password) {
    // Local-only mock auth: useful for this browser-backed tracker, not production-grade authentication.
    const passwordHash = await sha256(password);
    const account = get().accounts.find(
      (item) =>
        item.username.toLowerCase() === username.trim().toLowerCase() &&
        item.passwordHash === passwordHash &&
        item.active,
    );
    if (!account) {
      set({ authError: "Invalid login or inactive account." });
      return false;
    }
    localStorage.setItem(
      STORAGE_KEYS.session,
      JSON.stringify({ accountId: account.id }),
    );
    set({ sessionAccountId: account.id, authError: undefined });
    return true;
  },

  logout() {
    localStorage.removeItem(STORAGE_KEYS.session);
    set({ sessionAccountId: undefined });
  },

  async changePassword(accountId, nextPassword) {
    const state = get();
    const user = actor(state);
    if (!user || (user.id !== accountId && user.accessRole !== "Admin")) {
      throw new Error("Not allowed.");
    }
    const passwordHash = await sha256(nextPassword);
    const accounts = state.accounts.map((account) =>
      account.id === accountId
        ? { ...account, passwordHash }
        : account,
    );
    write(STORAGE_KEYS.accounts, accounts);
    set({
      accounts,
      activityLog: logEntry(state, {
        entityType: "account",
        entityId: accountId,
        actorId: user.id,
        action: "Changed password",
      }),
    });
  },

  markNotificationsRead() {
    const user = actor(get());
    if (!user) return;
    const notifications = get().notifications.map((notification) =>
      notification.recipientId === user.id ? { ...notification, read: true } : notification,
    );
    write(STORAGE_KEYS.notifications, notifications);
    set({ notifications });
  },

  resetToSeed() {
    writeAll(seedData);
    const sessionAccountId = get().sessionAccountId;
    set({ ...initialData(), sessionAccountId });
  },

  exportData() {
    const state = get();
    return {
      version: state.seededVersion,
      accounts: state.accounts,
      jobRoles: state.jobRoles,
      projects: state.projects,
      tasks: state.tasks,
      dailyUpdates: state.dailyUpdates,
      calendarSlots: state.calendarSlots,
      resourceLinks: state.resourceLinks,
      storePreviews: state.storePreviews,
      comments: state.comments,
      activityLog: state.activityLog,
      notifications: state.notifications,
    };
  },

  importData(payload) {
    requireAdmin(get());
    const data = { ...seedData, ...payload, version: payload.version || nowISO() };
    writeAll(data);
    const sessionAccountId = get().sessionAccountId;
    set({ ...initialData(), sessionAccountId });
  },

  createProject(project) {
    const state = get();
    requireAdmin(state);
    const created: Project = {
      id: uid("proj"),
      projectName: project.projectName || "Untitled project",
      clientUsername: project.clientUsername || "",
      mainDeveloperId: project.mainDeveloperId,
      developer2Id: project.developer2Id,
      designerId: project.designerId,
      deadline: project.deadline,
      status: project.status || "Not Started",
      isPriority: Boolean(project.isPriority),
      delayBlocker: project.delayBlocker,
      previewLink: project.previewLink,
      figmaLink: project.figmaLink,
      driveAssetsLink: project.driveAssetsLink,
      checklist: project.checklist || [],
      tags: project.tags || [],
      briefDocLink: project.briefDocLink,
      notesLastUpdate: project.notesLastUpdate,
      clientChatsLink: project.clientChatsLink,
      createdAt: nowISO(),
      deliveredAt: project.status === "Delivered" ? nowISO() : undefined,
      updatedAt: nowISO(),
    };
    const projects = [created, ...state.projects];
    set({
      ...saveCollection("projects", projects),
      activityLog: logEntry(state, {
        entityType: "project",
        entityId: created.id,
        actorId: actor(state)!.id,
        action: "Created project",
      }),
    });
  },

  updateProject(id, patch) {
    const state = get();
    const project = state.projects.find((item) => item.id === id);
    if (!project || !canEditProject(state, project, patch)) throw new Error("Not allowed.");
    if (patch.status === "On Hold" && !patch.delayBlocker && !project.delayBlocker) {
      throw new Error("On Hold projects need a blocker note.");
    }
    const nextPatch = {
      ...patch,
      deliveredAt:
        patch.status === "Delivered" && !project.deliveredAt ? nowISO() : patch.deliveredAt,
      updatedAt: nowISO(),
    };
    const projects = state.projects.map((item) =>
      item.id === id ? { ...item, ...nextPatch } : item,
    );
    set({
      ...saveCollection("projects", projects),
      activityLog: logEntry(state, {
        entityType: "project",
        entityId: id,
        actorId: actor(state)!.id,
        action: patch.status && patch.status !== project.status ? `Changed status to ${patch.status}` : "Edited project",
      }),
    });
  },

  deleteProject(id) {
    const state = get();
    requireAdmin(state);
    const projects = state.projects.filter((project) => project.id !== id);
    set({
      ...saveCollection("projects", projects),
      activityLog: logEntry(state, {
        entityType: "project",
        entityId: id,
        actorId: actor(state)!.id,
        action: "Deleted project",
      }),
    });
  },

  createTask(task) {
    const state = get();
    requireAdmin(state);
    const created: Task = {
      id: uid("task"),
      personId: task.personId || state.accounts.find((account) => account.accessRole === "Employee")?.id || "",
      projectId: task.projectId,
      clientOrStore: task.clientOrStore || "",
      taskDescription: task.taskDescription || "Untitled task",
      priority: task.priority || "Medium",
      deadline: task.deadline,
      status: task.status || "To Do",
      notes: task.notes,
      assignedById: actor(state)?.id,
      checklist: task.checklist || [],
      createdAt: nowISO(),
      completedAt: task.status === "Done" ? nowISO() : undefined,
    };
    const tasks = [created, ...state.tasks];
    set({
      ...saveCollection("tasks", tasks),
      notifications: notifyMany(
        state,
        [created.personId],
        `New task assigned: ${created.taskDescription}`,
        "/tasks",
      ),
      activityLog: logEntry(state, {
        entityType: "task",
        entityId: created.id,
        actorId: actor(state)!.id,
        action: "Created task",
      }),
    });
  },

  updateTask(id, patch) {
    const state = get();
    const task = state.tasks.find((item) => item.id === id);
    if (!task || !canEditTask(state, task, patch)) throw new Error("Not allowed.");
    const nextPatch = {
      ...patch,
      completedAt:
        patch.status === "Done" && !task.completedAt ? nowISO() : patch.completedAt,
    };
    const tasks = state.tasks.map((item) =>
      item.id === id ? { ...item, ...nextPatch } : item,
    );
    const recipients =
      patch.personId && patch.personId !== task.personId ? [patch.personId] : [];
    set({
      ...saveCollection("tasks", tasks),
      notifications: recipients.length
        ? notifyMany(state, recipients, `Task reassigned: ${task.taskDescription}`, "/tasks")
        : state.notifications,
      activityLog: logEntry(state, {
        entityType: "task",
        entityId: id,
        actorId: actor(state)!.id,
        action: patch.personId && patch.personId !== task.personId ? "Reassigned task" : patch.status ? `Changed status to ${patch.status}` : "Edited task",
      }),
    });
  },

  deleteTask(id) {
    const state = get();
    requireAdmin(state);
    const tasks = state.tasks.filter((task) => task.id !== id);
    set({
      ...saveCollection("tasks", tasks),
      activityLog: logEntry(state, {
        entityType: "task",
        entityId: id,
        actorId: actor(state)!.id,
        action: "Deleted task",
      }),
    });
  },

  upsertUpdate(update) {
    const state = get();
    const user = actor(state);
    if (!user || !update.projectId) throw new Error("Not allowed.");
    const project = state.projects.find((item) => item.id === update.projectId);
    if (!project || !scopedProjects(state.projects, user).some((item) => item.id === project.id)) {
      throw new Error("Not allowed.");
    }
    const item: DailyClientUpdate = {
      id: update.id || uid("upd"),
      projectId: update.projectId,
      date: update.date || new Date().toISOString().slice(0, 10),
      morningUpdate: update.morningUpdate || "",
      eveningUpdate: update.eveningUpdate || "",
      videoRecordingLink: update.videoRecordingLink || "",
      authorId: update.authorId || user.id,
    };
    const dailyUpdates = state.dailyUpdates.some((existing) => existing.id === item.id)
      ? state.dailyUpdates.map((existing) => (existing.id === item.id ? item : existing))
      : [item, ...state.dailyUpdates];
    set(saveCollection("dailyUpdates", dailyUpdates));
  },

  upsertSlot(slot) {
    const state = get();
    const user = actor(state);
    if (!user) throw new Error("Not allowed.");
    const ownerId = slot.teamMemberId || slot.accountId || user.id;
    if (user.accessRole !== "Admin" && ownerId !== user.id) throw new Error("Not allowed.");
    const item: CalendarSlot = {
      id: slot.id || uid("cal"),
      teamMemberId: ownerId,
      accountId: ownerId,
      date: slot.date || new Date().toISOString().slice(0, 10),
      startTime: slot.startTime || "10:00",
      taskText: slot.taskText || "",
      status: slot.status || "To Do",
      priority: slot.priority || "Medium",
      notes: slot.notes,
      taskId: slot.taskId,
    };
    const calendarSlots = state.calendarSlots.some((existing) => existing.id === item.id)
      ? state.calendarSlots.map((existing) => (existing.id === item.id ? item : existing))
      : [...state.calendarSlots, item];
    const taskPatch =
      item.taskId && item.status === "Done"
        ? state.tasks.map((task) =>
            task.id === item.taskId && !taskDone(task)
              ? { ...task, status: "Done" as const, completedAt: nowISO() }
              : task,
          )
        : state.tasks;
    write(STORAGE_KEYS.calendarSlots, calendarSlots);
    write(STORAGE_KEYS.tasks, taskPatch);
    set({ calendarSlots, tasks: taskPatch });
  },

  deleteSlot(id) {
    const state = get();
    const user = actor(state);
    const slot = state.calendarSlots.find((item) => item.id === id);
    if (!slot || !user || (user.accessRole !== "Admin" && slot.teamMemberId !== user.id)) {
      throw new Error("Not allowed.");
    }
    const calendarSlots = state.calendarSlots.filter((item) => item.id !== id);
    set(saveCollection("calendarSlots", calendarSlots));
  },

  createComment(entityType, entityId, text) {
    const state = get();
    const user = actor(state);
    if (!user || !text.trim()) return;
    const comment: Comment = {
      id: uid("comment"),
      entityType,
      entityId,
      authorId: user.id,
      text: text.trim(),
      createdAt: nowISO(),
    };
    const comments = [comment, ...state.comments];
    const recipients =
      entityType === "project"
        ? state.projects
            .filter((project) => project.id === entityId)
            .flatMap((project) => [
              project.mainDeveloperId,
              project.developer2Id,
              project.designerId,
            ])
        : state.tasks.filter((task) => task.id === entityId).map((task) => task.personId);
    set({
      ...saveCollection("comments", comments),
      notifications: notifyMany(
        state,
        recipients.filter((id): id is string => Boolean(id && id !== user.id)),
        `New comment on ${entityType}`,
        entityType === "project" ? "/projects" : "/tasks",
      ),
      activityLog: logEntry(state, {
        entityType,
        entityId,
        actorId: user.id,
        action: "Added comment",
      }),
    });
  },

  upsertResource(resource) {
    const state = get();
    requireAdmin(state);
    const item: ResourceLink = {
      id: resource.id || uid("res"),
      category: resource.category || "General",
      name: resource.name || "Untitled resource",
      value: resource.value || "",
      isSensitive: Boolean(resource.isSensitive),
    };
    const resourceLinks = state.resourceLinks.some((existing) => existing.id === item.id)
      ? state.resourceLinks.map((existing) => (existing.id === item.id ? item : existing))
      : [item, ...state.resourceLinks];
    set(saveCollection("resourceLinks", resourceLinks));
  },

  deleteResource(id) {
    const state = get();
    requireAdmin(state);
    set(saveCollection("resourceLinks", state.resourceLinks.filter((item) => item.id !== id)));
  },

  upsertStorePreview(storePreview) {
    const state = get();
    requireAdmin(state);
    const item: StorePreview = {
      id: storePreview.id || uid("store"),
      storeName: storePreview.storeName || "Untitled store",
      previewLink: storePreview.previewLink,
      password: storePreview.password,
      googleSearchLink: storePreview.googleSearchLink,
    };
    const storePreviews = state.storePreviews.some((existing) => existing.id === item.id)
      ? state.storePreviews.map((existing) => (existing.id === item.id ? item : existing))
      : [item, ...state.storePreviews];
    set(saveCollection("storePreviews", storePreviews));
  },

  deleteStorePreview(id) {
    const state = get();
    requireAdmin(state);
    set(saveCollection("storePreviews", state.storePreviews.filter((item) => item.id !== id)));
  },

  upsertAccount(account) {
    const state = get();
    requireAdmin(state);
    const baseName = account.name || "New teammate";
    const item: Account = {
      id: account.id || uid("acct"),
      name: baseName,
      username: account.username || baseName.split(/\s+/)[0].toLowerCase(),
      passwordHash: account.passwordHash || state.accounts.find((existing) => existing.id === account.id)?.passwordHash || "",
      accessRole: account.accessRole || "Employee",
      jobRoleId: account.jobRoleId || state.jobRoles[0]?.id || "",
      role: account.role || "Team Member",
      colorTag: account.colorTag || "#5B5FEF",
      active: account.active ?? true,
      createdAt: account.createdAt || nowISO(),
    };
    const accounts = state.accounts.some((existing) => existing.id === item.id)
      ? state.accounts.map((existing) => (existing.id === item.id ? item : existing))
      : [item, ...state.accounts];
    set({
      ...saveCollection("accounts", accounts),
      activityLog: logEntry(state, {
        entityType: "account",
        entityId: item.id,
        actorId: actor(state)!.id,
        action: account.id ? "Edited account" : "Created account",
      }),
    });
  },

  deleteAccount(id) {
    const state = get();
    requireAdmin(state);
    set({
      ...saveCollection("accounts", state.accounts.filter((account) => account.id !== id)),
      activityLog: logEntry(state, {
        entityType: "account",
        entityId: id,
        actorId: actor(state)!.id,
        action: "Deleted account",
      }),
    });
  },

  async resetAccountPassword(id, password) {
    const state = get();
    requireAdmin(state);
    const passwordHash = await sha256(password);
    const accounts = state.accounts.map((account) =>
      account.id === id ? { ...account, passwordHash } : account,
    );
    set({
      ...saveCollection("accounts", accounts),
      activityLog: logEntry(state, {
        entityType: "account",
        entityId: id,
        actorId: actor(state)!.id,
        action: "Reset password",
      }),
    });
  },

  upsertJobRole(role) {
    const state = get();
    requireAdmin(state);
    const item: JobRole = {
      id: role.id || uid("role"),
      name: role.name || "New role",
    };
    const jobRoles = state.jobRoles.some((existing) => existing.id === item.id)
      ? state.jobRoles.map((existing) => (existing.id === item.id ? item : existing))
      : [item, ...state.jobRoles];
    set(saveCollection("jobRoles", jobRoles));
  },

  deleteJobRole(id) {
    const state = get();
    requireAdmin(state);
    set(saveCollection("jobRoles", state.jobRoles.filter((role) => role.id !== id)));
  },
}));

import { create } from "zustand";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
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
import { assignedToProject, nowISO, scopedProjects, taskDone, uid } from "./utils";

interface AppState extends Omit<SeedData, "version"> {
  seededVersion: string;
  sessionAccountId?: string;
  authError?: string;
  loading: boolean;
  backendReady: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  bootstrapFirstAdmin: (name: string, username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  changePassword: (accountId: string, nextPassword: string) => Promise<void>;
  markNotificationsRead: () => Promise<void>;
  resetToSeed: () => void;
  exportData: () => SeedData;
  importData: () => void;
  createProject: (project: Partial<Project>) => Promise<void>;
  updateProject: (id: string, patch: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  createTask: (task: Partial<Task>) => Promise<void>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  upsertUpdate: (update: Partial<DailyClientUpdate>) => Promise<void>;
  upsertSlot: (slot: Partial<CalendarSlot>) => Promise<void>;
  deleteSlot: (id: string) => Promise<void>;
  createComment: (entityType: "project" | "task", entityId: string, text: string) => Promise<void>;
  upsertResource: (resource: Partial<ResourceLink>) => Promise<void>;
  deleteResource: (id: string) => Promise<void>;
  upsertStorePreview: (storePreview: Partial<StorePreview>) => Promise<void>;
  deleteStorePreview: (id: string) => Promise<void>;
  upsertAccount: (account: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  resetAccountPassword: (id: string, password: string) => Promise<void>;
  upsertJobRole: (role: Partial<JobRole>) => Promise<void>;
  deleteJobRole: (id: string) => Promise<void>;
  loadRemoteData: () => Promise<void>;
  subscribeRealtime: () => void;
}

let realtimeChannel: RealtimeChannel | undefined;

const emptyState = {
  seededVersion: "supabase",
  sessionAccountId: undefined,
  accounts: [] as Account[],
  jobRoles: [] as JobRole[],
  projects: [] as Project[],
  tasks: [] as Task[],
  dailyUpdates: [] as DailyClientUpdate[],
  calendarSlots: [] as CalendarSlot[],
  resourceLinks: [] as ResourceLink[],
  storePreviews: [] as StorePreview[],
  comments: [] as Comment[],
  activityLog: [] as ActivityLogEntry[],
  notifications: [] as Notification[],
  loading: false,
  backendReady: isSupabaseConfigured,
};

function client() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

function authEmail(username: string) {
  const clean = username.trim().toLowerCase();
  return clean.includes("@") ? clean : `${clean}@openlimits.local`;
}

function actor(state: AppState) {
  return state.accounts.find((account) => account.id === state.sessionAccountId);
}

function requireAdmin(state: AppState) {
  if (actor(state)?.accessRole !== "Admin") throw new Error("Admin permission required.");
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

async function expectOk<T>(promise: PromiseLike<{ data: T; error: { message: string } | null }>) {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return data;
}

const profileFromRow = (row: any): Account => ({
  id: row.id,
  name: row.display_name,
  username: row.username,
  passwordHash: "",
  accessRole: row.access_role,
  jobRoleId: row.job_role_id || "",
  role: row.role || "Team Member",
  colorTag: row.color_tag || "#5B5FEF",
  active: Boolean(row.active),
  createdAt: row.created_at,
});

const projectFromRow = (row: any): Project => ({
  id: row.id,
  projectName: row.project_name,
  clientUsername: row.client_username || "",
  mainDeveloperId: row.main_developer_id || undefined,
  developer2Id: row.developer2_id || undefined,
  designerId: row.designer_id || undefined,
  deadline: row.deadline || undefined,
  status: row.status,
  isPriority: Boolean(row.is_priority),
  delayBlocker: row.delay_blocker || undefined,
  previewLink: row.preview_link || undefined,
  figmaLink: row.figma_link || undefined,
  driveAssetsLink: row.drive_assets_link || undefined,
  checklist: row.checklist || [],
  tags: row.tags || [],
  briefDocLink: row.brief_doc_link || undefined,
  notesLastUpdate: row.notes_last_update || undefined,
  clientChatsLink: row.client_chats_link || undefined,
  createdAt: row.created_at,
  deliveredAt: row.delivered_at || undefined,
  updatedAt: row.updated_at,
});

const taskFromRow = (row: any): Task => ({
  id: row.id,
  personId: row.person_id,
  projectId: row.project_id || undefined,
  clientOrStore: row.client_or_store || "",
  taskDescription: row.task_description,
  priority: row.priority,
  deadline: row.deadline || undefined,
  status: row.status,
  notes: row.notes || undefined,
  assignedById: row.assigned_by_id || undefined,
  checklist: row.checklist || [],
  createdAt: row.created_at,
  completedAt: row.completed_at || undefined,
});

const updateFromRow = (row: any): DailyClientUpdate => ({
  id: row.id,
  projectId: row.project_id,
  date: row.date,
  morningUpdate: row.morning_update || "",
  eveningUpdate: row.evening_update || "",
  videoRecordingLink: row.video_recording_link || "",
  authorId: row.author_id || undefined,
});

const slotFromRow = (row: any): CalendarSlot => ({
  id: row.id,
  teamMemberId: row.team_member_id,
  accountId: row.account_id || undefined,
  date: row.date,
  startTime: String(row.start_time || "").slice(0, 5),
  taskText: row.task_text || "",
  status: row.status || "To Do",
  priority: row.priority || "Medium",
  notes: row.notes || undefined,
  taskId: row.task_id || undefined,
});

const resourceFromRow = (row: any): ResourceLink => ({
  id: row.id,
  category: row.category,
  name: row.name,
  value: row.value,
  isSensitive: Boolean(row.is_sensitive),
});

const storeFromRow = (row: any): StorePreview => ({
  id: row.id,
  storeName: row.store_name,
  previewLink: row.preview_link || undefined,
  password: row.password || undefined,
  googleSearchLink: row.google_search_link || undefined,
});

const commentFromRow = (row: any): Comment => ({
  id: row.id,
  entityType: row.entity_type,
  entityId: row.entity_id,
  authorId: row.author_id,
  text: row.text,
  createdAt: row.created_at,
});

const logFromRow = (row: any): ActivityLogEntry => ({
  id: row.id,
  entityType: row.entity_type,
  entityId: row.entity_id,
  actorId: row.actor_id,
  action: row.action,
  createdAt: row.created_at,
});

const notificationFromRow = (row: any): Notification => ({
  id: row.id,
  recipientId: row.recipient_id,
  message: row.message,
  link: row.link || undefined,
  read: Boolean(row.read),
  createdAt: row.created_at,
});

const projectRow = (project: Project) => ({
  id: project.id,
  project_name: project.projectName,
  client_username: project.clientUsername,
  main_developer_id: project.mainDeveloperId || null,
  developer2_id: project.developer2Id || null,
  designer_id: project.designerId || null,
  deadline: project.deadline || null,
  status: project.status,
  is_priority: project.isPriority,
  delay_blocker: project.delayBlocker || null,
  preview_link: project.previewLink || null,
  figma_link: project.figmaLink || null,
  drive_assets_link: project.driveAssetsLink || null,
  checklist: project.checklist,
  tags: project.tags,
  brief_doc_link: project.briefDocLink || null,
  notes_last_update: project.notesLastUpdate || null,
  client_chats_link: project.clientChatsLink || null,
  created_at: project.createdAt,
  delivered_at: project.deliveredAt || null,
  updated_at: project.updatedAt,
});

const taskRow = (task: Task) => ({
  id: task.id,
  person_id: task.personId,
  project_id: task.projectId || null,
  client_or_store: task.clientOrStore,
  task_description: task.taskDescription,
  priority: task.priority,
  deadline: task.deadline || null,
  status: task.status,
  notes: task.notes || null,
  assigned_by_id: task.assignedById || null,
  checklist: task.checklist,
  created_at: task.createdAt,
  completed_at: task.completedAt || null,
});

const profileRow = (account: Account) => ({
  id: account.id,
  display_name: account.name,
  username: account.username,
  access_role: account.accessRole,
  job_role_id: account.jobRoleId || null,
  role: account.role,
  color_tag: account.colorTag,
  active: account.active,
  created_at: account.createdAt,
});

async function insertActivity(entry: Omit<ActivityLogEntry, "id" | "createdAt">) {
  await expectOk(
    client().from("activity_log").insert({
      id: uid("log"),
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      actor_id: entry.actorId,
      action: entry.action,
      created_at: nowISO(),
    }).select(),
  );
}

async function insertNotifications(recipientIds: string[], message: string, link?: string) {
  const rows = Array.from(new Set(recipientIds.filter(Boolean))).map((recipientId) => ({
    id: uid("notif"),
    recipient_id: recipientId,
    message,
    link: link || null,
    read: false,
    created_at: nowISO(),
  }));
  if (rows.length) await expectOk(client().from("notifications").insert(rows).select());
}

export const useAppStore = create<AppState>((set, get) => ({
  ...emptyState,

  async loadRemoteData() {
    if (!supabase) {
      set({ backendReady: false, authError: "Supabase environment variables are missing." });
      return;
    }
    set({ loading: true, authError: undefined });
    try {
      const [jobRoles, accounts, projects, tasks, dailyUpdates, calendarSlots, resourceLinks, storePreviews, comments, activityLog, notifications] =
        await Promise.all([
          expectOk(supabase.from("job_roles").select("*").order("name")),
          expectOk(supabase.from("profiles").select("*").order("display_name")),
          expectOk(supabase.from("projects").select("*").order("updated_at", { ascending: false })),
          expectOk(supabase.from("tasks").select("*").order("created_at", { ascending: false })),
          expectOk(supabase.from("daily_client_updates").select("*").order("date", { ascending: false })),
          expectOk(supabase.from("calendar_slots").select("*").order("date")),
          expectOk(supabase.from("resource_links").select("*").order("category")),
          expectOk(supabase.from("store_previews").select("*").order("store_name")),
          expectOk(supabase.from("comments").select("*").order("created_at", { ascending: false })),
          expectOk(supabase.from("activity_log").select("*").order("created_at", { ascending: false })),
          expectOk(supabase.from("notifications").select("*").order("created_at", { ascending: false })),
        ]);
      const { data: authData } = await supabase.auth.getUser();
      const sessionAccount = (accounts as any[]).find((account) => account.auth_user_id === authData.user?.id);
      set({
        jobRoles: (jobRoles as any[]).map((role) => ({ id: role.id, name: role.name })),
        accounts: (accounts as any[]).map(profileFromRow),
        projects: (projects as any[]).map(projectFromRow),
        tasks: (tasks as any[]).map(taskFromRow),
        dailyUpdates: (dailyUpdates as any[]).map(updateFromRow),
        calendarSlots: (calendarSlots as any[]).map(slotFromRow),
        resourceLinks: (resourceLinks as any[]).map(resourceFromRow),
        storePreviews: (storePreviews as any[]).map(storeFromRow),
        comments: (comments as any[]).map(commentFromRow),
        activityLog: (activityLog as any[]).map(logFromRow),
        notifications: (notifications as any[]).map(notificationFromRow),
        sessionAccountId: sessionAccount?.id,
        backendReady: true,
        loading: false,
      });
    } catch (error) {
      set({ loading: false, authError: error instanceof Error ? error.message : "Failed to load Supabase data." });
    }
  },

  subscribeRealtime() {
    if (!supabase || realtimeChannel) return;
    realtimeChannel = supabase
      .channel("open-limits-realtime")
      .on("postgres_changes", { event: "*", schema: "public" }, () => {
        void get().loadRemoteData();
      })
      .subscribe();
  },

  async login(username, password) {
    try {
      const { error } = await client().auth.signInWithPassword({
        email: authEmail(username),
        password,
      });
      if (error) throw error;
      await get().loadRemoteData();
      get().subscribeRealtime();
      const user = actor(get());
      if (!user || !user.active) throw new Error("No active app profile is linked to this Supabase user.");
      set({ authError: undefined });
      return true;
    } catch (error) {
      set({ authError: error instanceof Error ? error.message : "Invalid Supabase login." });
      return false;
    }
  },

  async bootstrapFirstAdmin(name, username, password) {
    try {
      const { data, error } = await client().auth.signUp({
        email: authEmail(username),
        password,
      });
      if (error) throw error;
      const authUserId = data.user?.id;
      if (!authUserId) throw new Error("Supabase did not return a user.");
      await expectOk(client().from("profiles").insert({
        id: "acct-admin",
        auth_user_id: authUserId,
        display_name: name,
        username,
        access_role: "Admin",
        role: "Operations Lead",
        color_tag: "#5B5FEF",
        active: true,
        created_at: nowISO(),
      }).select());
      await get().loadRemoteData();
      get().subscribeRealtime();
      return true;
    } catch (error) {
      set({ authError: error instanceof Error ? error.message : "Could not create first admin." });
      return false;
    }
  },

  async logout() {
    if (realtimeChannel && supabase) {
      await supabase.removeChannel(realtimeChannel);
      realtimeChannel = undefined;
    }
    await supabase?.auth.signOut();
    set({ ...emptyState, backendReady: isSupabaseConfigured });
  },

  async changePassword(accountId, nextPassword) {
    const user = actor(get());
    if (!user || user.id !== accountId) throw new Error("You can only change your own password.");
    const { error } = await client().auth.updateUser({ password: nextPassword });
    if (error) throw error;
  },

  async markNotificationsRead() {
    const user = actor(get());
    if (!user) return;
    await expectOk(client().from("notifications").update({ read: true }).eq("recipient_id", user.id).select());
    await get().loadRemoteData();
  },

  resetToSeed() {
    throw new Error("Seed reset has been removed. Supabase is the only source of truth.");
  },

  exportData() {
    const state = get();
    return {
      version: "supabase",
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

  importData() {
    throw new Error("JSON import has been removed. Supabase is the only source of truth.");
  },

  async createProject(project) {
    const state = get();
    requireAdmin(state);
    const item: Project = {
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
    await expectOk(client().from("projects").insert(projectRow(item)).select());
    await insertActivity({ entityType: "project", entityId: item.id, actorId: actor(state)!.id, action: "Created project" });
    await get().loadRemoteData();
  },

  async updateProject(id, patch) {
    const state = get();
    const project = state.projects.find((item) => item.id === id);
    if (!project || !canEditProject(state, project, patch)) throw new Error("Not allowed.");
    if (patch.status === "On Hold" && !patch.delayBlocker && !project.delayBlocker) {
      throw new Error("On Hold projects need a blocker note.");
    }
    const item = {
      ...project,
      ...patch,
      deliveredAt: patch.status === "Delivered" && !project.deliveredAt ? nowISO() : patch.deliveredAt ?? project.deliveredAt,
      updatedAt: nowISO(),
    };
    await expectOk(client().from("projects").update(projectRow(item)).eq("id", id).select());
    await insertActivity({
      entityType: "project",
      entityId: id,
      actorId: actor(state)!.id,
      action: patch.status && patch.status !== project.status ? `Changed status to ${patch.status}` : "Edited project",
    });
    await get().loadRemoteData();
  },

  async deleteProject(id) {
    const state = get();
    requireAdmin(state);
    await expectOk(client().from("projects").delete().eq("id", id).select());
    await insertActivity({ entityType: "project", entityId: id, actorId: actor(state)!.id, action: "Deleted project" });
    await get().loadRemoteData();
  },

  async createTask(task) {
    const state = get();
    requireAdmin(state);
    const item: Task = {
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
    await expectOk(client().from("tasks").insert(taskRow(item)).select());
    await insertNotifications([item.personId], `New task assigned: ${item.taskDescription}`, "/tasks");
    await insertActivity({ entityType: "task", entityId: item.id, actorId: actor(state)!.id, action: "Created task" });
    await get().loadRemoteData();
  },

  async updateTask(id, patch) {
    const state = get();
    const task = state.tasks.find((item) => item.id === id);
    if (!task || !canEditTask(state, task, patch)) throw new Error("Not allowed.");
    const item = {
      ...task,
      ...patch,
      completedAt: patch.status === "Done" && !task.completedAt ? nowISO() : patch.completedAt ?? task.completedAt,
    };
    await expectOk(client().from("tasks").update(taskRow(item)).eq("id", id).select());
    if (patch.personId && patch.personId !== task.personId) {
      await insertNotifications([patch.personId], `Task reassigned: ${task.taskDescription}`, "/tasks");
    }
    await insertActivity({
      entityType: "task",
      entityId: id,
      actorId: actor(state)!.id,
      action: patch.personId && patch.personId !== task.personId ? "Reassigned task" : patch.status ? `Changed status to ${patch.status}` : "Edited task",
    });
    await get().loadRemoteData();
  },

  async deleteTask(id) {
    const state = get();
    requireAdmin(state);
    await expectOk(client().from("tasks").delete().eq("id", id).select());
    await insertActivity({ entityType: "task", entityId: id, actorId: actor(state)!.id, action: "Deleted task" });
    await get().loadRemoteData();
  },

  async upsertUpdate(update) {
    const state = get();
    const user = actor(state);
    if (!user || !update.projectId) throw new Error("Not allowed.");
    const project = state.projects.find((item) => item.id === update.projectId);
    if (!project || !scopedProjects(state.projects, user).some((item) => item.id === project.id)) throw new Error("Not allowed.");
    await expectOk(client().from("daily_client_updates").upsert({
      id: update.id || uid("upd"),
      project_id: update.projectId,
      date: update.date || new Date().toISOString().slice(0, 10),
      morning_update: update.morningUpdate || "",
      evening_update: update.eveningUpdate || "",
      video_recording_link: update.videoRecordingLink || "",
      author_id: update.authorId || user.id,
    }, { onConflict: "project_id,date" }).select());
    await get().loadRemoteData();
  },

  async upsertSlot(slot) {
    const state = get();
    const user = actor(state);
    if (!user) throw new Error("Not allowed.");
    const ownerId = slot.teamMemberId || slot.accountId || user.id;
    if (user.accessRole !== "Admin" && ownerId !== user.id) throw new Error("Not allowed.");
    await expectOk(client().from("calendar_slots").upsert({
      id: slot.id || uid("cal"),
      team_member_id: ownerId,
      account_id: ownerId,
      date: slot.date || new Date().toISOString().slice(0, 10),
      start_time: slot.startTime || "10:00",
      task_text: slot.taskText || "",
      status: slot.status || "To Do",
      priority: slot.priority || "Medium",
      notes: slot.notes || null,
      task_id: slot.taskId || null,
    }).select());
    if (slot.taskId && slot.status === "Done") {
      const task = state.tasks.find((item) => item.id === slot.taskId);
      if (task && !taskDone(task)) await get().updateTask(task.id, { status: "Done" });
    }
    await get().loadRemoteData();
  },

  async deleteSlot(id) {
    const state = get();
    const user = actor(state);
    const slot = state.calendarSlots.find((item) => item.id === id);
    if (!slot || !user || (user.accessRole !== "Admin" && slot.teamMemberId !== user.id)) throw new Error("Not allowed.");
    await expectOk(client().from("calendar_slots").delete().eq("id", id).select());
    await get().loadRemoteData();
  },

  async createComment(entityType, entityId, text) {
    const state = get();
    const user = actor(state);
    if (!user || !text.trim()) return;
    await expectOk(client().from("comments").insert({
      id: uid("comment"),
      entity_type: entityType,
      entity_id: entityId,
      author_id: user.id,
      text: text.trim(),
      created_at: nowISO(),
    }).select());
    const recipients = entityType === "project"
      ? state.projects.filter((project) => project.id === entityId).flatMap((project) => [project.mainDeveloperId, project.developer2Id, project.designerId])
      : state.tasks.filter((task) => task.id === entityId).map((task) => task.personId);
    await insertNotifications(recipients.filter((id): id is string => Boolean(id && id !== user.id)), `New comment on ${entityType}`, entityType === "project" ? "/projects" : "/tasks");
    await insertActivity({ entityType, entityId, actorId: user.id, action: "Added comment" });
    await get().loadRemoteData();
  },

  async upsertResource(resource) {
    requireAdmin(get());
    await expectOk(client().from("resource_links").upsert({
      id: resource.id || uid("res"),
      category: resource.category || "General",
      name: resource.name || "Untitled resource",
      value: resource.value || "",
      is_sensitive: Boolean(resource.isSensitive),
    }).select());
    await get().loadRemoteData();
  },

  async deleteResource(id) {
    requireAdmin(get());
    await expectOk(client().from("resource_links").delete().eq("id", id).select());
    await get().loadRemoteData();
  },

  async upsertStorePreview(storePreview) {
    requireAdmin(get());
    await expectOk(client().from("store_previews").upsert({
      id: storePreview.id || uid("store"),
      store_name: storePreview.storeName || "Untitled store",
      preview_link: storePreview.previewLink || null,
      password: storePreview.password || null,
      google_search_link: storePreview.googleSearchLink || null,
    }).select());
    await get().loadRemoteData();
  },

  async deleteStorePreview(id) {
    requireAdmin(get());
    await expectOk(client().from("store_previews").delete().eq("id", id).select());
    await get().loadRemoteData();
  },

  async upsertAccount(account) {
    const state = get();
    requireAdmin(state);
    const baseName = account.name || "New teammate";
    const item: Account = {
      id: account.id || uid("acct"),
      name: baseName,
      username: account.username || baseName.split(/\s+/)[0].toLowerCase(),
      passwordHash: "",
      accessRole: account.accessRole || "Employee",
      jobRoleId: account.jobRoleId || state.jobRoles[0]?.id || "",
      role: account.role || "Team Member",
      colorTag: account.colorTag || "#5B5FEF",
      active: account.active ?? true,
      createdAt: account.createdAt || nowISO(),
    };
    await expectOk(client().from("profiles").upsert(profileRow(item)).select());
    await insertActivity({ entityType: "account", entityId: item.id, actorId: actor(state)!.id, action: account.id ? "Edited account" : "Created account" });
    await get().loadRemoteData();
  },

  async deleteAccount(id) {
    const state = get();
    requireAdmin(state);
    await expectOk(client().from("profiles").delete().eq("id", id).select());
    await insertActivity({ entityType: "account", entityId: id, actorId: actor(state)!.id, action: "Deleted account" });
    await get().loadRemoteData();
  },

  async resetAccountPassword() {
    throw new Error("Passwords are managed by Supabase Auth.");
  },

  async upsertJobRole(role) {
    requireAdmin(get());
    await expectOk(client().from("job_roles").upsert({
      id: role.id || uid("role"),
      name: role.name || "New role",
    }).select());
    await get().loadRemoteData();
  },

  async deleteJobRole(id) {
    requireAdmin(get());
    await expectOk(client().from("job_roles").delete().eq("id", id).select());
    await get().loadRemoteData();
  },
}));

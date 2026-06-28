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
  StorePreview,
  Task,
} from "../types";
import { isSupabaseConfigured, supabase } from "./supabase";

export type SupabaseSyncPayload = {
  accounts: Account[];
  jobRoles: JobRole[];
  projects: Project[];
  tasks: Task[];
  dailyUpdates: DailyClientUpdate[];
  calendarSlots: CalendarSlot[];
  resourceLinks: ResourceLink[];
  storePreviews: StorePreview[];
  comments: Comment[];
  activityLog: ActivityLogEntry[];
  notifications: Notification[];
};

function requireClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  return supabase;
}

const stripEmpty = <T extends Record<string, unknown>>(value: T) =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== ""),
  );

export async function pushLocalDataToSupabase(payload: SupabaseSyncPayload) {
  const client = requireClient();

  const tables: Array<[string, Record<string, unknown>[]]> = [
    [
      "job_roles",
      payload.jobRoles.map((role) => ({
        id: role.id,
        name: role.name,
      })),
    ],
    [
      "profiles",
      payload.accounts.map((account) => ({
        id: account.id,
        display_name: account.name,
        username: account.username,
        access_role: account.accessRole,
        job_role_id: account.jobRoleId,
        role: account.role,
        color_tag: account.colorTag,
        active: account.active,
        created_at: account.createdAt,
      })),
    ],
    [
      "projects",
      payload.projects.map((project) =>
        stripEmpty({
          id: project.id,
          project_name: project.projectName,
          client_username: project.clientUsername,
          main_developer_id: project.mainDeveloperId,
          developer2_id: project.developer2Id,
          designer_id: project.designerId,
          deadline: project.deadline,
          status: project.status,
          is_priority: project.isPriority,
          delay_blocker: project.delayBlocker,
          preview_link: project.previewLink,
          figma_link: project.figmaLink,
          drive_assets_link: project.driveAssetsLink,
          checklist: project.checklist,
          tags: project.tags,
          brief_doc_link: project.briefDocLink,
          notes_last_update: project.notesLastUpdate,
          client_chats_link: project.clientChatsLink,
          created_at: project.createdAt,
          delivered_at: project.deliveredAt,
          updated_at: project.updatedAt,
        }),
      ),
    ],
    [
      "tasks",
      payload.tasks.map((task) =>
        stripEmpty({
          id: task.id,
          person_id: task.personId,
          project_id: task.projectId,
          client_or_store: task.clientOrStore,
          task_description: task.taskDescription,
          priority: task.priority,
          deadline: task.deadline,
          status: task.status,
          notes: task.notes,
          assigned_by_id: task.assignedById,
          checklist: task.checklist,
          created_at: task.createdAt,
          completed_at: task.completedAt,
        }),
      ),
    ],
    [
      "daily_client_updates",
      payload.dailyUpdates.map((update) =>
        stripEmpty({
          id: update.id,
          project_id: update.projectId,
          date: update.date,
          morning_update: update.morningUpdate,
          evening_update: update.eveningUpdate,
          video_recording_link: update.videoRecordingLink,
          author_id: update.authorId,
        }),
      ),
    ],
    [
      "calendar_slots",
      payload.calendarSlots.map((slot) =>
        stripEmpty({
          id: slot.id,
          team_member_id: slot.teamMemberId,
          account_id: slot.accountId,
          date: slot.date,
          start_time: slot.startTime,
          task_text: slot.taskText,
          status: slot.status,
          priority: slot.priority,
          notes: slot.notes,
          task_id: slot.taskId,
        }),
      ),
    ],
    [
      "resource_links",
      payload.resourceLinks.map((resource) => ({
        id: resource.id,
        category: resource.category,
        name: resource.name,
        value: resource.value,
        is_sensitive: resource.isSensitive,
      })),
    ],
    [
      "store_previews",
      payload.storePreviews.map((store) =>
        stripEmpty({
          id: store.id,
          store_name: store.storeName,
          preview_link: store.previewLink,
          password: store.password,
          google_search_link: store.googleSearchLink,
        }),
      ),
    ],
    [
      "comments",
      payload.comments.map((comment) => ({
        id: comment.id,
        entity_type: comment.entityType,
        entity_id: comment.entityId,
        author_id: comment.authorId,
        text: comment.text,
        created_at: comment.createdAt,
      })),
    ],
    [
      "activity_log",
      payload.activityLog.map((entry) => ({
        id: entry.id,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        actor_id: entry.actorId,
        action: entry.action,
        created_at: entry.createdAt,
      })),
    ],
    [
      "notifications",
      payload.notifications.map((notification) => ({
        id: notification.id,
        recipient_id: notification.recipientId,
        message: notification.message,
        link: notification.link,
        read: notification.read,
        created_at: notification.createdAt,
      })),
    ],
  ];

  for (const [table, rows] of tables) {
    if (!rows.length) continue;
    const { error } = await client.from(table).upsert(rows);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

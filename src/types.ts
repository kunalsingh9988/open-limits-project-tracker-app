export type AccessRole = "Admin" | "Employee";

export interface JobRole {
  id: string;
  name: string;
}

export interface Account {
  id: string;
  name: string;
  username: string;
  passwordHash: string;
  accessRole: AccessRole;
  jobRoleId: string;
  role: string;
  colorTag: string;
  active: boolean;
  createdAt: string;
}

export type ProjectStatus = string;

export interface ChecklistItem {
  text: string;
  done: boolean;
}

export interface ProjectDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  addedAt: string;
}

export interface ProjectLink {
  id: string;
  label: string;
  url: string;
}

export interface Project {
  id: string;
  projectName: string;
  clientUsername: string;
  mainDeveloperId?: string;
  developer2Id?: string;
  designerId?: string;
  deadline?: string;
  status: ProjectStatus;
  isPriority: boolean;
  delayBlocker?: string;
  previewLink?: string;
  figmaLink?: string;
  driveAssetsLink?: string;
  checklist: ChecklistItem[];
  tags: string[];
  briefDocLink?: string;
  notesLastUpdate?: string;
  clientChatsLink?: string;
  projectDocuments: ProjectDocument[];
  projectLinks: ProjectLink[];
  createdAt: string;
  deliveredAt?: string;
  updatedAt: string;
}

export type TaskStatus = "To Do" | "In Progress" | "Done" | "Client Waiting";
export type Priority = "Low" | "Medium" | "High";

export interface Task {
  id: string;
  personId: string;
  projectId?: string;
  clientOrStore: string;
  taskDescription: string;
  priority: Priority;
  deadline?: string;
  status: TaskStatus;
  notes?: string;
  assignedById?: string;
  checklist: ChecklistItem[];
  createdAt: string;
  completedAt?: string;
}

export interface DailyClientUpdate {
  id: string;
  projectId: string;
  date: string;
  morningUpdate?: string;
  eveningUpdate?: string;
  videoRecordingLink?: string;
  authorId?: string;
}

export interface CalendarSlot {
  id: string;
  teamMemberId: string;
  accountId?: string;
  date: string;
  startTime: string;
  taskText?: string;
  status?: "To Do" | "Working" | "Done";
  priority?: Priority;
  notes?: string;
  taskId?: string;
}

export interface ResourceLink {
  id: string;
  category:
    | "SOP"
    | "Tutorial"
    | "Tool"
    | "Figma"
    | "Account"
    | "Inspiration"
    | "General";
  name: string;
  value: string;
  isSensitive: boolean;
}

export interface StorePreview {
  id: string;
  storeName: string;
  previewLink?: string;
  password?: string;
  googleSearchLink?: string;
}

export interface Comment {
  id: string;
  entityType: "project" | "task";
  entityId: string;
  authorId: string;
  text: string;
  parentId?: string;
  reactions: Record<string, string>;
  createdAt: string;
}

export interface ActivityLogEntry {
  id: string;
  entityType: "project" | "task" | "account";
  entityId: string;
  actorId: string;
  action: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface SeedData {
  version: string;
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
}

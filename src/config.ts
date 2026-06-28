import type { Priority, ProjectStatus, TaskStatus } from "./types";

export const STORAGE_KEYS = {
  accounts: "openlimits.accounts",
  jobRoles: "openlimits.jobRoles",
  projects: "openlimits.projects",
  tasks: "openlimits.tasks",
  dailyUpdates: "openlimits.dailyUpdates",
  calendarSlots: "openlimits.calendarSlots",
  resourceLinks: "openlimits.resourceLinks",
  storePreviews: "openlimits.storePreviews",
  comments: "openlimits.comments",
  activityLog: "openlimits.activityLog",
  notifications: "openlimits.notifications",
  session: "openlimits.session",
  seededVersion: "openlimits.seededVersion",
} as const;

export const DONE_PERCENT_ON_TRACK = 70;
export const DONE_PERCENT_AT_RISK = 20;

export const PROJECT_STATUSES: ProjectStatus[] = [
  "Not Started",
  "Development In Progress",
  "UI In Progress",
  "Revision",
  "Completed",
  "Delivered",
  "On Hold",
  "Cancelled",
];

export const TASK_STATUSES: TaskStatus[] = [
  "To Do",
  "In Progress",
  "Client Waiting",
  "Done",
];

export const PRIORITIES: Priority[] = ["Low", "Medium", "High"];

export const UPDATE_TEMPLATE =
  "What We've Done:\n\nWhat We're Working On:\n\nWhat We Need From You:";

export const TIME_SLOTS = Array.from({ length: 17 }, (_, index) => {
  const totalMinutes = 10 * 60 + index * 30;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
});

import { differenceInCalendarDays, format, isBefore, parseISO } from "date-fns";
import type { Account, Project, Task } from "./types";
import { DONE_PERCENT_AT_RISK, DONE_PERCENT_ON_TRACK } from "./config";

export const todayISO = () => format(new Date(), "yyyy-MM-dd");
export const nowISO = () => new Date().toISOString();
export const uid = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;

export async function sha256(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function assignedToProject(project: Project, accountId: string) {
  return [
    project.mainDeveloperId,
    project.developer2Id,
    project.designerId,
  ].includes(accountId);
}

export function scopedProjects(
  projects: Project[],
  account: Account | undefined,
) {
  if (!account) return [];
  if (account.accessRole === "Admin") return projects;
  return projects.filter((project) => assignedToProject(project, account.id));
}

export function scopedTasks(
  tasks: Task[],
  account: Account | undefined,
  projects: Project[] = [],
) {
  if (!account) return [];
  if (account.accessRole === "Admin") return tasks;
  return tasks.filter((task) => {
    if (task.personId !== account.id) return false;
    if (!task.projectId) return true;
    const project = projects.find((item) => item.id === task.projectId);
    return Boolean(project && assignedToProject(project, account.id));
  });
}

export function daysLeft(deadline?: string) {
  if (!deadline) return undefined;
  return differenceInCalendarDays(parseISO(deadline), new Date());
}

export function isOverdue(deadline: string | undefined, done: boolean) {
  if (!deadline || done) return false;
  return isBefore(parseISO(deadline), parseISO(todayISO()));
}

export function checklistPercent(items: { done: boolean }[]) {
  if (!items.length) return 0;
  return Math.round((items.filter((item) => item.done).length / items.length) * 100);
}

export function ratingFor(donePercent: number, overdue: number) {
  if (overdue >= 3 || donePercent < DONE_PERCENT_AT_RISK) return "At risk";
  if (overdue >= 1) return "Watch";
  if (donePercent >= DONE_PERCENT_ON_TRACK) return "On track";
  return "Watch";
}

export function projectDone(project: Project) {
  return project.status === "Completed" || project.status === "Delivered";
}

export function taskDone(task: Task) {
  return task.status === "Done";
}

export function copyText(value: string) {
  return navigator.clipboard?.writeText(value);
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function readJsonFile<T>(file: File): Promise<T> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)) as T);
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsText(file);
  });
}

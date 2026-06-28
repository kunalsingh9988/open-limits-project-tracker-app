import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as XLSX from "xlsx";

const outFile = path.resolve("src/data/seed.json");
const workbookPath = process.argv[2];
const now = new Date().toISOString();
const date = (offset) => {
  const next = new Date();
  next.setDate(next.getDate() + offset);
  return next.toISOString().slice(0, 10);
};
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const id = (prefix, value) =>
  `${prefix}-${String(value || crypto.randomUUID()).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)}`;

function fallbackSeed() {
  const roles = [
    { id: "role-dev", name: "Developer" },
    { id: "role-des", name: "Designer" },
    { id: "role-dev-pm", name: "Developer & PM" },
    { id: "role-des-pm", name: "Designer & PM" },
  ];
  const accounts = [
    {
      id: "acct-admin",
      name: "Open Limits Admin",
      username: "admin",
      passwordHash: hash("admin123"),
      accessRole: "Admin",
      jobRoleId: "role-dev-pm",
      role: "Operations Lead",
      colorTag: "#5B5FEF",
      active: true,
      createdAt: now,
    },
    {
      id: "acct-kunal",
      name: "Kunal Sharma",
      username: "kunal",
      passwordHash: hash("kunal123"),
      accessRole: "Employee",
      jobRoleId: "role-dev-pm",
      role: "Developer & PM",
      colorTag: "#2563EB",
      active: true,
      createdAt: now,
    },
    {
      id: "acct-harsh",
      name: "Harsh Mehta",
      username: "harsh",
      passwordHash: hash("harsh123"),
      accessRole: "Employee",
      jobRoleId: "role-des",
      role: "Designer",
      colorTag: "#EA580C",
      active: true,
      createdAt: now,
    },
    {
      id: "acct-sudhir",
      name: "Sudhir Rao",
      username: "sudhir",
      passwordHash: hash("sudhir123"),
      accessRole: "Employee",
      jobRoleId: "role-dev",
      role: "Developer",
      colorTag: "#059669",
      active: true,
      createdAt: now,
    },
    {
      id: "acct-avni",
      name: "Avni Shah",
      username: "avni",
      passwordHash: hash("avni123"),
      accessRole: "Employee",
      jobRoleId: "role-des-pm",
      role: "Designer & PM",
      colorTag: "#7C3AED",
      active: true,
      createdAt: now,
    },
  ];
  const projects = [
    {
      id: "proj-aura",
      projectName: "Aura Skin Shopify Refresh",
      clientUsername: "aura.skin",
      mainDeveloperId: "acct-kunal",
      designerId: "acct-harsh",
      deadline: date(2),
      status: "Development In Progress",
      isPriority: true,
      delayBlocker: "",
      previewLink: "https://example.com/aura-preview",
      figmaLink: "https://figma.com/file/aura",
      driveAssetsLink: "https://drive.google.com/aura-assets",
      checklist: [
        { text: "Homepage sections", done: true },
        { text: "Product page QA", done: false },
        { text: "Mobile pass", done: false },
      ],
      tags: ["Shopify", "Priority"],
      briefDocLink: "https://docs.google.com/aura-brief",
      notesLastUpdate: "Awaiting final product photos.",
      clientChatsLink: "https://chat.example.com/aura",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "proj-nova",
      projectName: "Nova Home Landing Page",
      clientUsername: "novahome",
      mainDeveloperId: "acct-sudhir",
      designerId: "acct-avni",
      deadline: date(-1),
      status: "Revision",
      isPriority: false,
      delayBlocker: "Client has not approved hero copy.",
      previewLink: "https://example.com/nova",
      checklist: [
        { text: "Design approval", done: true },
        { text: "Revision copy", done: false },
      ],
      tags: ["Landing", "Copy"],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "proj-calm",
      projectName: "CalmCart Delivered Store",
      clientUsername: "calmcart",
      mainDeveloperId: "acct-kunal",
      designerId: "acct-avni",
      deadline: date(-10),
      status: "Delivered",
      isPriority: false,
      previewLink: "https://example.com/calmcart",
      checklist: [{ text: "Handover complete", done: true }],
      tags: ["Delivered"],
      clientChatsLink: "https://chat.example.com/calmcart",
      createdAt: now,
      deliveredAt: date(-3),
      updatedAt: now,
    },
  ];
  const tasks = [
    {
      id: "task-aura-pdp",
      personId: "acct-kunal",
      projectId: "proj-aura",
      clientOrStore: "aura.skin",
      taskDescription: "Finish product page responsive QA",
      priority: "High",
      deadline: date(1),
      status: "In Progress",
      notes: "Desktop pass is done.",
      assignedById: "acct-admin",
      checklist: [
        { text: "Check variants", done: true },
        { text: "Check sticky ATC", done: false },
      ],
      createdAt: now,
    },
    {
      id: "task-aura-visuals",
      personId: "acct-harsh",
      projectId: "proj-aura",
      clientOrStore: "aura.skin",
      taskDescription: "Export homepage image replacements",
      priority: "Medium",
      deadline: date(0),
      status: "To Do",
      assignedById: "acct-admin",
      checklist: [],
      createdAt: now,
    },
    {
      id: "task-nova-copy",
      personId: "acct-avni",
      projectId: "proj-nova",
      clientOrStore: "novahome",
      taskDescription: "Apply approved revision copy",
      priority: "High",
      deadline: date(-1),
      status: "Client Waiting",
      notes: "Waiting on final headline.",
      assignedById: "acct-admin",
      checklist: [{ text: "Send reminder", done: true }],
      createdAt: now,
    },
  ];
  return {
    version: "fallback-2026-06-28",
    accounts,
    jobRoles: roles,
    projects,
    tasks,
    dailyUpdates: [
      {
        id: "upd-aura-today",
        projectId: "proj-aura",
        date: date(0),
        morningUpdate: "Homepage sections are complete. Product QA is underway.",
        eveningUpdate: "",
        videoRecordingLink: "",
        authorId: "acct-kunal",
      },
    ],
    calendarSlots: [
      {
        id: "cal-kunal-10",
        teamMemberId: "acct-kunal",
        accountId: "acct-kunal",
        date: date(0),
        startTime: "10:00",
        taskText: "Aura PDP QA",
        status: "Working",
        priority: "High",
        taskId: "task-aura-pdp",
      },
      {
        id: "cal-harsh-12",
        teamMemberId: "acct-harsh",
        accountId: "acct-harsh",
        date: date(0),
        startTime: "12:00",
        taskText: "Aura visual exports",
        status: "To Do",
        priority: "Medium",
        taskId: "task-aura-visuals",
      },
    ],
    resourceLinks: [
      {
        id: "res-sop-launch",
        category: "SOP",
        name: "Store Launch QA SOP",
        value: "https://docs.example.com/store-launch-qa",
        isSensitive: false,
      },
      {
        id: "res-theme-account",
        category: "Account",
        name: "Theme library login",
        value: "theme@example.com / theme-pass-2026",
        isSensitive: true,
      },
      {
        id: "res-inspo-layouts",
        category: "Inspiration",
        name: "High-converting PDP patterns",
        value: "https://example.com/pdp-inspiration",
        isSensitive: false,
      },
    ],
    storePreviews: [
      {
        id: "store-aura",
        storeName: "Aura Skin",
        previewLink: "https://aura-preview.example.com",
        password: "aura2026",
        googleSearchLink: "https://www.google.com/search?q=Aura+Skin",
      },
      {
        id: "store-calmcart",
        storeName: "CalmCart",
        previewLink: "https://calmcart.example.com",
        password: "delivered",
        googleSearchLink: "https://www.google.com/search?q=CalmCart",
      },
    ],
    comments: [],
    activityLog: [],
    notifications: [
      {
        id: "notif-kunal-task",
        recipientId: "acct-kunal",
        message: "You have a high priority task due tomorrow.",
        link: "/tasks",
        read: false,
        createdAt: now,
      },
    ],
  };
}

const text = (value) => String(value ?? "").trim();
const findAccount = (accounts, value) => {
  const needle = text(value).toLowerCase();
  return accounts.find(
    (account) =>
      account.name.toLowerCase().includes(needle) ||
      account.username.toLowerCase() === needle,
  )?.id;
};

function workbookSeed(file) {
  const wb = XLSX.readFile(file);
  const skip = new Set([
    "Project list",
    "Sheet8",
    "TEMP Copy of ✅ Delivered Projec",
    "📋 How To Use",
  ]);
  const seed = fallbackSeed();
  seed.version = `workbook-${Date.now()}`;
  seed.projects = [];
  seed.tasks = [];
  seed.dailyUpdates = [];
  seed.calendarSlots = [];
  seed.resourceLinks = [];
  seed.storePreviews = [];

  const sheetRows = (name) => {
    const sheet = wb.Sheets[name];
    return sheet ? XLSX.utils.sheet_to_json(sheet, { defval: "" }) : [];
  };

  for (const name of wb.SheetNames) {
    if (skip.has(name)) continue;
    const rows = sheetRows(name);
    if (name === "Team Dashboard final" && rows.length) {
      const employees = rows
        .map((row) => {
          const fullName = text(row.Name || row["Team Member"] || row.Member);
          if (!fullName) return null;
          const first = fullName.split(/\s+/)[0].toLowerCase();
          const roleName = text(row.Role || row["Job Role"] || "Employee");
          let jobRole = seed.jobRoles.find((role) => role.name === roleName);
          if (!jobRole) {
            jobRole = { id: id("role", roleName), name: roleName };
            seed.jobRoles.push(jobRole);
          }
          return {
            id: id("acct", fullName),
            name: fullName,
            username: first,
            passwordHash: hash(`${first}123`),
            accessRole: "Employee",
            jobRoleId: jobRole.id,
            role: roleName,
            colorTag: text(row.Color || row.Tag) || "#5B5FEF",
            active: true,
            createdAt: now,
          };
        })
        .filter(Boolean);
      seed.accounts = [seed.accounts[0], ...employees];
    }

    if (name === "📊 Project Tracker" || name === "✅ Delivered Projects") {
      let priority = false;
      for (const row of rows) {
        const firstCell = text(Object.values(row)[0]);
        if (/priority/i.test(firstCell)) priority = true;
        if (/not assigned|—|dev|des/i.test(firstCell) && firstCell.length > 3) continue;
        const projectName = text(
          row["Project Name"] || row.Project || row.Client || row["Client Username"],
        );
        if (!projectName || /instruction|placeholder/i.test(projectName)) continue;
        const status = name === "✅ Delivered Projects" ? "Delivered" : text(row.Status) || "Not Started";
        seed.projects.push({
          id: id("proj", `${projectName}-${seed.projects.length}`),
          projectName,
          clientUsername: text(row["Client Username"] || row.Client || projectName),
          mainDeveloperId: findAccount(seed.accounts, row.Developer || row["Main Developer"]),
          developer2Id: findAccount(seed.accounts, row["Developer 2"]),
          designerId: findAccount(seed.accounts, row.Designer),
          deadline: text(row.Deadline || row.Date) || undefined,
          status,
          isPriority: priority,
          delayBlocker: text(row.Blocker || row["Delay Blocker"]),
          previewLink: text(row.Preview || row["Preview Link"]),
          figmaLink: text(row.Figma || row["Figma Link"]),
          driveAssetsLink: text(row.Assets || row["Drive Assets"]),
          checklist: [],
          tags: priority ? ["Priority"] : [],
          briefDocLink: text(row.Brief || row["Brief Doc"]),
          notesLastUpdate: text(row.Notes || row["Last Update"]),
          clientChatsLink: text(row["Client Chats"] || row["Client Chats Link"]),
          createdAt: now,
          deliveredAt: name === "✅ Delivered Projects" ? text(row.Delivered || row.Date) || now : undefined,
          updatedAt: now,
        });
      }
    }

    if (name === "Task Assigner final") {
      for (const row of rows) {
        const desc = text(row.Task || row["Task Description"] || row.Description);
        if (!desc) continue;
        seed.tasks.push({
          id: id("task", `${desc}-${seed.tasks.length}`),
          personId: findAccount(seed.accounts, row.Person || row.Assignee) || seed.accounts[1]?.id,
          projectId: undefined,
          clientOrStore: text(row.Client || row.Store || row["Client/Store"]),
          taskDescription: desc,
          priority: text(row.Priority) || "Medium",
          deadline: text(row.Deadline || row.Date) || undefined,
          status: text(row.Status) || "To Do",
          notes: text(row.Notes),
          assignedById: "acct-admin",
          checklist: [],
          createdAt: now,
        });
      }
    }

    if (name === "📎 Important Links") {
      for (const row of rows) {
        const value = text(row.Link || row.Value || row.URL || row.Password);
        const label = text(row.Name || row.Title || row.Tool || value);
        if (!value || !label) continue;
        const sensitive = /password|login|account|credential/i.test(`${label} ${value}`);
        seed.resourceLinks.push({
          id: id("res", `${label}-${seed.resourceLinks.length}`),
          category: sensitive ? "Account" : "General",
          name: label,
          value,
          isSensitive: sensitive,
        });
      }
    }

    if (name === "All Store Preview links") {
      for (const row of rows) {
        const store = text(row.Store || row["Store Name"] || row.Name);
        if (!store) continue;
        seed.storePreviews.push({
          id: id("store", `${store}-${seed.storePreviews.length}`),
          storeName: store,
          previewLink: text(row.Preview || row.Link || row["Preview Link"]),
          password: text(row.Password),
          googleSearchLink: text(row.Google || row["Google Search"]),
        });
      }
    }

    if (name === "Social media posting") {
      for (const row of rows) {
        const value = text(row.Link || row.Value || row.URL);
        const label = text(row.Name || row.Title || value);
        if (!value) continue;
        seed.resourceLinks.push({
          id: id("res-inspo", `${label}-${seed.resourceLinks.length}`),
          category: "Inspiration",
          name: label,
          value,
          isSensitive: false,
        });
      }
    }
  }
  return seed;
}

const seed =
  workbookPath && fs.existsSync(workbookPath)
    ? workbookSeed(path.resolve(workbookPath))
    : fallbackSeed();

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(seed, null, 2)}\n`);
console.log(
  workbookPath && fs.existsSync(workbookPath)
    ? `Parsed workbook seed to ${outFile}`
    : `No workbook supplied; wrote fallback seed to ${outFile}`,
);

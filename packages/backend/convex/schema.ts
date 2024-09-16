import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    openAIApiKey: v.optional(v.string()),
  }).index("email", ["email"]),
  projects: defineTable({
    name: v.string(),
    description: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("createdBy", ["createdBy"]),
  tasks: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    description: v.string(),
    status: v.string(), // We'll use 'todo', 'in_progress', 'done'
    assignedTo: v.optional(v.id("users")), // Make this optional
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_assignee", ["assignedTo"]), // Add this index for querying tasks by assignee
  comments: defineTable({
    taskId: v.id("tasks"),
    userId: v.id("users"),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_task", ["taskId"]),
  channels: defineTable({
    name: v.string(),
  }),
  messages: defineTable({
    content: v.string(),
    channelId: v.id("channels"),
    userId: v.id("users"),
    timestamp: v.number(),
  }).index("by_channel", ["channelId", "timestamp"]),
});

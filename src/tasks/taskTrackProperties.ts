/**
 * Halo tasks — shared Pendo track-event properties.
 *
 * `task_completed` / `task_reopened` are emitted from two places — the Lists
 * row checkbox (ListsPage) and the Edit task modal (TaskFormModal) — so their
 * payloads are built here once and both emitters report identical
 * definitions. They mirror the Dashboard KPIs: "overdue" is the Overdue KPI
 * predicate and cycle time is the Avg cycle time KPI (completedAt − createdAt,
 * in days).
 *
 * Pure functions — no React, no storage, no Pendo runtime. The `pendo.track`
 * call itself stays at each emitting call site.
 */

import type { PendoTrackProperties } from '../pendo/track'
import type { Task } from './types'

/** The control that moved a task into / out of 'done'. */
export type TaskStatusChangeMethod = 'checkbox' | 'edit_modal'

/** Dashboard Overdue-KPI predicate: still open, with a due date in the past. */
export function isTaskOverdue(task: Task, now: Date = new Date()): boolean {
  return task.status !== 'done' && task.dueDate !== null && new Date(task.dueDate) < now
}

/**
 * `task_completed` properties for `before` (open) → `after` ('done', with
 * `completedAt` stamped by `tasksRepo.updateTask`).
 */
export function taskCompletedProperties(
  before: Task,
  after: Task,
  completionMethod: TaskStatusChangeMethod,
  visitorId: string,
): PendoTrackProperties {
  const completedMs = after.completedAt ? new Date(after.completedAt).getTime() : Date.now()
  const cycleTimeDays = (completedMs - new Date(after.createdAt).getTime()) / 86_400_000
  return {
    taskId: after.id,
    priority: after.priority,
    previousStatus: before.status,
    completionMethod,
    wasOverdue: isTaskOverdue(before),
    cycleTimeDays: Number(cycleTimeDays.toFixed(1)),
    assigneeIsSelf: after.assignee.id === visitorId,
  }
}

/** `task_reopened` properties for `before` ('done') → `after` (restored status). */
export function taskReopenedProperties(
  before: Task,
  after: Task,
  reopenMethod: TaskStatusChangeMethod,
): PendoTrackProperties {
  return {
    taskId: after.id,
    priority: after.priority,
    restoredStatus: after.status,
    reopenMethod,
    // Separates mis-clicks (≈0) from genuine reopenings (hours or days later).
    minutesSinceCompleted: before.completedAt
      ? Number(((Date.now() - new Date(before.completedAt).getTime()) / 60_000).toFixed(1))
      : null,
  }
}

/**
 * Buckets an assignee filter value (`'all'` or an assignee id) for analytics.
 * Raw assignee ids are per-browser demo data — meaningless in aggregate — and
 * the visitor's own id must not ride along as a property (the agent already
 * attaches it).
 */
export function assigneeFilterScope(
  value: string,
  visitorId: string | undefined,
): 'all' | 'self' | 'teammate' {
  if (value === 'all') return 'all'
  return value === visitorId ? 'self' : 'teammate'
}

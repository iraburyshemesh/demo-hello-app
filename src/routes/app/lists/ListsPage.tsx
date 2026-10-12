/**
 * Halo Lists page — `/app/lists` (Phase 4, plan 04-03 Task 2).
 *
 * Page composer for the Phase 4 Lists surface. Closes LIST-01..09:
 *
 *   - LIST-01: page header ("Tasks" title + "New task" button) + table or
 *     empty state inside the AppShell.
 *   - LIST-02: TaskFormModal mode='create' → `tasksRepo.createTask`.
 *   - LIST-03: TaskFormModal mode='edit' → `tasksRepo.updateTask`.
 *   - LIST-04: leading Checkbox column toggles `status` via
 *     `tasksRepo.updateTask({ status })`; the repo owns `completedAt` (D-09).
 *   - LIST-05: DeleteConfirmModal → `tasksRepo.deleteTask`; dual-triggered
 *     from row kebab AND edit-modal footer "Delete task".
 *   - LIST-06: TanStack getSortedRowModel + per-column header sort.
 *   - LIST-07: three Select filters (Status / Priority / Assignee), ANDed.
 *   - LIST-08: ListsEmptyState renders when no tasks exist; FilteredEmptyState
 *     renders when filters yield zero matches.
 *   - LIST-09: every CRUD path persists via tasksRepo → writeJSON (FND-04).
 *
 * State surface (D-05 — component state only, no URL persistence):
 *   - statusFilter / priorityFilter / assigneeFilter ('all' | enum value)
 *   - refreshKey (bump after every mutation so the useMemo re-reads listTasks)
 *   - createOpen / editTask / deleteTarget (modal open + identity)
 *   - deleteSource (which control opened the delete confirm — Pendo context)
 *
 * Refresh pattern (D-05 + Plan analog from Dashboard): `useMemo` keyed on
 * `[workspaceId, refreshKey]`. Mutations call `tasksRepo.*` then `refresh()`
 * which bumps the key. No URL persistence — refresh resets filters to All.
 *
 * Defensive narrowing — mirrors Dashboard.tsx's belt-and-suspenders even
 * though `RequireAuth` already gates `/app/*`.
 *
 * Router import contract: this file MUST export a function named `ListsPage`
 * (named export, no default) — `src/router.tsx` imports it that way and the
 * Phase 3 D-01 placeholder convention forbids router edits at phase
 * boundaries.
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import { Stack, Group, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { Button } from '../../../ui/primitives'
import { PENDO_IDS } from '../../../pendo/PENDO_IDS'
import { pendo } from '../../../pendo/track'
import { useAuthStore } from '../../../auth/authStore'
import { listTasks, updateTask, deleteTask } from '../../../tasks/tasksRepo'
import type { Task } from '../../../tasks/types'
import {
  assigneeFilterScope,
  isTaskOverdue,
  taskCompletedProperties,
  taskReopenedProperties,
} from '../../../tasks/taskTrackProperties'
import { TaskTable } from '../../../tasks/components/TaskTable'
import { TaskFiltersBar } from '../../../tasks/components/TaskFiltersBar'
import { TaskFormModal } from '../../../tasks/components/TaskFormModal'
import { DeleteConfirmModal } from '../../../tasks/components/DeleteConfirmModal'
import { ListsEmptyState } from '../../../tasks/components/ListsEmptyState'
import { FilteredEmptyState } from '../../../tasks/components/FilteredEmptyState'

/** Control that opened the delete confirm (`task_deleted` deleteSource). */
type DeleteSource = 'row_menu' | 'edit_modal'

export function ListsPage(): React.JSX.Element {
  const visitor = useAuthStore((s) => s.currentVisitor)
  const workspace = useAuthStore((s) => s.currentWorkspace)
  const workspaceId = workspace?.id

  // Filter state — D-05 component-state-only.
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')

  // Refresh ticker — bumped after every CRUD success.
  const [refreshKey, setRefreshKey] = useState(0)
  const refresh = () => setRefreshKey((k) => k + 1)

  // Modal state
  const [createOpen, setCreateOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null)
  const [deleteSource, setDeleteSource] = useState<DeleteSource>('row_menu')

  const allTasks = useMemo(
    () => (workspaceId ? listTasks(workspaceId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspaceId, refreshKey],
  )

  const filteredTasks = useMemo(
    () =>
      allTasks.filter(
        (t) =>
          (statusFilter === 'all' || t.status === statusFilter) &&
          (priorityFilter === 'all' || t.priority === priorityFilter) &&
          (assigneeFilter === 'all' || t.assignee?.id === assigneeFilter),
      ),
    [allTasks, statusFilter, priorityFilter, assigneeFilter],
  )

  const filtersActive =
    statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all'
  const resetFilters = () => {
    setStatusFilter('all')
    setPriorityFilter('all')
    setAssigneeFilter('all')
  }

  // Pendo `task_filters_applied`: one event per actual filter change, after
  // filteredTasks has been recomputed (a "Clear filters" reset batches into a
  // single event). The last-tracked key starts at the mount values, so nothing
  // fires on mount — StrictMode's effect re-run included. Must stay above the
  // defensive early return (Rules of Hooks).
  const filterKey = `${statusFilter}|${priorityFilter}|${assigneeFilter}`
  const lastTrackedFilterKeyRef = useRef(filterKey)
  useEffect(() => {
    if (filterKey === lastTrackedFilterKeyRef.current) return
    lastTrackedFilterKeyRef.current = filterKey
    pendo.track('task_filters_applied', {
      statusFilter,
      priorityFilter,
      assigneeFilter: assigneeFilterScope(assigneeFilter, visitor?.id),
      assigneeFilterIsSelf: assigneeFilter === visitor?.id,
      activeFilterCount: [statusFilter, priorityFilter, assigneeFilter].filter(
        (f) => f !== 'all',
      ).length,
      resultsCount: filteredTasks.length,
      totalTaskCount: allTasks.length,
      filtersCleared: !filtersActive,
    })
  }, [
    filterKey,
    statusFilter,
    priorityFilter,
    assigneeFilter,
    filteredTasks,
    allTasks,
    visitor,
    filtersActive,
  ])

  // Defensive narrowing — RequireAuth + AppLayout already gate this, but
  // mirror Dashboard.tsx line 288's belt-and-suspenders pattern.
  if (!workspaceId || !visitor || !workspace) return <></>

  return (
    <Stack gap="lg">
      {/* Page header */}
      <Group justify="space-between" align="center">
        <Title order={3}>Tasks</Title>
        {allTasks.length > 0 && (
          <Button
            variant="filled"
            leftSection={<IconPlus size={16} />}
            pendoId={PENDO_IDS.lists.newTaskButton}
            onClick={() => setCreateOpen(true)}
          >
            New task
          </Button>
        )}
      </Group>

      {allTasks.length === 0 ? (
        <ListsEmptyState
          workspaceName={workspace.companyName}
          onCreateClick={() => setCreateOpen(true)}
        />
      ) : (
        <>
          <TaskFiltersBar
            workspaceId={workspaceId}
            visitor={visitor}
            statusValue={statusFilter}
            priorityValue={priorityFilter}
            assigneeValue={assigneeFilter}
            onChange={(next) => {
              if (next.status !== undefined) setStatusFilter(next.status)
              if (next.priority !== undefined) setPriorityFilter(next.priority)
              if (next.assignee !== undefined) setAssigneeFilter(next.assignee)
            }}
          />
          {filteredTasks.length === 0 && filtersActive ? (
            <FilteredEmptyState onClearFilters={resetFilters} />
          ) : (
            <TaskTable
              tasks={filteredTasks}
              workspaceId={workspaceId}
              onEdit={(task) => setEditTask(task)}
              onDelete={(task) => {
                setDeleteSource('row_menu')
                setDeleteTarget(task)
              }}
              onToggleComplete={(task, nextDone) => {
                const updated = updateTask(workspaceId, task.id, {
                  // Off-toggle: restore prior non-done status if recorded;
                  // fall back to 'todo' for legacy tasks without prevStatus.
                  status: nextDone ? 'done' : (task.prevStatus ?? 'todo'),
                })
                if (updated) {
                  if (nextDone) {
                    pendo.track(
                      'task_completed',
                      taskCompletedProperties(task, updated, 'checkbox', visitor.id),
                    )
                  } else {
                    pendo.track(
                      'task_reopened',
                      taskReopenedProperties(task, updated, 'checkbox'),
                    )
                  }
                }
                refresh()
              }}
            />
          )}
        </>
      )}

      {/* Create modal — the header button only renders when tasks exist and
       *  the empty-state CTA only when none do, so the task count identifies
       *  which control opened it (Pendo `task_created` entryPoint).
       */}
      <TaskFormModal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={refresh}
        workspaceId={workspaceId}
        visitor={visitor}
        mode="create"
        entryPoint={allTasks.length === 0 ? 'empty_state' : 'header_button'}
      />

      {/* Edit modal — opens when editTask !== null. onRequestDelete closes
       *  this modal (handled inside TaskFormModal) and sets deleteTarget so
       *  the DeleteConfirmModal opens next.
       */}
      <TaskFormModal
        opened={editTask !== null}
        onClose={() => setEditTask(null)}
        onSuccess={refresh}
        onRequestDelete={(task) => {
          setDeleteSource('edit_modal')
          setDeleteTarget(task)
        }}
        workspaceId={workspaceId}
        visitor={visitor}
        mode="edit"
        initialTask={editTask ?? undefined}
      />

      {/* Delete confirm */}
      <DeleteConfirmModal
        opened={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            const deleted = deleteTask(workspaceId, deleteTarget.id)
            if (deleted) {
              const ageMs = Date.now() - new Date(deleteTarget.createdAt).getTime()
              pendo.track('task_deleted', {
                taskId: deleteTarget.id,
                status: deleteTarget.status,
                priority: deleteTarget.priority,
                taskAgeDays: Number((ageMs / 86_400_000).toFixed(1)),
                wasOverdue: isTaskOverdue(deleteTarget),
                deleteSource,
              })
            }
            notifications.show({
              title: 'Task deleted',
              message: '',
              color: 'red',
              icon: <IconTrash size={18} />,
              autoClose: 3000,
            })
            refresh()
          }
        }}
        taskTitle={deleteTarget?.title ?? ''}
      />
    </Stack>
  )
}

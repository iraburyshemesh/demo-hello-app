/**
 * Halo Team — /app/team composer (Phase 5, plan 05-04).
 *
 * Composes TeamTable + TeamEmptyState + InviteTeammateModal into the /app/team
 * page. Replaces the Phase 3 placeholder.
 *
 * Data flow:
 *   - listTeammates(workspaceId) → teammates (via useMemo + refreshKey).
 *   - updateTeammate(workspaceId, id, patch) on inline role change (D-05).
 *   - createTeammate(workspaceId, input) inside InviteTeammateModal (D-03).
 *   - Refresh ticker: any mutation bumps refreshKey → teammates useMemo re-reads.
 *
 * Header "Invite teammate" button only renders when teammates.length > 0.
 * When empty, the TeamEmptyState CTA is the only entry point for the modal.
 *
 * Defensive narrowing mirrors ListsPage line 100 belt-and-suspenders pattern.
 */

import { useState, useMemo } from 'react'
import { Stack, Group, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconUserPlus, IconCheck } from '@tabler/icons-react'
import { Button } from '../../../ui/primitives'
import { PENDO_IDS } from '../../../pendo/PENDO_IDS'
import { pendo } from '../../../pendo/track'
import { useAuthStore } from '../../../auth/authStore'
import { listTeammates, updateTeammate } from '../../../team/teamsRepo'
import { TeamTable } from '../../../team/components/TeamTable'
import { TeamEmptyState } from '../../../team/components/TeamEmptyState'
import { InviteTeammateModal } from '../../../team/components/InviteTeammateModal'
import type { WorkspaceRole } from '../../../team/types'

/** Permission order — promotion vs. demotion on `teammate_role_changed`. */
const WORKSPACE_ROLE_RANK: Record<WorkspaceRole, number> = {
  Viewer: 0,
  Member: 1,
  Admin: 2,
  Owner: 3,
}

export function TeamPage(): React.JSX.Element {
  const visitor = useAuthStore((s) => s.currentVisitor)
  const workspace = useAuthStore((s) => s.currentWorkspace)
  const workspaceId = workspace?.id

  const [refreshKey, setRefreshKey] = useState(0)
  const refresh = () => setRefreshKey((k) => k + 1)
  const [inviteOpen, setInviteOpen] = useState(false)

  const teammates = useMemo(
    () => (workspaceId ? listTeammates(workspaceId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspaceId, refreshKey],
  )

  // Defensive narrowing — RequireAuth + AppLayout already gate this, but
  // mirror ListsPage line 100 belt-and-suspenders pattern.
  if (!workspaceId || !visitor || !workspace) return <></>

  const handleRoleChange = (teammateId: string, nextRole: WorkspaceRole) => {
    // TeamTable hands over only id + next role — capture the prior state first.
    const previous = teammates.find((t) => t.id === teammateId)
    const updated = updateTeammate(workspaceId, teammateId, { workspaceRole: nextRole })
    if (previous && updated) {
      pendo.track('teammate_role_changed', {
        teammateId,
        previousRole: previous.workspaceRole,
        newRole: nextRole,
        changeDirection:
          WORKSPACE_ROLE_RANK[nextRole] > WORKSPACE_ROLE_RANK[previous.workspaceRole]
            ? 'promotion'
            : 'demotion',
        teammateStatus: previous.status,
      })
    }
    notifications.show({
      title: 'Role updated',
      message: '',
      color: 'green',
      icon: <IconCheck size={18} />,
      autoClose: 3000,
    })
    refresh()
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Title order={3}>Team</Title>
        {teammates.length > 0 && (
          <Button
            variant="filled"
            leftSection={<IconUserPlus size={16} />}
            pendoId={PENDO_IDS.team.header.inviteButton}
            onClick={() => setInviteOpen(true)}
          >
            Invite teammate
          </Button>
        )}
      </Group>

      {teammates.length === 0 ? (
        <TeamEmptyState
          workspaceName={workspace.companyName}
          onInviteClick={() => setInviteOpen(true)}
        />
      ) : (
        <TeamTable
          teammates={teammates}
          onRoleChange={handleRoleChange}
        />
      )}

      {/* The header button only renders when teammates exist and the
       *  empty-state CTA only when none do, so the teammate count identifies
       *  which control opened the modal (Pendo `teammate_invited` inviteSource).
       */}
      <InviteTeammateModal
        opened={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSuccess={refresh}
        workspaceId={workspaceId}
        inviteSource={teammates.length === 0 ? 'empty_state' : 'header_button'}
      />
    </Stack>
  )
}

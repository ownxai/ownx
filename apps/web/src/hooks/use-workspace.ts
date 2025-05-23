import { useCallback, useEffect, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSuspenseQuery } from '@tanstack/react-query'
import Cookies from 'js-cookie'
import { toast } from 'sonner'

import { siteConfig } from '@/config/site'
import { addIdPrefix, stripIdPrefix } from '@/lib/utils'
import { useTRPC } from '@/trpc/client'

export function useWorkspaceId() {
  const pathname = usePathname()
  const matched = /\/workspace\/([^/]+)/.exec(pathname)
  return matched?.length && matched[1] ? addIdPrefix(matched[1], 'workspace') : ''
}

export function useWorkspace() {
  const router = useRouter()

  const id = useWorkspaceId()

  const trpc = useTRPC()
  const { data, error } = useSuspenseQuery({
    ...trpc.workspace.get.queryOptions({
      id,
    }),
    retry: (failureCount, error) => {
      return !(id.length < 32 || error.data?.code === 'NOT_FOUND')
    },
  })

  const workspace = useMemo(
    () => ({
      ...data.workspace,
      role: data.role,
    }),
    [data],
  )

  useEffect(() => {
    if (id.length < 32 || error?.data?.code === 'NOT_FOUND') {
      console.error('Workspace not found', { id, error })
      toast.error('Workspace not found')
      router.replace('/')
    }
  }, [id, error, router])

  return workspace
}

const cookieName = `${siteConfig.name}.lastWorkspace`

export function useLastWorkspace() {
  const lastWorkspace = Cookies.get(cookieName)

  const setLastWorkspace = useCallback(
    (id?: string) =>
      id ? Cookies.set(cookieName, id, { expires: 30, secure: true }) : Cookies.remove(cookieName),
    [],
  )

  return [lastWorkspace, setLastWorkspace] as const
}

export type Workspace = ReturnType<typeof useWorkspaces>[number]

export function useWorkspaces() {
  const trpc = useTRPC()

  const { data } = useSuspenseQuery(trpc.workspace.list.queryOptions())

  const workspaces = useMemo(
    () => data.workspaces.map(({ workspace, role }) => ({ ...workspace, role })),
    [data],
  )

  const [workspace, setWorkspace] = useLastWorkspace()
  useEffect(() => {
    if (!workspace) {
      // Set last workspace if it's not already set
      setWorkspace(workspaces.at(0)?.id)
    } else if (!workspaces.some((w) => w.id === workspace)) {
      // If last workspace is not in the list of workspaces, reset it
      setWorkspace(workspaces.at(0)?.id)
    }
  }, [workspaces, workspace, setWorkspace])

  return workspaces
}

export function replaceRouteWithWorkspaceId(route: string, id: string) {
  return route.replace(/^\/workspace\/[^/]+/, `/workspace/${stripIdPrefix(id)}`)
}

export function useRouteWithWorkspaceId(id: string) {
  const pathname = usePathname()
  return replaceRouteWithWorkspaceId(pathname, id)
}

export function useRedirectWorkspace() {
  const router = useRouter()

  useWorkspaces()

  const [workspace] = useLastWorkspace()

  return useCallback(() => {
    if (workspace) {
      router.replace(`/workspace/${stripIdPrefix(workspace)}/apps`)
    }
  }, [router, workspace])
}

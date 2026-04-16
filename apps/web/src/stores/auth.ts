import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type { AuthSession, SyncPullResponse, SyncPushResponse, SyncQueueItem } from '@shared'

import { ApiError, apiRequest } from '@/lib/api'
import { sessionRepository, syncQueueRepository } from '@/lib/repositories'
import { useWorkspaceStore } from '@/stores/workspace'

export const useAuthStore = defineStore('auth', () => {
  const ready = ref(false)
  const loading = ref(false)
  const syncing = ref(false)
  const session = ref<AuthSession | null>(null)
  const error = ref('')

  const isAuthenticated = computed(() => Boolean(session.value?.tokens.accessToken))
  const canAccessAdmin = computed(() => ['owner', 'admin'].includes(session.value?.user.role || ''))

  function compactSyncQueue(queue: SyncQueueItem[]) {
    const grouped = new Map<string, SyncQueueItem[]>()

    for (const item of queue) {
      const key = `${item.entityType}:${item.entityId}`
      const items = grouped.get(key) || []
      items.push(item)
      grouped.set(key, items)
    }

    return [...grouped.values()]
      .map((items) => {
        const first = items[0]
        const last = items.at(-1)

        if (!first || !last) {
          return null
        }

        if (first.operation === 'create' && last.operation === 'delete') {
          return null
        }

        if (first.operation === 'create') {
          return {
            ...last,
            operation: 'create' as const,
            expectedVersion: undefined,
          }
        }

        return last
      })
      .filter((item): item is SyncQueueItem => Boolean(item))
  }

  async function initialize() {
    if (ready.value) {
      return
    }

    session.value = await sessionRepository.get()
    ready.value = true

    if (session.value) {
      try {
        await useWorkspaceStore().initialize(session.value.workspace.id)
        await fetchMe()
      } catch (err) {
        if (err instanceof ApiError && [401, 403].includes(err.status)) {
          await logout(false)
        }
      }
    }
  }

  async function login(payload: { email: string; password: string }) {
    loading.value = true
    error.value = ''

    try {
      const nextSession = await apiRequest<AuthSession>('/auth/login', {
        method: 'POST',
        body: payload,
      })
      await saveSession(nextSession)
      const workspaceStore = useWorkspaceStore()
      await workspaceStore.initialize(nextSession.workspace.id, true)
      try {
        await syncNow()
      } catch {
        workspaceStore.toast('已登录，但云端同步暂时不可用，当前继续使用本地数据。', 'warning')
      }
      return nextSession
    } catch (err) {
      error.value = err instanceof Error ? err.message : '登录失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function register(payload: { email: string; password: string; name?: string }) {
    loading.value = true
    error.value = ''

    try {
      const nextSession = await apiRequest<AuthSession>('/auth/register', {
        method: 'POST',
        body: payload,
      })
      await saveSession(nextSession)
      const workspaceStore = useWorkspaceStore()
      await workspaceStore.initialize(nextSession.workspace.id, true)
      try {
        await syncNow()
      } catch {
        workspaceStore.toast('注册成功，但云端同步暂时不可用，当前继续使用本地数据。', 'warning')
      }
      return nextSession
    } catch (err) {
      error.value = err instanceof Error ? err.message : '注册失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function refreshSession() {
    if (!session.value) {
      return null
    }

    const nextSession = await apiRequest<AuthSession>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: session.value.tokens.refreshToken },
    })

    await saveSession(nextSession)
    return nextSession
  }

  async function fetchMe() {
    if (!session.value) {
      return null
    }

    const data = await withToken<{ user: AuthSession['user']; workspace: AuthSession['workspace'] }>('/me')
    const nextSession: AuthSession = {
      ...session.value,
      user: data.user,
      workspace: data.workspace,
    }
    await saveSession(nextSession)
    await useWorkspaceStore().initialize(nextSession.workspace.id, true)
    return nextSession
  }

  async function syncNow() {
    if (!session.value || syncing.value) {
      return null
    }

    const workspaceStore = useWorkspaceStore()
    if (!workspaceStore.ready || workspaceStore.workspaceId !== session.value.workspace.id) {
      await workspaceStore.initialize(session.value.workspace.id, true)
    }
    syncing.value = true
    error.value = ''

    try {
      const queue = compactSyncQueue(await syncQueueRepository.list())

      if (queue.length) {
        await withToken<SyncPushResponse>('/sync/push', {
          method: 'POST',
          body: {
            items: queue.map((item) => ({
              workspaceId: session.value?.workspace.id || null,
              entityType: item.entityType,
              entityId: item.entityId,
              operation: item.operation,
              payload: item.payload,
              expectedVersion: item.expectedVersion,
            })),
          },
        })

        await syncQueueRepository.clear()
      }

      const pull = await withToken<SyncPullResponse>(`/sync/pull?workspaceId=${session.value.workspace.id}&cursor=${encodeURIComponent(workspaceStore.settings.lastSyncCursor || '')}`)
      await workspaceStore.applyRemoteSnapshot(pull)

      if (queue.length) {
        workspaceStore.toast('本地改动已同步到云端')
      }

      return pull
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        useWorkspaceStore().toast('同步发生冲突，请检查本地与远端便签版本。', 'warning')
      } else {
        error.value = err instanceof Error ? err.message : '同步失败'
      }
      throw err
    } finally {
      syncing.value = false
    }
  }

  async function logout(callApi = true) {
    if (callApi && session.value?.tokens.refreshToken) {
      try {
        await apiRequest('/auth/logout', {
          method: 'POST',
          body: { refreshToken: session.value.tokens.refreshToken },
        })
      } catch {
        // Ignore logout network failures and clear local session anyway.
      }
    }

    session.value = null
    error.value = ''
    await sessionRepository.clear()
    useWorkspaceStore().resetWorkspaceState()
  }

  async function saveSession(nextSession: AuthSession) {
    session.value = nextSession
    await sessionRepository.save(nextSession)
    return nextSession
  }

  async function withToken<T>(path: string, options: { method?: string; body?: unknown } = {}) {
    if (!session.value) {
      throw new Error('当前登录会话不存在')
    }

    try {
      return await apiRequest<T>(path, {
        ...options,
        token: session.value.tokens.accessToken,
      })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        const refreshed = await refreshSession()
        if (!refreshed) {
          throw err
        }

        return apiRequest<T>(path, {
          ...options,
          token: refreshed.tokens.accessToken,
        })
      }

      throw err
    }
  }

  return {
    ready,
    loading,
    syncing,
    session,
    error,
    isAuthenticated,
    canAccessAdmin,
    initialize,
    login,
    register,
    refreshSession,
    fetchMe,
    syncNow,
    logout,
  }
})

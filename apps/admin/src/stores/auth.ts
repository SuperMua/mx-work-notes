import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { AuthSession } from '@shared'

import { ApiError, apiRequest } from '@/lib/api'

const STORAGE_KEY = 'smart-notes-admin-session'

export const useAdminAuthStore = defineStore('admin-auth', () => {
  const ready = ref(false)
  const loading = ref(false)
  const session = ref<AuthSession | null>(null)
  const error = ref('')

  const isAuthenticated = computed(() => Boolean(session.value?.tokens.accessToken))
  const canAccessAdmin = computed(() => ['owner', 'admin'].includes(session.value?.user.role || ''))
  const roleLabel = computed(() => {
    switch (session.value?.user.role) {
      case 'owner':
        return '拥有者'
      case 'admin':
        return '管理员'
      case 'editor':
        return '编辑者'
      case 'viewer':
        return '查看者'
      default:
        return '未登录'
    }
  })

  function initialize() {
    if (ready.value) {
      return
    }

    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      session.value = JSON.parse(raw) as AuthSession
    }
    ready.value = true
  }

  async function login(payload: { email: string; password: string }) {
    loading.value = true
    error.value = ''

    try {
      const nextSession = await apiRequest<AuthSession>('/auth/login', {
        method: 'POST',
        body: payload,
      })

      if (!['owner', 'admin'].includes(nextSession.user.role)) {
        throw new Error('当前账号没有后台访问权限')
      }

      session.value = nextSession
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession))
      return nextSession
    } catch (err) {
      error.value = err instanceof Error ? err.message : '后台登录失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function withToken<T>(path: string, options: { method?: string; body?: unknown } = {}) {
    if (!session.value) {
      throw new Error('请先登录后台')
    }

    try {
      return await apiRequest<T>(path, {
        ...options,
        token: session.value.tokens.accessToken,
      })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await logout(false)
      }
      throw err
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
        // 忽略远端退出失败，始终清理本地会话。
      }
    }

    session.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  function clearError() {
    error.value = ''
  }

  return {
    ready,
    loading,
    session,
    error,
    isAuthenticated,
    canAccessAdmin,
    roleLabel,
    initialize,
    login,
    withToken,
    logout,
    clearError,
  }
})

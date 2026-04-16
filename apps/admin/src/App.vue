<script setup lang="ts">
import { computed, onMounted, ref, watchEffect } from 'vue'
import { useRouter, RouterLink, RouterView, useRoute } from 'vue-router'
import { BarChart3, DatabaseZap, FolderTree, LayoutDashboard, LogOut, MoonStar, NotebookTabs, SunMedium, Tags, Users, UsersRound } from 'lucide-vue-next'

import { ADMIN_APP_NAME, ADMIN_THEME_STORAGE_KEY, type ThemeKey } from '@shared'

import { useAdminAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAdminAuthStore()
const theme = ref<ThemeKey>('light-workbench')

const navItems = [
  { to: '/dashboard', label: '数据看板', icon: LayoutDashboard },
  { to: '/users', label: '账号管理', icon: Users },
  { to: '/workspaces', label: '工作区管理', icon: FolderTree },
  { to: '/members', label: '成员管理', icon: UsersRound },
  { to: '/notes', label: '便签管理', icon: NotebookTabs },
  { to: '/templates', label: '模板管理', icon: BarChart3 },
  { to: '/tags', label: '标签管理', icon: Tags },
  { to: '/sync', label: '同步监控', icon: DatabaseZap },
]

const showShell = computed(() => route.name !== 'login' && authStore.isAuthenticated && authStore.canAccessAdmin)
const pageTitle = computed(() => String(route.meta.title || ADMIN_APP_NAME))

function loadTheme() {
  const saved = localStorage.getItem(ADMIN_THEME_STORAGE_KEY)
  if (saved === 'light-workbench' || saved === 'dark-workbench') {
    theme.value = saved
  }
}

function toggleTheme() {
  theme.value = theme.value === 'light-workbench' ? 'dark-workbench' : 'light-workbench'
  localStorage.setItem(ADMIN_THEME_STORAGE_KEY, theme.value)
}

async function handleLogout() {
  await authStore.logout()
  await router.push('/login')
}

onMounted(() => {
  authStore.initialize()
  loadTheme()
})

watchEffect(() => {
  document.body.className = `admin-body theme-${theme.value}`
})
</script>

<template>
  <div v-if="showShell" class="admin-shell">
    <aside class="admin-rail">
      <div class="rail-brand">
        <div class="rail-brand-mark">MX</div>
        <div class="rail-brand-copy">
          <strong>{{ ADMIN_APP_NAME }}</strong>
        </div>
      </div>

      <div class="rail-meta">
        <strong>{{ authStore.session?.user.name }}</strong>
        <span>{{ authStore.session?.user.email }}</span>
      </div>

      <nav class="rail-nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="rail-link"
          :class="{ active: route.path === item.to }"
        >
          <component :is="item.icon" :size="16" />
          <div class="rail-link-copy">
            <span>{{ item.label }}</span>
          </div>
        </RouterLink>
      </nav>

      <div class="rail-footer">
        <button class="btn btn-secondary" @click="toggleTheme">
          <SunMedium v-if="theme === 'dark-workbench'" :size="16" />
          <MoonStar v-else :size="16" />
          {{ theme === 'dark-workbench' ? '切换浅色' : '切换深色' }}
        </button>
        <button class="btn btn-ghost" @click="handleLogout">
          <LogOut :size="16" />
          退出后台
        </button>
      </div>
    </aside>

    <main class="admin-main">
      <header class="topbar">
        <div class="topbar-main">
          <h1>{{ pageTitle }}</h1>
        </div>
        <div class="topbar-actions">
          <div class="topbar-chip">
            <span>身份</span>
            <strong>{{ authStore.roleLabel }}</strong>
          </div>
          <div class="topbar-chip">
            <span>主题</span>
            <strong>{{ theme === 'dark-workbench' ? '深色工作台' : '浅色工作台' }}</strong>
          </div>
        </div>
      </header>

      <RouterView />
    </main>
  </div>

  <RouterView v-else />
</template>

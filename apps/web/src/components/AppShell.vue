<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import { useRouter, RouterLink, RouterView, useRoute } from 'vue-router'
import { Bell, CalendarDays, Download, FolderKanban, LayoutGrid, LogOut, NotebookTabs, Plus, RefreshCw, Settings } from 'lucide-vue-next'

import { APP_NAME } from '@shared'

import ToolbarGroup from '@/components/ui/ToolbarGroup.vue'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'

const router = useRouter()
const route = useRoute()
const workspaceStore = useWorkspaceStore()
const authStore = useAuthStore()
const remindersOpen = ref(false)
let reminderTimer: number | undefined

const CommandPalette = defineAsyncComponent(() => import('./CommandPalette.vue'))
const ImportDialog = defineAsyncComponent(() => import('./ImportDialog.vue'))
const NoteEditorDialog = defineAsyncComponent(() => import('./NoteEditorDialog.vue'))

const navItems = [
  { to: '/dashboard', label: '工作台', icon: LayoutGrid },
  { to: '/notes', label: '便签列表', icon: NotebookTabs },
  { to: '/board', label: '看板', icon: FolderKanban },
  { to: '/calendar', label: '日历', icon: CalendarDays },
  { to: '/settings', label: '设置', icon: Settings },
]

const routeTitle = computed(() => {
  switch (route.name) {
    case 'dashboard':
      return '工作台'
    case 'notes':
      return '便签列表'
    case 'board':
      return '看板视图'
    case 'calendar':
      return '日历视图'
    case 'settings':
      return '设置中心'
    default:
      return APP_NAME
  }
})

const adminUrl = computed(() => {
  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:4174'
  }

  const port = import.meta.env.DEV ? '5174' : '4174'
  return `${window.location.protocol}//${window.location.hostname}:${port}`
})

function handleKeydown(event: KeyboardEvent) {
  const meta = event.ctrlKey || event.metaKey

  if (meta && event.key.toLowerCase() === 'n') {
    event.preventDefault()
    workspaceStore.openEditor()
  }

  if (meta && event.key.toLowerCase() === 's' && workspaceStore.editorOpen) {
    event.preventDefault()
    workspaceStore.saveNote()
  }

  if (meta && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    workspaceStore.toggleCommandPalette()
  }

  if (event.key === '/' && !meta) {
    const tag = (event.target as HTMLElement | null)?.tagName
    if (!['INPUT', 'TEXTAREA'].includes(tag || '')) {
      event.preventDefault()
      window.dispatchEvent(new CustomEvent('smart-notes:focus-search'))
    }
  }

  if (event.key === 'Escape') {
    if (workspaceStore.editorOpen) {
      workspaceStore.closeEditor()
    } else if (workspaceStore.importDialogOpen) {
      workspaceStore.closeImportDialog()
    } else if (workspaceStore.commandPaletteOpen) {
      workspaceStore.toggleCommandPalette(false)
    }
  }
}

function handleInstallPrompt(event: Event) {
  event.preventDefault()
  workspaceStore.registerInstallPrompt(event as Event & { prompt: () => Promise<void> })
}

async function handleLogout() {
  await authStore.logout()
  await router.push('/login')
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('beforeinstallprompt', handleInstallPrompt)
  reminderTimer = window.setInterval(() => workspaceStore.checkReminders(), 45_000)
  workspaceStore.checkReminders()
})

watchEffect(() => {
  document.body.className = `theme-${workspaceStore.settings.theme}`
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
  if (reminderTimer) {
    window.clearInterval(reminderTimer)
  }
})
</script>

<template>
  <div class="shell">
    <aside class="surface-rail side" data-testid="app-sidebar">
      <div class="brand">
        <div class="brand-mark">MX</div>
        <div class="brand-copy">
          <strong>{{ APP_NAME }}</strong>
        </div>
      </div>

      <nav class="nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          :class="{ active: route.path === item.to }"
          :data-testid="`nav-${item.to.slice(1)}`"
        >
          <component :is="item.icon" :size="18" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <a
        v-if="authStore.canAccessAdmin"
        class="surface-sheet admin-entry"
        :href="adminUrl"
        target="_blank"
        rel="noreferrer"
      >
        打开后台
      </a>

      <div class="side-actions">
        <button class="btn btn-primary" data-testid="quick-create-note" @click="workspaceStore.openEditor()">
          <Plus :size="16" />
          新建便签
        </button>
        <button class="btn btn-secondary" data-testid="logout-web" @click="handleLogout">
          <LogOut :size="16" />
          退出登录
        </button>
      </div>
    </aside>

    <main class="main">
      <header class="surface-canvas topbar panel">
        <div class="page-header-main">
          <h1 class="page-title topbar-title">{{ routeTitle }}</h1>
        </div>

        <div class="top-actions">
          <ToolbarGroup>
            <button
              v-if="workspaceStore.installAvailable && !workspaceStore.settings.installPromptDismissed"
              class="btn btn-secondary"
              data-testid="install-app"
              @click="workspaceStore.promptInstall()"
            >
              安装应用
            </button>
            <button
              v-if="workspaceStore.installAvailable && !workspaceStore.settings.installPromptDismissed"
              class="btn btn-ghost"
              data-testid="install-app-dismiss"
              @click="workspaceStore.dismissInstall()"
            >
              稍后
            </button>
            <button class="btn btn-secondary" data-testid="quick-export" @click="workspaceStore.exportCurrent()">
              <Download :size="16" />
              快速导出
            </button>
            <button class="btn btn-secondary" data-testid="sync-now" :disabled="!authStore.isAuthenticated || authStore.syncing" @click="authStore.syncNow()">
              <RefreshCw :size="16" :class="{ spinning: authStore.syncing }" />
              {{ authStore.syncing ? '同步中' : '立即同步' }}
            </button>
            <button class="btn btn-secondary" data-testid="open-reminders" @click="remindersOpen = !remindersOpen">
              <Bell :size="16" />
              提醒 {{ workspaceStore.activeReminders.length }}
            </button>
          </ToolbarGroup>
        </div>
      </header>

      <section v-if="workspaceStore.legacyImportPromptOpen" class="surface-sheet legacy-banner" data-testid="legacy-import-banner">
        <div class="legacy-copy">
          <strong>检测到旧数据</strong>
        </div>
        <div class="legacy-actions">
          <button class="btn btn-primary" data-testid="legacy-import-confirm" @click="workspaceStore.importLegacyAnonymousData()">导入旧数据</button>
          <button class="btn btn-ghost" data-testid="legacy-import-dismiss" @click="workspaceStore.discardLegacyAnonymousData()">暂不导入</button>
        </div>
      </section>

      <section v-if="remindersOpen" class="surface-sheet reminder-panel" data-testid="reminder-panel">
        <header class="section-head">
          <div class="section-head-main">
            <h2 class="section-title">待处理提醒</h2>
          </div>
        </header>

        <div class="reminder-list">
          <div v-for="note in workspaceStore.activeReminders" :key="note.id" class="reminder-row">
            <strong>{{ note.title }}</strong>
            <span>{{ note.remindAt }}</span>
          </div>
          <p v-if="!workspaceStore.activeReminders.length" class="empty">当前没有激活提醒。</p>
        </div>
      </section>

      <RouterView />
    </main>

    <div class="toast-stack" data-testid="toast-stack">
      <TransitionGroup name="fade-up">
        <div v-for="toast in workspaceStore.toasts" :key="toast.id" class="surface-sheet toast" :class="toast.tone">
          {{ toast.message }}
        </div>
      </TransitionGroup>
    </div>

    <NoteEditorDialog />
    <ImportDialog />
    <CommandPalette />
  </div>
</template>

<style scoped>
.shell {
  width: min(calc(100vw - 2rem), var(--page-width));
  min-height: calc(100vh - 2rem);
  margin: 1rem auto;
  display: grid;
  grid-template-columns: var(--rail-width) minmax(0, 1fr);
  gap: 1rem;
}

.side,
.main {
  min-height: 0;
}

.side {
  padding: 1.2rem;
  border-radius: 36px;
  display: grid;
  align-content: start;
  gap: 1rem;
  position: sticky;
  top: 1rem;
  height: auto;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.brand-mark {
  width: 4rem;
  height: 4rem;
  border-radius: 1.45rem;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: #fff;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.5rem;
  box-shadow: var(--shadow-float);
}

.brand-copy {
  display: grid;
  gap: 0;
}

.brand-copy strong {
  color: var(--heading);
  font-size: 1rem;
}

.nav {
  display: grid;
  gap: 0.42rem;
}

.nav-link {
  min-height: 58px;
  padding: 0.78rem 0.95rem;
  border-radius: 22px;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  border: 1px solid transparent;
  color: var(--text-muted);
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    transform var(--transition-fast),
    color var(--transition-fast);
}

.nav-link:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.34);
  border-color: var(--border);
  color: var(--heading);
}

.nav-link.active {
  background: var(--selection);
  border-color: var(--selection-border);
  color: var(--heading);
}

.nav-link span {
  font-weight: 600;
}

.admin-entry {
  padding: 0.9rem 1rem;
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  font-weight: 600;
}

.side-actions {
  margin-top: auto;
  display: grid;
  gap: 0.7rem;
  position: sticky;
  bottom: 0;
  z-index: 1;
  padding-top: 0.9rem;
  background:
    linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--rail) 72%, transparent) 18%, var(--rail) 100%);
}

.main {
  display: grid;
  align-content: start;
  gap: 1rem;
  padding-bottom: 2rem;
}

.topbar {
  padding: 1.2rem 1.35rem;
  border-radius: 36px;
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.topbar-title {
  font-size: clamp(2rem, 4vw, 3.1rem);
}

.top-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.8rem;
}

.legacy-banner,
.reminder-panel {
  padding: 1.15rem 1.2rem;
  border-radius: 30px;
  display: grid;
  gap: 1rem;
}

.legacy-banner {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

.legacy-copy,
.legacy-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.legacy-copy {
  display: grid;
  gap: 0;
}

.legacy-copy strong {
  color: var(--heading);
}

.legacy-actions {
  justify-content: flex-end;
}

.reminder-list {
  display: grid;
  gap: 0.7rem;
}

.reminder-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.95rem 1rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.32);
  border: 1px solid var(--border);
}

.reminder-row span,
.empty {
  color: var(--text-muted);
}

.toast-stack {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  display: grid;
  gap: 0.65rem;
  z-index: 80;
}

.toast {
  min-width: 250px;
  padding: 0.9rem 1rem;
  border-radius: 22px;
}

.toast.success {
  border-color: color-mix(in srgb, var(--success) 35%, var(--border));
}

.toast.info {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
}

.toast.warning {
  border-color: color-mix(in srgb, var(--warning) 36%, var(--border));
}

.spinning {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1180px) {
  .shell {
    grid-template-columns: 1fr;
  }

  .side {
    position: static;
    height: auto;
    align-items: start;
  }

  .brand,
  .nav,
  .admin-entry,
  .side-actions {
    min-width: 0;
  }
}

@media (max-width: 840px) {
  .shell {
    width: calc(100vw - 1rem);
    margin: 0.5rem auto;
  }

  .side,
  .topbar,
  .legacy-banner,
  .reminder-panel {
    border-radius: 28px;
  }

  .side {
    grid-template-columns: 1fr;
  }

  .topbar,
  .legacy-banner {
    flex-direction: column;
    align-items: stretch;
  }

  .legacy-banner {
    grid-template-columns: 1fr;
  }

  .top-actions,
  .legacy-actions {
    justify-content: flex-start;
  }
}
</style>

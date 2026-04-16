<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { WORKSPACE_ROLE_LABELS } from '@shared'
import type { AdminUserDetail, AdminUserListItem, AdminUserWorkspaceRef } from '@shared'

import AdminDialog from '@/components/AdminDialog.vue'
import { getQueryString, mergeQuery } from '@/lib/query'
import { useAdminAuthStore } from '@/stores/auth'

const authStore = useAdminAuthStore()
const route = useRoute()
const router = useRouter()

const query = ref('')
const users = ref<AdminUserListItem[]>([])
const selectedUser = ref<AdminUserDetail | null>(null)
const dialogMode = ref<'create' | 'edit' | null>(null)
const saving = ref(false)
const message = ref('')
const draft = ref({
  name: '',
  email: '',
  password: '',
  resetPassword: '',
})

const dialogOpen = computed(() => dialogMode.value !== null)
const activeUserId = computed(() => selectedUser.value?.id || getQueryString(route.query.focus))
const roleSummaryText = computed(() =>
  selectedUser.value?.roleSummary.map((item) => `${WORKSPACE_ROLE_LABELS[item.role]} ${item.count}`).join(' / ') || '暂无角色',
)
const relatedWorkspaces = computed(() => [
  ...(selectedUser.value?.ownedWorkspaces || []),
  ...(selectedUser.value?.joinedWorkspaces || []),
])
const riskWorkspaces = computed(() => relatedWorkspaces.value.filter((workspace) => workspace.risk === 'high'))

function resetDraft() {
  draft.value = {
    name: '',
    email: '',
    password: '',
    resetPassword: '',
  }
}

function fillDraft(detail: AdminUserDetail) {
  draft.value = {
    name: detail.name,
    email: detail.email,
    password: '',
    resetPassword: '',
  }
}

async function loadUsers() {
  const params = new URLSearchParams()
  if (query.value.trim()) {
    params.set('query', query.value.trim())
  }

  users.value = await authStore.withToken<AdminUserListItem[]>(`/admin/users${params.toString() ? `?${params.toString()}` : ''}`)
}

async function loadUserDetail(userId: string) {
  const detail = await authStore.withToken<AdminUserDetail>(`/admin/users/${userId}`)
  selectedUser.value = detail
  fillDraft(detail)
  dialogMode.value = 'edit'
}

async function syncRouteState() {
  query.value = getQueryString(route.query.query)
  await loadUsers()

  const focusId = getQueryString(route.query.focus)
  if (focusId) {
    if (selectedUser.value?.id !== focusId || dialogMode.value !== 'edit') {
      await loadUserDetail(focusId)
    }
    return
  }

  if (query.value.trim() && users.value.length === 1) {
    await loadUserDetail(users.value[0].id)
    return
  }

  if (dialogMode.value === 'edit') {
    selectedUser.value = null
    dialogMode.value = null
    resetDraft()
  }
}

function applyFilters() {
  router.replace({
    query: mergeQuery(route.query, {
      query: query.value.trim() || null,
      focus: null,
    }),
  })
}

function focusUser(userId: string) {
  router.replace({
    query: mergeQuery(route.query, {
      query: query.value.trim() || null,
      focus: userId,
    }),
  })
}

function closeDialog() {
  selectedUser.value = null
  dialogMode.value = null
  resetDraft()

  if (getQueryString(route.query.focus)) {
    router.replace({
      query: mergeQuery(route.query, { focus: null }),
    })
  }
}

function openCreateDialog() {
  selectedUser.value = null
  resetDraft()
  dialogMode.value = 'create'
}

function jumpToWorkspace(workspaceId: string) {
  closeDialog()
  router.push({
    path: '/workspaces',
    query: { focus: workspaceId },
  })
}

function jumpToOwnedWorkspaces(userId: string) {
  closeDialog()
  router.push({
    path: '/workspaces',
    query: { ownerUserId: userId },
  })
}

function jumpToMembers(workspaceId: string) {
  closeDialog()
  router.push({
    path: '/members',
    query: { workspaceId },
  })
}

function jumpToWorkspaceNotes(workspace: AdminUserWorkspaceRef) {
  closeDialog()
  router.push({
    path: '/notes',
    query: {
      workspaceId: workspace.workspaceId,
      state: workspace.risk === 'high' ? 'overdue' : 'active',
    },
  })
}

async function saveUser() {
  saving.value = true
  message.value = ''

  try {
    if (selectedUser.value) {
      await authStore.withToken(`/admin/users/${selectedUser.value.id}`, {
        method: 'PATCH',
        body: {
          name: draft.value.name,
          email: draft.value.email,
        },
      })
      message.value = '账号已更新。'
    } else {
      await authStore.withToken<AdminUserListItem>('/admin/users', {
        method: 'POST',
        body: {
          name: draft.value.name,
          email: draft.value.email,
          password: draft.value.password,
        },
      })
      message.value = '账号已创建。'
    }

    closeDialog()
    await loadUsers()
  } catch (error) {
    message.value = error instanceof Error ? error.message : '账号保存失败'
  } finally {
    saving.value = false
  }
}

async function resetUserPassword() {
  if (!selectedUser.value || !draft.value.resetPassword.trim()) {
    message.value = '请输入新密码后再重置。'
    return
  }

  saving.value = true
  message.value = ''

  try {
    await authStore.withToken(`/admin/users/${selectedUser.value.id}/reset-password`, {
      method: 'POST',
      body: {
        password: draft.value.resetPassword,
      },
    })
    closeDialog()
    message.value = '密码已重置。'
    await loadUsers()
  } catch (error) {
    message.value = error instanceof Error ? error.message : '密码重置失败'
  } finally {
    saving.value = false
  }
}

async function deleteUser() {
  if (!selectedUser.value) {
    return
  }

  saving.value = true
  message.value = ''

  try {
    await authStore.withToken(`/admin/users/${selectedUser.value.id}`, {
      method: 'DELETE',
    })
    closeDialog()
    message.value = '账号已删除。'
    await loadUsers()
  } catch (error) {
    message.value = error instanceof Error ? error.message : '账号删除失败'
  } finally {
    saving.value = false
  }
}

watch(
  () => `${getQueryString(route.query.query)}|${getQueryString(route.query.focus)}`,
  async () => {
    await syncRouteState()
  },
)

onMounted(async () => {
  await syncRouteState()
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <div class="stack">
        <h3>账号管理</h3>
      </div>
      <div class="toolbar">
        <input v-model="query" class="field" placeholder="搜索姓名或邮箱" @keydown.enter="applyFilters" />
        <button class="btn btn-secondary" @click="applyFilters">筛选</button>
        <button class="btn btn-primary" @click="openCreateDialog">新增账号</button>
      </div>
    </header>

    <div v-if="message" class="message" :class="{ error: message.includes('失败') || message.includes('不能') || message.includes('没有') }">{{ message }}</div>

    <article class="panel">
      <div class="table-shell">
        <table class="table">
          <thead>
            <tr>
              <th>账号</th>
              <th>邮箱</th>
              <th>角色分布</th>
              <th>工作区</th>
              <th>删除</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in users"
              :key="user.id"
              :class="{ active: activeUserId === user.id }"
              @click="focusUser(user.id)"
            >
              <td>
                <div class="table-main">
                  <strong>{{ user.name }}</strong>
                </div>
              </td>
              <td>{{ user.email }}</td>
              <td>{{ user.roles.map((role) => WORKSPACE_ROLE_LABELS[role]).join(' / ') || '暂无' }}</td>
              <td>{{ user.workspaceCount }} / 拥有 {{ user.ownedWorkspaceCount }}</td>
              <td>{{ user.canDelete ? '允许' : '锁定' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

    <AdminDialog
      :open="dialogOpen"
      :title="dialogMode === 'edit' ? '账号详情' : '新增账号'"
      size="xl"
      @close="closeDialog"
    >
      <div v-if="selectedUser" class="summary-strip">
        <article class="summary-card">
          <span>拥有工作区</span>
          <strong>{{ selectedUser.ownedWorkspaces.length }}</strong>
        </article>
        <article class="summary-card">
          <span>加入工作区</span>
          <strong>{{ selectedUser.joinedWorkspaces.length }}</strong>
        </article>
        <article class="summary-card">
          <span>高风险工作区</span>
          <strong>{{ riskWorkspaces.length }}</strong>
        </article>
        <article class="summary-card wide">
          <span>角色分布</span>
          <strong>{{ roleSummaryText }}</strong>
        </article>
      </div>

      <div class="form-grid">
        <label class="full">
          <span>姓名</span>
          <input v-model="draft.name" class="field" placeholder="请输入姓名" />
        </label>
        <label class="full">
          <span>邮箱</span>
          <input v-model="draft.email" class="field" placeholder="请输入邮箱" />
        </label>
        <label v-if="dialogMode === 'create'" class="full">
          <span>初始密码</span>
          <input v-model="draft.password" class="field" type="password" placeholder="请输入初始密码" />
        </label>
        <label v-else class="full">
          <span>重置密码</span>
          <input v-model="draft.resetPassword" class="field" type="password" placeholder="输入新密码后点击重置" />
        </label>
      </div>

      <section v-if="selectedUser" class="relation-grid">
        <article class="relation-panel">
          <header class="relation-head">
            <h4>拥有的工作区</h4>
            <button class="btn btn-ghost mini" @click="jumpToOwnedWorkspaces(selectedUser.id)">查看全部</button>
          </header>
          <div v-if="selectedUser.ownedWorkspaces.length" class="relation-list">
            <div v-for="workspace in selectedUser.ownedWorkspaces" :key="`${workspace.workspaceId}-owned`" class="relation-item">
              <div class="relation-copy">
                <strong>{{ workspace.workspaceName }}</strong>
                <span>成员 {{ workspace.memberCount }} · 便签 {{ workspace.noteCount }} · 模板 {{ workspace.templateCount }} · 标签 {{ workspace.tagCount }}</span>
              </div>
              <div class="relation-actions">
                <button class="btn btn-ghost mini" @click="jumpToWorkspace(workspace.workspaceId)">工作区</button>
                <button class="btn btn-ghost mini" @click="jumpToMembers(workspace.workspaceId)">成员</button>
                <button class="btn btn-ghost mini" @click="jumpToWorkspaceNotes(workspace)">便签</button>
              </div>
            </div>
          </div>
          <div v-else class="empty-panel">当前没有 owner 归属工作区。</div>
        </article>

        <article class="relation-panel">
          <header class="relation-head">
            <h4>加入的工作区</h4>
          </header>
          <div v-if="selectedUser.joinedWorkspaces.length" class="relation-list">
            <div v-for="workspace in selectedUser.joinedWorkspaces" :key="`${workspace.workspaceId}-joined`" class="relation-item">
              <div class="relation-copy">
                <strong>{{ workspace.workspaceName }}</strong>
                <span>{{ WORKSPACE_ROLE_LABELS[workspace.role] }} · 成员 {{ workspace.memberCount }} · 便签 {{ workspace.noteCount }} · 逾期 {{ workspace.overdueCount }}</span>
              </div>
              <div class="relation-actions">
                <button class="btn btn-ghost mini" @click="jumpToWorkspace(workspace.workspaceId)">工作区</button>
                <button class="btn btn-ghost mini" @click="jumpToMembers(workspace.workspaceId)">成员</button>
                <button class="btn btn-ghost mini" @click="jumpToWorkspaceNotes(workspace)">便签</button>
              </div>
            </div>
          </div>
          <div v-else class="empty-panel">当前没有额外加入的工作区。</div>
        </article>

        <article v-if="riskWorkspaces.length" class="relation-panel full-width">
          <header class="relation-head">
            <h4>高风险工作区</h4>
          </header>
          <div class="relation-list">
            <div v-for="workspace in riskWorkspaces" :key="`${workspace.workspaceId}-risk`" class="relation-item">
              <div class="relation-copy">
                <strong>{{ workspace.workspaceName }}</strong>
                <span>逾期 {{ workspace.overdueCount }} · 冲突 {{ workspace.conflictCount }} · 标签 {{ workspace.tagCount }}</span>
              </div>
              <div class="relation-actions">
                <button class="btn btn-ghost mini" @click="jumpToWorkspace(workspace.workspaceId)">工作区</button>
                <button class="btn btn-ghost mini" @click="jumpToWorkspaceNotes(workspace)">便签</button>
              </div>
            </div>
          </div>
        </article>
      </section>

      <template #footer>
        <button class="btn btn-primary" :disabled="saving" @click="saveUser">
          {{ saving ? '保存中...' : dialogMode === 'edit' ? '保存修改' : '创建账号' }}
        </button>
        <button v-if="dialogMode === 'edit'" class="btn btn-secondary" :disabled="saving" @click="resetUserPassword">重置密码</button>
        <button
          v-if="dialogMode === 'edit'"
          class="btn btn-danger"
          :disabled="saving || !selectedUser?.canDelete"
          @click="deleteUser"
        >
          删除账号
        </button>
      </template>
    </AdminDialog>
  </section>
</template>

<style scoped>
.table-main,
.relation-copy {
  display: grid;
  gap: 0.16rem;
}

.summary-strip,
.relation-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.summary-strip {
  margin-bottom: 1rem;
}

.summary-card,
.relation-panel {
  border: 1px solid var(--border);
  border-radius: 24px;
  background: var(--panel-strong);
}

.summary-card {
  min-width: 150px;
  padding: 1rem 1.05rem;
  display: grid;
  gap: 0.25rem;
}

.summary-card.wide {
  flex: 1 1 260px;
}

.summary-card span {
  color: var(--text-soft);
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.summary-card strong {
  color: var(--heading);
}

.relation-grid {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.relation-panel {
  padding: 1rem;
  display: grid;
  gap: 0.85rem;
}

.relation-panel.full-width {
  grid-column: 1 / -1;
}

.relation-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.relation-head h4 {
  margin: 0;
  color: var(--heading);
}

.relation-list {
  display: grid;
  gap: 0.7rem;
}

.relation-item {
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 0.95rem 1rem;
  background: rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.relation-copy span {
  color: var(--text-muted);
}

.mini {
  min-height: 36px;
  padding-inline: 0.85rem;
}

@media (max-width: 980px) {
  .relation-grid {
    grid-template-columns: 1fr;
  }

  .relation-panel.full-width {
    grid-column: auto;
  }

  .relation-item {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>

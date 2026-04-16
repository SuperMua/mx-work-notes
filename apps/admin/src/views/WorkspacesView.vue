<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NOTE_STATUS_LABELS, PRIORITY_LABELS, WORKSPACE_ROLE_LABELS } from '@shared'
import type { AdminTagListItem, AdminUserListItem, AdminWorkspaceDetail, AdminWorkspaceListItem } from '@shared'

import AdminDialog from '@/components/AdminDialog.vue'
import { getQueryString, mergeQuery } from '@/lib/query'
import { useAdminAuthStore } from '@/stores/auth'

const authStore = useAdminAuthStore()
const route = useRoute()
const router = useRouter()

const query = ref('')
const ownerUserIdFilter = ref('')
const riskFilter = ref<'high' | 'normal' | ''>('')
const users = ref<AdminUserListItem[]>([])
const workspaces = ref<AdminWorkspaceListItem[]>([])
const selectedWorkspace = ref<AdminWorkspaceDetail | null>(null)
const dialogMode = ref<'create' | 'edit' | null>(null)
const saving = ref(false)
const message = ref('')
const draft = ref({
  name: '',
  description: '',
  ownerUserId: '',
})

const dialogOpen = computed(() => dialogMode.value !== null)
const activeWorkspaceId = computed(() => selectedWorkspace.value?.id || getQueryString(route.query.focus))
const riskSummary = computed(() => {
  if (!selectedWorkspace.value) {
    return '正常'
  }

  if (selectedWorkspace.value.risk === 'normal') {
    return '正常'
  }

  return `高风险 · 逾期 ${selectedWorkspace.value.overdueCount} / 冲突 ${selectedWorkspace.value.conflictCount}`
})

function resetDraft() {
  draft.value = {
    name: '',
    description: '',
    ownerUserId: users.value[0]?.id || '',
  }
}

function fillDraft(detail: AdminWorkspaceDetail) {
  draft.value = {
    name: detail.name,
    description: detail.description,
    ownerUserId: '',
  }
}

async function loadUsers() {
  users.value = await authStore.withToken<AdminUserListItem[]>('/admin/users')
  if (!draft.value.ownerUserId) {
    draft.value.ownerUserId = users.value[0]?.id || ''
  }
}

async function loadWorkspaces() {
  const params = new URLSearchParams()
  if (query.value.trim()) {
    params.set('query', query.value.trim())
  }
  if (ownerUserIdFilter.value) {
    params.set('ownerUserId', ownerUserIdFilter.value)
  }
  if (riskFilter.value) {
    params.set('risk', riskFilter.value)
  }

  workspaces.value = await authStore.withToken<AdminWorkspaceListItem[]>(`/admin/workspaces${params.toString() ? `?${params.toString()}` : ''}`)
}

async function loadWorkspaceDetail(workspaceId: string) {
  const detail = await authStore.withToken<AdminWorkspaceDetail>(`/admin/workspaces/${workspaceId}`)
  selectedWorkspace.value = detail
  fillDraft(detail)
  dialogMode.value = 'edit'
}

function hasFilterSignal() {
  return Boolean(query.value.trim() || ownerUserIdFilter.value || riskFilter.value)
}

async function syncRouteState() {
  query.value = getQueryString(route.query.query)
  ownerUserIdFilter.value = getQueryString(route.query.ownerUserId)
  riskFilter.value = (getQueryString(route.query.risk) as 'high' | 'normal' | '') || ''

  await Promise.all([loadUsers(), loadWorkspaces()])

  const focusId = getQueryString(route.query.focus)
  if (focusId) {
    if (selectedWorkspace.value?.id !== focusId || dialogMode.value !== 'edit') {
      await loadWorkspaceDetail(focusId)
    }
    return
  }

  if (hasFilterSignal() && workspaces.value.length === 1) {
    await loadWorkspaceDetail(workspaces.value[0].id)
    return
  }

  if (dialogMode.value === 'edit') {
    selectedWorkspace.value = null
    dialogMode.value = null
    resetDraft()
  }
}

function applyFilters() {
  router.replace({
    query: mergeQuery(route.query, {
      query: query.value.trim() || null,
      ownerUserId: ownerUserIdFilter.value || null,
      risk: riskFilter.value || null,
      focus: null,
    }),
  })
}

function focusWorkspace(workspaceId: string) {
  router.replace({
    query: mergeQuery(route.query, {
      query: query.value.trim() || null,
      ownerUserId: ownerUserIdFilter.value || null,
      risk: riskFilter.value || null,
      focus: workspaceId,
    }),
  })
}

function closeDialog() {
  selectedWorkspace.value = null
  dialogMode.value = null
  resetDraft()

  if (getQueryString(route.query.focus)) {
    router.replace({
      query: mergeQuery(route.query, { focus: null }),
    })
  }
}

function openCreateDialog() {
  selectedWorkspace.value = null
  resetDraft()
  dialogMode.value = 'create'
}

function jumpTo(path: string, queryPatch: Record<string, string | null | undefined>) {
  closeDialog()
  router.push({
    path,
    query: mergeQuery({}, queryPatch),
  })
}

function openTag(tag: AdminTagListItem) {
  jumpTo('/tags', {
    workspaceId: selectedWorkspace.value?.id || null,
    focus: tag.name,
  })
}

async function saveWorkspace() {
  saving.value = true
  message.value = ''

  try {
    if (selectedWorkspace.value) {
      await authStore.withToken(`/admin/workspaces/${selectedWorkspace.value.id}`, {
        method: 'PATCH',
        body: {
          name: draft.value.name,
          description: draft.value.description,
        },
      })
      message.value = '工作区已更新。'
    } else {
      await authStore.withToken('/admin/workspaces', {
        method: 'POST',
        body: {
          name: draft.value.name,
          description: draft.value.description,
          ownerUserId: draft.value.ownerUserId || undefined,
        },
      })
      message.value = '工作区已创建。'
    }

    closeDialog()
    await loadWorkspaces()
  } catch (error) {
    message.value = error instanceof Error ? error.message : '工作区保存失败'
  } finally {
    saving.value = false
  }
}

async function deleteWorkspace() {
  if (!selectedWorkspace.value) {
    return
  }

  saving.value = true
  message.value = ''

  try {
    await authStore.withToken(`/admin/workspaces/${selectedWorkspace.value.id}`, {
      method: 'DELETE',
    })
    closeDialog()
    message.value = '工作区已删除。'
    await loadWorkspaces()
  } catch (error) {
    message.value = error instanceof Error ? error.message : '工作区删除失败'
  } finally {
    saving.value = false
  }
}

watch(
  () => `${getQueryString(route.query.query)}|${getQueryString(route.query.ownerUserId)}|${getQueryString(route.query.risk)}|${getQueryString(route.query.focus)}`,
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
        <h3>工作区管理</h3>
      </div>
      <div class="toolbar">
        <input v-model="query" class="field" placeholder="搜索工作区名称" @keydown.enter="applyFilters" />
        <select v-model="ownerUserIdFilter" class="select">
          <option value="">全部拥有者</option>
          <option v-for="user in users" :key="user.id" :value="user.id">{{ user.name }}</option>
        </select>
        <select v-model="riskFilter" class="select">
          <option value="">全部风险级别</option>
          <option value="high">高风险</option>
          <option value="normal">正常</option>
        </select>
        <button class="btn btn-secondary" @click="applyFilters">筛选</button>
        <button class="btn btn-primary" @click="openCreateDialog">新增工作区</button>
      </div>
    </header>

    <div v-if="message" class="message" :class="{ error: message.includes('失败') }">{{ message }}</div>

    <article class="panel">
      <div class="table-shell">
        <table class="table">
          <thead>
            <tr>
              <th>工作区</th>
              <th>拥有者</th>
              <th>成员</th>
              <th>便签</th>
              <th>模板</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="workspace in workspaces"
              :key="workspace.id"
              :class="{ active: activeWorkspaceId === workspace.id }"
              @click="focusWorkspace(workspace.id)"
            >
              <td>
                <div class="table-main">
                  <strong>{{ workspace.name }}</strong>
                  <span>{{ workspace.description || '未填写描述' }}</span>
                </div>
              </td>
              <td>{{ workspace.ownerNames.join(' / ') || '未设置' }}</td>
              <td>{{ workspace.memberCount }}</td>
              <td>{{ workspace.noteCount }}</td>
              <td>{{ workspace.templateCount }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

    <AdminDialog
      :open="dialogOpen"
      :title="dialogMode === 'edit' ? '工作区详情' : '新增工作区'"
      size="xl"
      @close="closeDialog"
    >
      <div v-if="selectedWorkspace" class="summary-strip">
        <article class="summary-card">
          <span>成员</span>
          <strong>{{ selectedWorkspace.memberCount }}</strong>
        </article>
        <article class="summary-card">
          <span>便签</span>
          <strong>{{ selectedWorkspace.noteCount }}</strong>
        </article>
        <article class="summary-card">
          <span>模板</span>
          <strong>{{ selectedWorkspace.templateCount }}</strong>
        </article>
        <article class="summary-card">
          <span>标签</span>
          <strong>{{ selectedWorkspace.tagCount }}</strong>
        </article>
        <article class="summary-card wide" :class="{ danger: selectedWorkspace.risk === 'high' }">
          <span>风险状态</span>
          <strong>{{ riskSummary }}</strong>
        </article>
      </div>

      <div class="form-grid">
        <label class="full">
          <span>工作区名称</span>
          <input v-model="draft.name" class="field" placeholder="请输入工作区名称" />
        </label>
        <label class="full">
          <span>工作区描述</span>
          <textarea v-model="draft.description" class="textarea" placeholder="请输入工作区描述" />
        </label>
        <label v-if="dialogMode === 'create'" class="full">
          <span>默认拥有者</span>
          <select v-model="draft.ownerUserId" class="select">
            <option value="">使用当前登录账号</option>
            <option v-for="user in users" :key="user.id" :value="user.id">{{ user.name }}（{{ user.email }}）</option>
          </select>
        </label>
      </div>

      <section v-if="selectedWorkspace" class="preview-grid">
        <article class="relation-panel">
          <header class="relation-head">
            <h4>拥有者</h4>
          </header>
          <div class="relation-list">
            <div v-for="owner in selectedWorkspace.owners" :key="owner.userId" class="relation-item">
              <div class="relation-copy">
                <strong>{{ owner.name }}</strong>
                <span>{{ owner.email || '未填写邮箱' }}</span>
              </div>
              <button class="btn btn-ghost mini" @click="jumpTo('/users', { focus: owner.userId })">账号</button>
            </div>
          </div>
        </article>

        <article class="relation-panel">
          <header class="relation-head">
            <h4>角色分布</h4>
            <button class="btn btn-ghost mini" @click="jumpTo('/members', { workspaceId: selectedWorkspace.id })">查看成员</button>
          </header>
          <div class="pill-list">
            <span v-for="item in selectedWorkspace.roleBreakdown" :key="item.role" class="pill">{{ WORKSPACE_ROLE_LABELS[item.role] }} · {{ item.count }}</span>
          </div>
        </article>

        <article class="relation-panel">
          <header class="relation-head">
            <h4>最近成员</h4>
            <button class="btn btn-ghost mini" @click="jumpTo('/members', { workspaceId: selectedWorkspace.id })">查看全部</button>
          </header>
          <div class="relation-list">
            <div v-for="member in selectedWorkspace.recentMembers" :key="member.id" class="relation-item">
              <div class="relation-copy">
                <strong>{{ member.name }}</strong>
                <span>{{ WORKSPACE_ROLE_LABELS[member.role] }} · {{ member.email || '未填写邮箱' }}</span>
              </div>
              <div class="relation-actions">
                <button class="btn btn-ghost mini" @click="jumpTo('/members', { workspaceId: selectedWorkspace.id, focus: member.id })">成员</button>
                <button class="btn btn-ghost mini" @click="jumpTo('/users', { focus: member.userId })">账号</button>
              </div>
            </div>
          </div>
        </article>

        <article class="relation-panel">
          <header class="relation-head">
            <h4>最近便签</h4>
            <button class="btn btn-ghost mini" @click="jumpTo('/notes', { workspaceId: selectedWorkspace.id })">查看全部</button>
          </header>
          <div class="relation-list">
            <div v-for="note in selectedWorkspace.recentNotes" :key="note.id" class="relation-item">
              <div class="relation-copy">
                <strong>{{ note.title }}</strong>
                <span>{{ PRIORITY_LABELS[note.priority] }} · {{ NOTE_STATUS_LABELS[note.status] }} · {{ note.updatedAt.slice(0, 10) }}</span>
              </div>
              <button class="btn btn-ghost mini" @click="jumpTo('/notes', { workspaceId: selectedWorkspace.id, focus: note.id })">便签</button>
            </div>
          </div>
        </article>

        <article class="relation-panel">
          <header class="relation-head">
            <h4>最近模板</h4>
            <button class="btn btn-ghost mini" @click="jumpTo('/templates', { workspaceId: selectedWorkspace.id })">查看全部</button>
          </header>
          <div class="relation-list">
            <div v-for="template in selectedWorkspace.recentTemplates" :key="template.id" class="relation-item">
              <div class="relation-copy">
                <strong>{{ template.name }}</strong>
                <span>{{ template.key }} · {{ template.updatedAt.slice(0, 10) }}</span>
              </div>
              <button class="btn btn-ghost mini" @click="jumpTo('/templates', { workspaceId: selectedWorkspace.id, focus: template.id })">模板</button>
            </div>
          </div>
        </article>

        <article class="relation-panel">
          <header class="relation-head">
            <h4>高频标签</h4>
            <button class="btn btn-ghost mini" @click="jumpTo('/tags', { workspaceId: selectedWorkspace.id })">查看全部</button>
          </header>
          <div class="tag-list">
            <button v-for="tag in selectedWorkspace.topTags" :key="tag.name" class="tag-item" type="button" @click="openTag(tag)">
              <span class="tag-dot" :style="{ background: tag.color }" />
              <strong>{{ tag.name }}</strong>
              <span>{{ tag.usageCount }}</span>
            </button>
          </div>
        </article>

        <article class="relation-panel">
          <header class="relation-head">
            <h4>管理直达</h4>
          </header>
          <div class="action-grid">
            <button class="btn btn-secondary" @click="jumpTo('/members', { workspaceId: selectedWorkspace.id })">成员管理</button>
            <button class="btn btn-secondary" @click="jumpTo('/notes', { workspaceId: selectedWorkspace.id })">便签管理</button>
            <button class="btn btn-secondary" @click="jumpTo('/templates', { workspaceId: selectedWorkspace.id })">模板管理</button>
            <button class="btn btn-secondary" @click="jumpTo('/tags', { workspaceId: selectedWorkspace.id })">标签管理</button>
            <button class="btn btn-secondary" @click="jumpTo('/sync', { workspaceId: selectedWorkspace.id })">同步监控</button>
            <button class="btn btn-secondary" @click="jumpTo('/notes', { workspaceId: selectedWorkspace.id, state: 'overdue' })">逾期便签</button>
          </div>
        </article>
      </section>

      <template #footer>
        <button class="btn btn-primary" :disabled="saving" @click="saveWorkspace">
          {{ saving ? '保存中...' : dialogMode === 'edit' ? '保存修改' : '创建工作区' }}
        </button>
        <button v-if="dialogMode === 'edit'" class="btn btn-danger" :disabled="saving" @click="deleteWorkspace">删除工作区</button>
      </template>
    </AdminDialog>
  </section>
</template>

<style scoped>
.table-main,
.relation-copy {
  display: grid;
  gap: 0.18rem;
}

.table-main span,
.relation-copy span {
  color: var(--text-muted);
}

.summary-strip,
.relation-actions,
.pill-list {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
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
  min-width: 132px;
  padding: 1rem 1.05rem;
  display: grid;
  gap: 0.22rem;
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

.summary-card.danger strong {
  color: var(--danger);
}

.preview-grid {
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

.relation-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.tag-list,
.action-grid {
  display: grid;
  gap: 0.7rem;
}

.action-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.tag-item {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 0.9rem 1rem;
  background: rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  gap: 0.7rem;
  color: var(--text);
}

.tag-dot {
  width: 0.72rem;
  height: 0.72rem;
  border-radius: 999px;
  flex-shrink: 0;
}

.tag-item strong {
  flex: 1;
  text-align: left;
}

.tag-item span:last-child {
  color: var(--text-muted);
}

.mini {
  min-height: 36px;
  padding-inline: 0.85rem;
}

@media (max-width: 980px) {
  .preview-grid,
  .action-grid {
    grid-template-columns: 1fr;
  }

  .relation-item {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>

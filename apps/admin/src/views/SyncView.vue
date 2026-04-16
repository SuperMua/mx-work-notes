<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NOTE_STATUS_LABELS, PRIORITY_LABELS, SYNC_STATUS_LABELS } from '@shared'
import type { AdminConflictListItem, AdminDashboardMetrics, AdminWorkspaceListItem } from '@shared'

import AdminDialog from '@/components/AdminDialog.vue'
import { getQueryString, mergeQuery } from '@/lib/query'
import { useAdminAuthStore } from '@/stores/auth'

const authStore = useAdminAuthStore()
const route = useRoute()
const router = useRouter()

const health = ref<{ status: string; uptime: number; timestamp: string } | null>(null)
const metrics = ref<AdminDashboardMetrics | null>(null)
const workspaces = ref<AdminWorkspaceListItem[]>([])
const conflicts = ref<AdminConflictListItem[]>([])
const selectedConflict = ref<AdminConflictListItem | null>(null)
const loading = ref(false)
const message = ref('')
const workspaceFilter = ref('')
const query = ref('')

const dialogOpen = computed(() => Boolean(selectedConflict.value))
const activeConflictId = computed(() => selectedConflict.value?.id || getQueryString(route.query.focus))

const filteredConflicts = computed(() =>
  conflicts.value.filter((item) => {
    const matchesWorkspace = !workspaceFilter.value || item.workspaceId === workspaceFilter.value
    const keyword = query.value.trim().toLowerCase()
    const matchesKeyword =
      !keyword ||
      item.title.toLowerCase().includes(keyword) ||
      item.workspaceName.toLowerCase().includes(keyword) ||
      item.tags.some((tag) => tag.toLowerCase().includes(keyword))

    return matchesWorkspace && matchesKeyword
  }),
)

const affectedWorkspaceCount = computed(() => new Set(filteredConflicts.value.map((item) => item.workspaceId)).size)
const highRiskWorkspaces = computed(() => metrics.value?.riskWorkspaces || [])
const selectedWorkspaceRisk = computed(() =>
  selectedConflict.value
    ? highRiskWorkspaces.value.find((item) => item.workspaceId === selectedConflict.value?.workspaceId) || null
    : null,
)
const selectedWorkspace = computed(() =>
  selectedConflict.value
    ? workspaces.value.find((item) => item.id === selectedConflict.value?.workspaceId) || null
    : null,
)
const selectedWorkspaceConflictCount = computed(() => {
  if (!selectedConflict.value) {
    return 0
  }

  return conflicts.value.filter((item) => item.workspaceId === selectedConflict.value?.workspaceId).length
})
const sameWorkspaceConflicts = computed(() => {
  if (!selectedConflict.value) {
    return []
  }

  return conflicts.value
    .filter((item) => item.workspaceId === selectedConflict.value?.workspaceId && item.id !== selectedConflict.value.id)
    .slice(0, 5)
})

function formatHealthStatus(status: string | undefined) {
  if (!status) {
    return '未知'
  }

  return status === 'ok' ? '正常' : status
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '未设置'
  }

  return value.slice(0, 16).replace('T', ' ')
}

function formatDueDate(conflict: AdminConflictListItem) {
  return formatDateTime(conflict.dueDate)
}

function isConflictOverdue(conflict: AdminConflictListItem) {
  return conflict.state === 'overdue'
}

function hasFilterSignal() {
  return Boolean(workspaceFilter.value || query.value.trim())
}

async function loadData() {
  loading.value = true
  message.value = ''

  try {
    const [nextHealth, nextMetrics, nextConflicts, nextWorkspaces] = await Promise.all([
      authStore.withToken<{ status: string; uptime: number; timestamp: string }>('/admin/health'),
      authStore.withToken<AdminDashboardMetrics>('/admin/dashboard'),
      authStore.withToken<AdminConflictListItem[]>('/admin/sync/conflicts'),
      authStore.withToken<AdminWorkspaceListItem[]>('/admin/workspaces'),
    ])

    health.value = nextHealth
    metrics.value = nextMetrics
    conflicts.value = nextConflicts
    workspaces.value = nextWorkspaces
  } catch (error) {
    message.value = error instanceof Error ? error.message : '同步监控加载失败'
  } finally {
    loading.value = false
  }
}

async function syncRouteState() {
  workspaceFilter.value = getQueryString(route.query.workspaceId)
  query.value = getQueryString(route.query.query)

  await loadData()

  const focusId = getQueryString(route.query.focus)
  if (focusId) {
    selectedConflict.value = filteredConflicts.value.find((item) => item.id === focusId) || null
    return
  }

  if (hasFilterSignal() && filteredConflicts.value.length === 1) {
    selectedConflict.value = filteredConflicts.value[0]
    return
  }

  selectedConflict.value = null
}

function applyFilters() {
  router.replace({
    query: mergeQuery(route.query, {
      workspaceId: workspaceFilter.value || null,
      query: query.value.trim() || null,
      focus: null,
    }),
  })
}

function focusConflict(conflict: AdminConflictListItem) {
  router.replace({
    query: mergeQuery(route.query, {
      workspaceId: workspaceFilter.value || conflict.workspaceId,
      query: query.value.trim() || null,
      focus: conflict.id,
    }),
  })
}

function closeDialog() {
  selectedConflict.value = null

  if (getQueryString(route.query.focus)) {
    router.replace({
      query: mergeQuery(route.query, { focus: null }),
    })
  }
}

function jumpTo(path: string, queryPatch: Record<string, string | null | undefined>) {
  closeDialog()
  router.push({
    path,
    query: mergeQuery({}, queryPatch),
  })
}

function jumpToConflictNotes(conflict: AdminConflictListItem) {
  jumpTo('/notes', {
    workspaceId: conflict.workspaceId,
    focus: conflict.id,
    state: conflict.state !== 'active' ? conflict.state : null,
  })
}

watch(
  () => [getQueryString(route.query.workspaceId), getQueryString(route.query.query), getQueryString(route.query.focus)].join('|'),
  async () => {
    await syncRouteState()
  },
)

onMounted(async () => {
  await syncRouteState()
})
</script>

<template>
  <section class="page sync-page">
    <header class="page-header">
      <div class="stack">
        <h3>同步监控</h3>
      </div>
      <div class="toolbar">
        <select v-model="workspaceFilter" class="select">
          <option value="">全部工作区</option>
          <option v-for="workspace in workspaces" :key="workspace.id" :value="workspace.id">{{ workspace.name }}</option>
        </select>
        <input v-model="query" class="field" placeholder="搜索便签标题、工作区或标签" @keydown.enter="applyFilters" />
        <button class="btn btn-secondary" @click="applyFilters">筛选</button>
        <button class="btn btn-secondary" :disabled="loading" @click="loadData">
          {{ loading ? '刷新中' : '刷新数据' }}
        </button>
      </div>
    </header>

    <div v-if="message" class="message error">{{ message }}</div>

    <section class="summary-grid">
      <button type="button" class="panel summary-action" @click="jumpTo('/notes', { state: 'overdue' })">
        <span>逾期便签</span>
        <strong>{{ metrics?.overdueNotes ?? 0 }}</strong>
        <small>进入便签管理排查时间风险</small>
      </button>

      <button type="button" class="panel summary-action" @click="jumpTo('/workspaces', { risk: 'high' })">
        <span>高风险工作区</span>
        <strong>{{ highRiskWorkspaces.length }}</strong>
        <small>查看逾期与冲突叠加的工作区</small>
      </button>

      <button type="button" class="panel summary-action" @click="jumpTo('/notes', { workspaceId: workspaceFilter || null })">
        <span>当前冲突</span>
        <strong>{{ filteredConflicts.length }}</strong>
        <small>支持按工作区筛选并聚焦单条冲突</small>
      </button>

      <button type="button" class="panel summary-action" @click="jumpTo('/workspaces', {})">
        <span>受影响工作区</span>
        <strong>{{ affectedWorkspaceCount }}</strong>
        <small>查看冲突分布落到哪些工作区</small>
      </button>
    </section>

    <section class="sync-grid">
      <article class="panel status-panel">
        <div class="panel-head">
          <h3>服务状态</h3>
          <span class="pill" :class="{ ok: health?.status === 'ok' }">{{ formatHealthStatus(health?.status) }}</span>
        </div>
        <div class="status-matrix">
          <div class="status-row">
            <span>检查时间</span>
            <strong>{{ formatDateTime(health?.timestamp) }}</strong>
          </div>
          <div class="status-row">
            <span>运行时长</span>
            <strong>{{ Math.round(health?.uptime || 0) }} 秒</strong>
          </div>
          <div class="status-row">
            <span>回收站便签</span>
            <strong>{{ metrics?.trashedNotes ?? 0 }}</strong>
          </div>
          <div class="status-row">
            <span>同步冲突</span>
            <strong>{{ metrics?.conflicts ?? 0 }}</strong>
          </div>
        </div>
      </article>

      <article class="panel risk-panel">
        <div class="panel-head">
          <h3>高风险工作区</h3>
          <button class="btn btn-ghost mini" @click="jumpTo('/workspaces', { risk: 'high' })">查看全部</button>
        </div>

        <div v-if="highRiskWorkspaces.length" class="risk-list">
          <button
            v-for="workspace in highRiskWorkspaces.slice(0, 5)"
            :key="workspace.workspaceId"
            type="button"
            class="risk-item"
            @click="jumpTo('/sync', { workspaceId: workspace.workspaceId })"
          >
            <div class="risk-copy">
              <strong>{{ workspace.workspaceName }}</strong>
              <span>逾期 {{ workspace.overdueCount }} · 冲突 {{ workspace.conflictCount }}</span>
            </div>
            <span class="pill">{{ workspace.noteCount }} 便签</span>
          </button>
        </div>
        <div v-else class="empty-panel">当前没有高风险工作区。</div>
      </article>
    </section>

    <article class="panel conflicts-panel">
      <div class="panel-head">
        <h3>冲突列表</h3>
        <span class="pill">{{ filteredConflicts.length }} 条</span>
      </div>

      <div v-if="filteredConflicts.length" class="table-shell">
        <table class="table">
          <thead>
            <tr>
              <th>便签</th>
              <th>工作区</th>
              <th>状态</th>
              <th>优先级</th>
              <th>截止时间</th>
              <th>最近更新</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="conflict in filteredConflicts"
              :key="conflict.id"
              :class="{ active: activeConflictId === conflict.id }"
              @click="focusConflict(conflict)"
            >
              <td>
                <div class="title-cell">
                  <strong>{{ conflict.title }}</strong>
                  <span>{{ conflict.tags.slice(0, 2).join(' / ') || '无标签' }}</span>
                </div>
              </td>
              <td>{{ conflict.workspaceName }}</td>
              <td>
                <span class="status-pill" :class="{ danger: conflict.state === 'overdue' }">
                  {{ NOTE_STATUS_LABELS[conflict.status] }}
                </span>
              </td>
              <td>{{ PRIORITY_LABELS[conflict.priority] }}</td>
              <td>
                <span :class="{ danger: isConflictOverdue(conflict) }">{{ formatDueDate(conflict) }}</span>
              </td>
              <td>{{ formatDateTime(conflict.updatedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-panel">当前没有同步冲突记录。</div>
    </article>

    <AdminDialog
      :open="dialogOpen"
      :title="selectedConflict ? `冲突详情 · ${selectedConflict.title}` : '冲突详情'"
      size="xl"
      @close="closeDialog"
    >
      <template v-if="selectedConflict">
        <div class="summary-strip">
          <article class="summary-card wide">
            <span>所属工作区</span>
            <strong>{{ selectedConflict.workspaceName }}</strong>
          </article>
          <article class="summary-card">
            <span>同步状态</span>
            <strong>{{ SYNC_STATUS_LABELS[selectedConflict.syncStatus] }}</strong>
          </article>
          <article class="summary-card">
            <span>优先级</span>
            <strong>{{ PRIORITY_LABELS[selectedConflict.priority] }}</strong>
          </article>
          <article class="summary-card">
            <span>当前状态</span>
            <strong>{{ NOTE_STATUS_LABELS[selectedConflict.status] }}</strong>
          </article>
        </div>

        <div class="dialog-grid">
          <section class="dialog-main">
            <article class="relation-panel emphasis">
              <div class="stack">
                <h4>{{ selectedConflict.title }}</h4>
                <div class="signal-row">
                  <span class="pill">{{ selectedConflict.state === 'active' ? '有效中' : selectedConflict.state }}</span>
                  <span class="pill">{{ selectedConflict.completed ? '已完成' : '未完成' }}</span>
                  <span class="pill">{{ selectedConflict.tags.length }} 个标签</span>
                </div>
              </div>

              <div class="detail-grid">
                <div class="detail-item">
                  <span>截止时间</span>
                  <strong :class="{ danger: isConflictOverdue(selectedConflict) }">{{ formatDueDate(selectedConflict) }}</strong>
                </div>
                <div class="detail-item">
                  <span>最近更新</span>
                  <strong>{{ formatDateTime(selectedConflict.updatedAt) }}</strong>
                </div>
                <div class="detail-item">
                  <span>工作区冲突数</span>
                  <strong>{{ selectedWorkspaceConflictCount }}</strong>
                </div>
                <div class="detail-item">
                  <span>高风险状态</span>
                  <strong>{{ selectedWorkspaceRisk ? `逾期 ${selectedWorkspaceRisk.overdueCount} · 冲突 ${selectedWorkspaceRisk.conflictCount}` : '正常' }}</strong>
                </div>
              </div>

              <div class="tag-links">
                <span v-for="tag in selectedConflict.tags" :key="tag" class="tag-chip">{{ tag }}</span>
                <span v-if="!selectedConflict.tags.length" class="empty-chip">当前没有标签</span>
              </div>
            </article>

            <article class="relation-panel">
              <div class="panel-head">
                <h4>同工作区其他冲突</h4>
                <button class="btn btn-ghost mini" @click="jumpTo('/sync', { workspaceId: selectedConflict.workspaceId })">查看全部</button>
              </div>

              <div v-if="sameWorkspaceConflicts.length" class="relation-list">
                <div v-for="item in sameWorkspaceConflicts" :key="item.id" class="relation-item">
                  <div class="relation-copy">
                    <strong>{{ item.title }}</strong>
                    <span>{{ PRIORITY_LABELS[item.priority] }} · {{ NOTE_STATUS_LABELS[item.status] }}</span>
                  </div>
                  <button class="btn btn-ghost mini" @click="focusConflict(item)">查看</button>
                </div>
              </div>
              <div v-else class="empty-panel">当前工作区没有更多冲突。</div>
            </article>
          </section>

          <aside class="dialog-side">
            <article class="relation-panel">
              <h4>工作区摘要</h4>
              <div class="summary-list">
                <span class="pill">成员 {{ selectedWorkspace?.memberCount ?? 0 }}</span>
                <span class="pill">便签 {{ selectedWorkspace?.noteCount ?? 0 }}</span>
                <span class="pill">模板 {{ selectedWorkspace?.templateCount ?? 0 }}</span>
                <span class="pill">{{ selectedWorkspaceRisk ? '高风险' : '状态正常' }}</span>
              </div>
            </article>

            <article class="relation-panel">
              <h4>关联跳转</h4>
              <div class="action-column">
                <button class="btn btn-secondary" @click="jumpToConflictNotes(selectedConflict)">打开便签详情</button>
                <button class="btn btn-secondary" @click="jumpTo('/workspaces', { focus: selectedConflict.workspaceId })">打开工作区</button>
                <button class="btn btn-ghost" @click="jumpTo('/dashboard', {})">返回数据看板</button>
              </div>
            </article>
          </aside>
        </div>
      </template>
    </AdminDialog>
  </section>
</template>

<style scoped>
.sync-page {
  display: grid;
  gap: 1rem;
}

.summary-grid,
.sync-grid,
.dialog-grid,
.summary-strip,
.detail-grid {
  display: grid;
  gap: 0.9rem;
}

.summary-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.sync-grid {
  grid-template-columns: 1.05fr 0.95fr;
}

.summary-action,
.risk-item {
  width: 100%;
  border: 1px solid var(--border);
  background: var(--panel);
  color: inherit;
  text-align: left;
}

.summary-action {
  padding: 1.05rem 1.1rem;
  border-radius: 28px;
  display: grid;
  gap: 0.32rem;
}

.summary-action span,
.detail-item span {
  color: var(--text-soft);
  font-size: 0.82rem;
}

.summary-action strong {
  color: var(--heading);
  font-size: 1.9rem;
  line-height: 1;
}

.summary-action small {
  color: var(--text-muted);
}

.summary-action:hover,
.risk-item:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--accent) 24%, var(--border));
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.status-panel,
.risk-panel,
.conflicts-panel,
.relation-panel {
  display: grid;
  gap: 1rem;
}

.status-matrix {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.status-row,
.detail-item {
  padding: 0.95rem 1rem;
  border-radius: 22px;
  border: 1px solid var(--border);
  background: var(--panel-strong);
  display: grid;
  gap: 0.28rem;
}

.status-row strong,
.detail-item strong {
  color: var(--heading);
}

.risk-list,
.relation-list,
.action-column {
  display: grid;
  gap: 0.75rem;
}

.risk-item {
  padding: 0.95rem 1rem;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.risk-copy,
.title-cell,
.relation-copy {
  display: grid;
  gap: 0.2rem;
}

.risk-copy strong,
.title-cell strong,
.relation-copy strong {
  color: var(--heading);
}

.risk-copy span,
.title-cell span,
.relation-copy span {
  color: var(--text-muted);
}

.title-cell span {
  font-size: 0.82rem;
}

.table tbody tr {
  cursor: pointer;
}

.table tbody tr.active {
  background: color-mix(in srgb, var(--selection) 76%, transparent);
}

.status-pill,
.tag-chip,
.empty-chip,
.signal-row .pill,
.summary-list .pill,
.panel-head .pill {
  display: inline-flex;
  align-items: center;
  min-height: 1.9rem;
  padding: 0 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--panel-strong);
}

.status-pill.danger,
.danger {
  color: var(--danger);
}

.summary-strip {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-bottom: 1rem;
}

.summary-card {
  padding: 0.95rem 1rem;
  border-radius: 24px;
  border: 1px solid var(--border);
  background: var(--panel-strong);
  display: grid;
  gap: 0.22rem;
}

.summary-card span {
  color: var(--text-soft);
  font-size: 0.8rem;
}

.summary-card strong {
  color: var(--heading);
}

.summary-card.wide {
  grid-column: span 1;
}

.dialog-grid {
  grid-template-columns: 1.15fr 0.85fr;
  align-items: start;
}

.dialog-main,
.dialog-side {
  display: grid;
  gap: 0.9rem;
}

.relation-panel {
  padding: 1rem;
  border-radius: 26px;
  border: 1px solid var(--border);
  background: var(--panel-strong);
}

.relation-panel.emphasis {
  gap: 1.1rem;
}

.signal-row,
.tag-links,
.summary-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.relation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 0;
  border-top: 1px solid var(--border);
}

.relation-item:first-child {
  border-top: 0;
  padding-top: 0;
}

.relation-item:last-child {
  padding-bottom: 0;
}

.action-column .btn {
  justify-content: center;
}

.pill.ok {
  color: var(--success);
}

@media (max-width: 1180px) {
  .summary-grid,
  .sync-grid,
  .dialog-grid,
  .summary-strip,
  .status-matrix,
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>

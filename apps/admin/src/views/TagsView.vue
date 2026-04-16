<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NOTE_STATUS_LABELS } from '@shared'
import type { AdminTagDetail, AdminTagListItem, AdminWorkspaceListItem } from '@shared'

import AdminDialog from '@/components/AdminDialog.vue'
import { getQueryString, mergeQuery } from '@/lib/query'
import { useAdminAuthStore } from '@/stores/auth'

const authStore = useAdminAuthStore()
const route = useRoute()
const router = useRouter()

const workspaces = ref<AdminWorkspaceListItem[]>([])
const tags = ref<AdminTagListItem[]>([])
const selectedTag = ref<AdminTagDetail | null>(null)
const workspaceFilter = ref('')
const query = ref('')
const pinnedFilter = ref<'true' | 'false' | ''>('')
const dialogOpen = ref(false)
const loading = ref(false)
const message = ref('')
const draft = ref({
  workspaceId: '',
  currentName: '',
  renamedTo: '',
  color: '#2563eb',
  pinned: false,
})

const activeKey = computed(() =>
  selectedTag.value ? `${selectedTag.value.workspaceId}::${selectedTag.value.tag.name}` : getQueryString(route.query.focus),
)

function resetDraft() {
  draft.value = {
    workspaceId: workspaceFilter.value || workspaces.value[0]?.id || '',
    currentName: '',
    renamedTo: '',
    color: '#2563eb',
    pinned: false,
  }
}

function closeDialog() {
  dialogOpen.value = false
  selectedTag.value = null
  resetDraft()

  if (getQueryString(route.query.focus)) {
    router.replace({
      query: mergeQuery(route.query, { focus: null }),
    })
  }
}

async function loadWorkspaces() {
  workspaces.value = await authStore.withToken<AdminWorkspaceListItem[]>('/admin/workspaces')
  if (!draft.value.workspaceId) {
    draft.value.workspaceId = workspaces.value[0]?.id || ''
  }
}

async function loadTags() {
  const params = new URLSearchParams()
  if (query.value.trim()) {
    params.set('query', query.value.trim())
  }
  if (workspaceFilter.value) {
    params.set('workspaceId', workspaceFilter.value)
  }
  if (pinnedFilter.value) {
    params.set('pinned', pinnedFilter.value)
  }

  tags.value = await authStore.withToken<AdminTagListItem[]>(`/admin/tags${params.toString() ? `?${params.toString()}` : ''}`)
}

async function loadTagDetail(name: string, workspaceId: string) {
  const params = new URLSearchParams({ workspaceId })
  const detail = await authStore.withToken<AdminTagDetail>(`/admin/tags/${encodeURIComponent(name)}?${params.toString()}`)
  selectedTag.value = detail
  draft.value = {
    workspaceId,
    currentName: detail.tag.name,
    renamedTo: detail.tag.name,
    color: detail.tag.color,
    pinned: detail.tag.pinned,
  }
  dialogOpen.value = true
}

function hasFilterSignal() {
  return Boolean(query.value.trim() || workspaceFilter.value || pinnedFilter.value)
}

async function syncRouteState() {
  query.value = getQueryString(route.query.query)
  workspaceFilter.value = getQueryString(route.query.workspaceId)
  pinnedFilter.value = (getQueryString(route.query.pinned) as 'true' | 'false' | '') || ''

  await loadWorkspaces()
  await loadTags()

  const focusName = getQueryString(route.query.focus)
  if (focusName && workspaceFilter.value) {
    await loadTagDetail(focusName, workspaceFilter.value)
    return
  }

  if (hasFilterSignal() && tags.value.length === 1) {
    const target = tags.value[0]
    await loadTagDetail(target.name, target.workspaceId)
    return
  }

  if (dialogOpen.value) {
    dialogOpen.value = false
    selectedTag.value = null
  }
}

function applyFilters() {
  router.replace({
    query: mergeQuery(route.query, {
      query: query.value.trim() || null,
      workspaceId: workspaceFilter.value || null,
      pinned: pinnedFilter.value || null,
      focus: null,
    }),
  })
}

function focusTag(tag: AdminTagListItem) {
  router.replace({
    query: mergeQuery(route.query, {
      query: query.value.trim() || null,
      workspaceId: tag.workspaceId || workspaceFilter.value || null,
      pinned: pinnedFilter.value || null,
      focus: tag.name,
    }),
  })
}

function jumpTo(path: string, queryPatch: Record<string, string | null | undefined>) {
  closeDialog()
  router.push({
    path,
    query: mergeQuery({}, queryPatch),
  })
}

async function saveTag() {
  if (!draft.value.currentName) {
    message.value = '请先选择一个标签。'
    return
  }

  loading.value = true
  message.value = ''

  try {
    await authStore.withToken(`/admin/tags/${encodeURIComponent(draft.value.currentName)}`, {
      method: 'PATCH',
      body: {
        workspaceId: draft.value.workspaceId,
        renamedTo: draft.value.renamedTo,
        color: draft.value.color,
        pinned: draft.value.pinned,
      },
    })
    closeDialog()
    message.value = '标签已更新。'
    await loadTags()
  } catch (error) {
    message.value = error instanceof Error ? error.message : '标签保存失败'
  } finally {
    loading.value = false
  }
}

async function deleteTag() {
  if (!draft.value.currentName) {
    return
  }

  loading.value = true
  message.value = ''

  try {
    const params = new URLSearchParams({ workspaceId: draft.value.workspaceId })
    await authStore.withToken(`/admin/tags/${encodeURIComponent(draft.value.currentName)}?${params.toString()}`, {
      method: 'DELETE',
    })
    closeDialog()
    message.value = '标签已删除，并已同步更新对应便签。'
    await loadTags()
  } catch (error) {
    message.value = error instanceof Error ? error.message : '标签删除失败'
  } finally {
    loading.value = false
  }
}

watch(
  () => `${getQueryString(route.query.query)}|${getQueryString(route.query.workspaceId)}|${getQueryString(route.query.pinned)}|${getQueryString(route.query.focus)}`,
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
        <h3>标签管理</h3>
      </div>
      <div class="toolbar">
        <select v-model="workspaceFilter" class="select">
          <option value="">全部工作区</option>
          <option v-for="workspace in workspaces" :key="workspace.id" :value="workspace.id">{{ workspace.name }}</option>
        </select>
        <input v-model="query" class="field" placeholder="搜索标签名称" @keydown.enter="applyFilters" />
        <select v-model="pinnedFilter" class="select">
          <option value="">全部常用状态</option>
          <option value="true">仅常用</option>
          <option value="false">仅普通</option>
        </select>
        <button class="btn btn-secondary" @click="applyFilters">筛选</button>
      </div>
    </header>

    <div v-if="message" class="message" :class="{ error: message.includes('失败') }">{{ message }}</div>

    <article class="panel">
      <div class="table-shell">
        <table class="table">
          <thead>
            <tr>
              <th>标签</th>
              <th>工作区</th>
              <th>颜色</th>
              <th>使用次数</th>
              <th>常用</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="tag in tags"
              :key="`${tag.workspaceId}-${tag.name}`"
              :class="{ active: activeKey === `${tag.workspaceId}::${tag.name}` || activeKey === tag.name }"
              @click="focusTag(tag)"
            >
              <td>{{ tag.name }}</td>
              <td>{{ tag.workspaceName }}</td>
              <td>{{ tag.color }}</td>
              <td>{{ tag.usageCount }}</td>
              <td>{{ tag.pinned ? '是' : '否' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

    <AdminDialog
      :open="dialogOpen"
      title="标签详情"
      size="lg"
      @close="closeDialog"
    >
      <div v-if="selectedTag" class="summary-strip">
        <article class="summary-card">
          <span>工作区</span>
          <strong>{{ selectedTag.workspaceName }}</strong>
        </article>
        <article class="summary-card">
          <span>影响便签</span>
          <strong>{{ selectedTag.impactCount }}</strong>
        </article>
        <article class="summary-card">
          <span>最近使用</span>
          <strong>{{ selectedTag.tag.lastUsedAt ? selectedTag.tag.lastUsedAt.slice(0, 10) : '暂无' }}</strong>
        </article>
      </div>

      <div class="form-grid">
        <label class="full">
          <span>标签名称</span>
          <input v-model="draft.renamedTo" class="field" placeholder="请输入新的标签名称" />
        </label>
        <label>
          <span>工作区</span>
          <select v-model="draft.workspaceId" class="select" disabled>
            <option v-for="workspace in workspaces" :key="workspace.id" :value="workspace.id">{{ workspace.name }}</option>
          </select>
        </label>
        <label>
          <span>颜色</span>
          <input v-model="draft.color" class="field" type="color" />
        </label>
      </div>

      <div class="checkbox-row">
        <label class="checkbox">
          <input v-model="draft.pinned" type="checkbox" />
          设为常用标签
        </label>
      </div>

      <section v-if="selectedTag" class="preview-grid">
        <article class="relation-panel">
          <header class="relation-head">
            <h4>工作区摘要</h4>
            <button class="btn btn-ghost mini" @click="jumpTo('/workspaces', { focus: selectedTag.workspaceId })">工作区</button>
          </header>
          <div class="pill-list">
            <span class="pill">成员 {{ selectedTag.workspaceSummary.memberCount }}</span>
            <span class="pill">便签 {{ selectedTag.workspaceSummary.noteCount }}</span>
            <span class="pill">模板 {{ selectedTag.workspaceSummary.templateCount }}</span>
            <span class="pill">标签 {{ selectedTag.workspaceSummary.tagCount }}</span>
          </div>
        </article>

        <article class="relation-panel">
          <header class="relation-head">
            <h4>关联便签预览</h4>
            <button class="btn btn-ghost mini" @click="jumpTo('/notes', { workspaceId: selectedTag.workspaceId, tag: selectedTag.tag.name })">查看全部</button>
          </header>
          <div class="relation-list">
            <div v-for="note in selectedTag.notesPreview" :key="note.id" class="relation-item">
              <div class="relation-copy">
                <strong>{{ note.title }}</strong>
                <span>{{ note.updatedAt.slice(0, 10) }} · {{ NOTE_STATUS_LABELS[note.status] }}</span>
              </div>
              <button class="btn btn-ghost mini" @click="jumpTo('/notes', { workspaceId: selectedTag.workspaceId, tag: selectedTag.tag.name, focus: note.id })">便签</button>
            </div>
          </div>
        </article>
      </section>

      <template #footer>
        <button class="btn btn-primary" :disabled="loading || !draft.currentName" @click="saveTag">保存修改</button>
        <button class="btn btn-danger" :disabled="loading || !draft.currentName" @click="deleteTag">删除标签</button>
      </template>
    </AdminDialog>
  </section>
</template>

<style scoped>
.summary-strip,
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
  min-width: 140px;
  padding: 1rem 1.05rem;
  display: grid;
  gap: 0.22rem;
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

.preview-grid {
  margin-top: 1rem;
  display: grid;
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
  gap: 0.85rem;
}

.relation-copy {
  display: grid;
  gap: 0.16rem;
}

.relation-copy span {
  color: var(--text-muted);
}

.mini {
  min-height: 36px;
  padding-inline: 0.85rem;
}

@media (max-width: 900px) {
  .relation-item {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>

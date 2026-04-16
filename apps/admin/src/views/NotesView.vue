<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NOTE_STATUS_LABELS, PRIORITY_LABELS } from '@shared'
import type { AdminNoteDetail, AdminNoteListItem, AdminWorkspaceListItem, Note } from '@shared'

import AdminDialog from '@/components/AdminDialog.vue'
import { checklistItemsToText, cloneNote, createEmptyNote, joinTags, prepareNoteForSave } from '@/lib/forms'
import { getQueryString, mergeQuery } from '@/lib/query'
import { useAdminAuthStore } from '@/stores/auth'

const authStore = useAdminAuthStore()
const route = useRoute()
const router = useRouter()

const workspaces = ref<AdminWorkspaceListItem[]>([])
const notes = ref<AdminNoteListItem[]>([])
const selectedNoteDetail = ref<AdminNoteDetail | null>(null)
const workspaceFilter = ref('')
const draftWorkspaceId = ref('')
const query = ref('')
const tagFilter = ref('')
const statusFilter = ref<'todo' | 'doing' | 'done' | ''>('')
const priorityFilter = ref<'high' | 'normal' | 'low' | ''>('')
const stateFilter = ref<'active' | 'archived' | 'trash' | 'overdue' | ''>('')
const dialogMode = ref<'create' | 'edit' | null>(null)
const loading = ref(false)
const message = ref('')
const tagsText = ref('')
const checklistText = ref('')
const draft = ref<Note>(createEmptyNote())

const dialogOpen = computed(() => dialogMode.value !== null)
const isEditing = computed(() => dialogMode.value === 'edit')
const activeNoteId = computed(() => selectedNoteDetail.value?.note.id || getQueryString(route.query.focus))
const summaryWorkspaceText = computed(() => selectedNoteDetail.value?.workspaceSummary.name || selectedNoteDetail.value?.workspaceName || '')

function formatStatus(note: Pick<AdminNoteListItem, 'status' | 'deletedAt' | 'archivedAt'>) {
  if (note.deletedAt) {
    return '回收站'
  }

  if (note.archivedAt) {
    return '已归档'
  }

  return NOTE_STATUS_LABELS[note.status]
}

function resetDraft() {
  draft.value = createEmptyNote()
  draftWorkspaceId.value = workspaceFilter.value || workspaces.value[0]?.id || ''
  tagsText.value = ''
  checklistText.value = ''
}

function closeDialog() {
  selectedNoteDetail.value = null
  dialogMode.value = null
  resetDraft()

  if (getQueryString(route.query.focus)) {
    router.replace({
      query: mergeQuery(route.query, { focus: null }),
    })
  }
}

function openCreateDialog() {
  selectedNoteDetail.value = null
  resetDraft()
  dialogMode.value = 'create'
}

function toDateInput(value: string | null) {
  return value ? value.slice(0, 16) : ''
}

function fromDateInput(value: string) {
  return value ? new Date(value).toISOString() : null
}

async function loadWorkspaces() {
  workspaces.value = await authStore.withToken<AdminWorkspaceListItem[]>('/admin/workspaces')
  if (!draftWorkspaceId.value) {
    draftWorkspaceId.value = workspaces.value[0]?.id || ''
  }
}

async function loadNotes() {
  const params = new URLSearchParams()
  if (query.value.trim()) {
    params.set('query', query.value.trim())
  }
  if (workspaceFilter.value) {
    params.set('workspaceId', workspaceFilter.value)
  }
  if (tagFilter.value.trim()) {
    params.set('tag', tagFilter.value.trim())
  }
  if (statusFilter.value) {
    params.set('status', statusFilter.value)
  }
  if (priorityFilter.value) {
    params.set('priority', priorityFilter.value)
  }
  if (stateFilter.value) {
    params.set('state', stateFilter.value)
  }

  notes.value = await authStore.withToken<AdminNoteListItem[]>(`/admin/notes${params.toString() ? `?${params.toString()}` : ''}`)
}

async function loadNoteDetail(id: string) {
  const detail = await authStore.withToken<AdminNoteDetail>(`/admin/notes/${id}`)
  selectedNoteDetail.value = detail
  draftWorkspaceId.value = detail.workspaceId
  draft.value = cloneNote(detail.note)
  tagsText.value = joinTags(detail.note.tags)
  checklistText.value = checklistItemsToText(detail.note.checklist)
  dialogMode.value = 'edit'
}

function hasFilterSignal() {
  return Boolean(
    query.value.trim() ||
    workspaceFilter.value ||
    tagFilter.value.trim() ||
    statusFilter.value ||
    priorityFilter.value ||
    stateFilter.value,
  )
}

async function syncRouteState() {
  query.value = getQueryString(route.query.query)
  workspaceFilter.value = getQueryString(route.query.workspaceId)
  tagFilter.value = getQueryString(route.query.tag)
  statusFilter.value = (getQueryString(route.query.status) as 'todo' | 'doing' | 'done' | '') || ''
  priorityFilter.value = (getQueryString(route.query.priority) as 'high' | 'normal' | 'low' | '') || ''
  stateFilter.value = (getQueryString(route.query.state) as 'active' | 'archived' | 'trash' | 'overdue' | '') || ''

  await loadWorkspaces()
  await loadNotes()

  const focusId = getQueryString(route.query.focus)
  if (focusId) {
    if (selectedNoteDetail.value?.note.id !== focusId || dialogMode.value !== 'edit') {
      try {
        await loadNoteDetail(focusId)
      } catch (error) {
        message.value = error instanceof Error ? error.message : '便签详情加载失败'
      }
    }
    return
  }

  if (hasFilterSignal() && notes.value.length === 1) {
    await loadNoteDetail(notes.value[0].id)
    return
  }

  if (dialogMode.value === 'edit') {
    selectedNoteDetail.value = null
    dialogMode.value = null
    resetDraft()
  }
}

function applyFilters() {
  router.replace({
    query: mergeQuery(route.query, {
      query: query.value.trim() || null,
      workspaceId: workspaceFilter.value || null,
      tag: tagFilter.value.trim() || null,
      status: statusFilter.value || null,
      priority: priorityFilter.value || null,
      state: stateFilter.value || null,
      focus: null,
    }),
  })
}

function focusNote(noteId: string) {
  router.replace({
    query: mergeQuery(route.query, {
      query: query.value.trim() || null,
      workspaceId: workspaceFilter.value || null,
      tag: tagFilter.value.trim() || null,
      status: statusFilter.value || null,
      priority: priorityFilter.value || null,
      state: stateFilter.value || null,
      focus: noteId,
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

async function saveNote() {
  loading.value = true
  message.value = ''

  try {
    const payload = prepareNoteForSave(draft.value, {
      tagsText: tagsText.value,
      checklistText: checklistText.value,
    })

    if (selectedNoteDetail.value) {
      await authStore.withToken(`/admin/notes/${selectedNoteDetail.value.note.id}`, {
        method: 'PATCH',
        body: { note: payload },
      })
      message.value = '便签已更新。'
    } else {
      await authStore.withToken<AdminNoteDetail>('/admin/notes', {
        method: 'POST',
        body: {
          workspaceId: draftWorkspaceId.value,
          note: payload,
        },
      })
      message.value = '便签已创建。'
    }

    closeDialog()
    await loadNotes()
  } catch (error) {
    message.value = error instanceof Error ? error.message : '便签保存失败'
  } finally {
    loading.value = false
  }
}

async function patchNoteStatus(patch: Partial<Note>, successMessage: string) {
  loading.value = true
  message.value = ''

  try {
    const now = new Date().toISOString()
    const payload = prepareNoteForSave(
      {
        ...draft.value,
        ...patch,
        updatedAt: now,
      },
      {
        tagsText: tagsText.value,
        checklistText: checklistText.value,
      },
    )

    await authStore.withToken(`/admin/notes/${draft.value.id}`, {
      method: 'PATCH',
      body: { note: payload },
    })
    closeDialog()
    message.value = successMessage
    await loadNotes()
  } catch (error) {
    message.value = error instanceof Error ? error.message : '便签状态更新失败'
  } finally {
    loading.value = false
  }
}

async function deleteNote() {
  if (!selectedNoteDetail.value) {
    return
  }

  loading.value = true
  message.value = ''

  try {
    await authStore.withToken(`/admin/notes/${selectedNoteDetail.value.note.id}`, {
      method: 'DELETE',
    })
    closeDialog()
    message.value = '便签已永久删除。'
    await loadNotes()
  } catch (error) {
    message.value = error instanceof Error ? error.message : '便签删除失败'
  } finally {
    loading.value = false
  }
}

watch(
  () => [
    getQueryString(route.query.query),
    getQueryString(route.query.workspaceId),
    getQueryString(route.query.tag),
    getQueryString(route.query.status),
    getQueryString(route.query.priority),
    getQueryString(route.query.state),
    getQueryString(route.query.focus),
  ].join('|'),
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
        <h3>便签管理</h3>
      </div>
      <div class="toolbar">
        <select v-model="workspaceFilter" class="select">
          <option value="">全部工作区</option>
          <option v-for="workspace in workspaces" :key="workspace.id" :value="workspace.id">{{ workspace.name }}</option>
        </select>
        <input v-model="query" class="field" placeholder="搜索标题、内容或标签" @keydown.enter="applyFilters" />
        <input v-model="tagFilter" class="field tag-filter" placeholder="标签" @keydown.enter="applyFilters" />
        <select v-model="statusFilter" class="select">
          <option value="">全部状态</option>
          <option value="todo">{{ NOTE_STATUS_LABELS.todo }}</option>
          <option value="doing">{{ NOTE_STATUS_LABELS.doing }}</option>
          <option value="done">{{ NOTE_STATUS_LABELS.done }}</option>
        </select>
        <select v-model="priorityFilter" class="select">
          <option value="">全部优先级</option>
          <option value="high">{{ PRIORITY_LABELS.high }}</option>
          <option value="normal">{{ PRIORITY_LABELS.normal }}</option>
          <option value="low">{{ PRIORITY_LABELS.low }}</option>
        </select>
        <select v-model="stateFilter" class="select">
          <option value="">全部生命周期</option>
          <option value="active">有效</option>
          <option value="archived">归档</option>
          <option value="trash">回收站</option>
          <option value="overdue">已逾期</option>
        </select>
        <button class="btn btn-secondary" @click="applyFilters">筛选</button>
        <button class="btn btn-primary" @click="openCreateDialog">新增便签</button>
      </div>
    </header>

    <div v-if="message" class="message" :class="{ error: message.includes('失败') }">{{ message }}</div>

    <article class="panel">
      <div class="table-shell">
        <table class="table">
          <thead>
            <tr>
              <th>标题</th>
              <th>工作区</th>
              <th>状态</th>
              <th>优先级</th>
              <th>标签</th>
              <th>更新</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="note in notes"
              :key="note.id"
              :class="{ active: activeNoteId === note.id }"
              @click="focusNote(note.id)"
            >
              <td>{{ note.title }}</td>
              <td>{{ note.workspaceName }}</td>
              <td>{{ formatStatus(note) }}</td>
              <td>{{ PRIORITY_LABELS[note.priority] }}</td>
              <td>{{ note.tags.join(' / ') || '无标签' }}</td>
              <td>{{ note.updatedAt.slice(0, 16).replace('T', ' ') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

    <AdminDialog
      :open="dialogOpen"
      :title="isEditing ? '便签详情' : '新增便签'"
      size="xl"
      @close="closeDialog"
    >
      <div v-if="selectedNoteDetail" class="summary-strip">
        <article class="summary-card wide">
          <span>所属工作区</span>
          <strong>{{ summaryWorkspaceText }}</strong>
        </article>
        <article class="summary-card">
          <span>状态</span>
          <strong>{{ formatStatus(draft) }}</strong>
        </article>
        <article class="summary-card">
          <span>优先级</span>
          <strong>{{ PRIORITY_LABELS[draft.priority] }}</strong>
        </article>
        <article class="summary-card">
          <span>标签</span>
          <strong>{{ draft.tags.length }}</strong>
        </article>
      </div>

      <div class="dialog-grid">
        <div class="form-grid">
          <label class="full">
            <span>所属工作区</span>
            <select v-model="draftWorkspaceId" class="select" :disabled="isEditing">
              <option v-for="workspace in workspaces" :key="workspace.id" :value="workspace.id">{{ workspace.name }}</option>
            </select>
          </label>
          <label class="full">
            <span>标题</span>
            <input v-model="draft.title" class="field" placeholder="请输入便签标题" />
          </label>
          <label>
            <span>类型</span>
            <select v-model="draft.type" class="select">
              <option value="note">普通便签</option>
              <option value="checklist">清单便签</option>
            </select>
          </label>
          <label>
            <span>优先级</span>
            <select v-model="draft.priority" class="select">
              <option value="high">{{ PRIORITY_LABELS.high }}</option>
              <option value="normal">{{ PRIORITY_LABELS.normal }}</option>
              <option value="low">{{ PRIORITY_LABELS.low }}</option>
            </select>
          </label>
          <label>
            <span>状态</span>
            <select v-model="draft.status" class="select">
              <option value="todo">{{ NOTE_STATUS_LABELS.todo }}</option>
              <option value="doing">{{ NOTE_STATUS_LABELS.doing }}</option>
              <option value="done">{{ NOTE_STATUS_LABELS.done }}</option>
            </select>
          </label>
          <label>
            <span>标签</span>
            <input v-model="tagsText" class="field" placeholder="多个标签用逗号分隔" />
          </label>
          <label>
            <span>截止时间</span>
            <input :value="toDateInput(draft.dueDate)" class="field" type="datetime-local" @input="draft.dueDate = fromDateInput(($event.target as HTMLInputElement).value)" />
          </label>
          <label>
            <span>提醒时间</span>
            <input :value="toDateInput(draft.remindAt)" class="field" type="datetime-local" @input="draft.remindAt = fromDateInput(($event.target as HTMLInputElement).value)" />
          </label>
          <label v-if="draft.type === 'note'" class="full">
            <span>内容</span>
            <textarea v-model="draft.content" class="textarea" placeholder="请输入便签内容" />
          </label>
          <label v-else class="full">
            <span>清单内容</span>
            <textarea v-model="checklistText" class="textarea" placeholder="每行一个清单项，已完成可写成 [x] 任务内容" />
          </label>
        </div>

        <aside class="side-panel">
          <div class="checkbox-row">
            <label class="checkbox">
              <input v-model="draft.pinned" type="checkbox" />
              置顶
            </label>
            <label class="checkbox">
              <input v-model="draft.completed" type="checkbox" />
              完成
            </label>
          </div>

          <div v-if="selectedNoteDetail" class="relation-panel">
            <h4>工作区摘要</h4>
            <div class="summary-list">
              <span class="pill">成员 {{ selectedNoteDetail.workspaceSummary.memberCount }}</span>
              <span class="pill">便签 {{ selectedNoteDetail.workspaceSummary.noteCount }}</span>
              <span class="pill">模板 {{ selectedNoteDetail.workspaceSummary.templateCount }}</span>
              <span class="pill">标签 {{ selectedNoteDetail.workspaceSummary.tagCount }}</span>
              <span class="pill">风险 {{ selectedNoteDetail.workspaceSummary.risk === 'high' ? '高' : '正常' }}</span>
            </div>
            <div class="relation-actions">
              <button class="btn btn-ghost mini" @click="jumpTo('/workspaces', { focus: draftWorkspaceId })">工作区</button>
              <button class="btn btn-ghost mini" @click="jumpTo('/templates', { workspaceId: draftWorkspaceId })">模板</button>
              <button class="btn btn-ghost mini" @click="jumpTo('/sync', { workspaceId: draftWorkspaceId, focus: draft.id })">同步监控</button>
            </div>
          </div>

          <div v-if="selectedNoteDetail?.relatedNotes.length" class="relation-panel">
            <div class="panel-head">
              <h4>关联便签</h4>
              <button class="btn btn-ghost mini" @click="jumpTo('/notes', { workspaceId: draftWorkspaceId })">查看全部</button>
            </div>
            <div class="relation-list">
              <div v-for="note in selectedNoteDetail.relatedNotes" :key="note.id" class="relation-item">
                <div class="relation-copy">
                  <strong>{{ note.title }}</strong>
                  <span>{{ PRIORITY_LABELS[note.priority] }} · {{ NOTE_STATUS_LABELS[note.status] }}</span>
                </div>
                <button class="btn btn-ghost mini" @click="jumpTo('/notes', { workspaceId: draftWorkspaceId, focus: note.id })">查看</button>
              </div>
            </div>
          </div>

          <div v-if="selectedNoteDetail?.relatedTags.length" class="relation-panel">
            <div class="panel-head">
              <h4>关联标签</h4>
              <button class="btn btn-ghost mini" @click="jumpTo('/tags', { workspaceId: draftWorkspaceId })">查看全部</button>
            </div>
            <div class="tag-links">
              <button
                v-for="tag in selectedNoteDetail.relatedTags"
                :key="tag.name"
                class="tag-link"
                type="button"
                @click="jumpTo('/tags', { workspaceId: draftWorkspaceId, focus: tag.name })"
              >
                <span class="tag-dot" :style="{ background: tag.color }" />
                {{ tag.name }}
              </button>
            </div>
          </div>
        </aside>
      </div>

      <template #footer>
        <button class="btn btn-primary" :disabled="loading" @click="saveNote">
          {{ loading ? '保存中...' : isEditing ? '保存修改' : '创建便签' }}
        </button>
        <button v-if="isEditing && !draft.archivedAt" class="btn btn-secondary" :disabled="loading" @click="patchNoteStatus({ archivedAt: new Date().toISOString(), deletedAt: null }, '便签已归档。')">归档</button>
        <button v-if="isEditing && draft.archivedAt" class="btn btn-secondary" :disabled="loading" @click="patchNoteStatus({ archivedAt: null }, '已取消归档。')">取消归档</button>
        <button v-if="isEditing && !draft.deletedAt" class="btn btn-secondary" :disabled="loading" @click="patchNoteStatus({ deletedAt: new Date().toISOString() }, '已移入回收站。')">移入回收站</button>
        <button v-if="isEditing && draft.deletedAt" class="btn btn-secondary" :disabled="loading" @click="patchNoteStatus({ deletedAt: null }, '已从回收站恢复。')">恢复</button>
        <button v-if="isEditing" class="btn btn-danger" :disabled="loading" @click="deleteNote">永久删除</button>
      </template>
    </AdminDialog>
  </section>
</template>

<style scoped>
.summary-strip,
.relation-actions,
.summary-list {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}

.summary-strip {
  margin-bottom: 1rem;
}

.dialog-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 1rem;
}

.summary-card,
.side-panel,
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

.summary-card.wide {
  flex: 1 1 240px;
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

.side-panel {
  padding: 1rem;
  display: grid;
  align-content: start;
  gap: 1rem;
}

.relation-panel {
  padding: 1rem;
  display: grid;
  gap: 0.85rem;
}

.relation-panel h4 {
  margin: 0;
  color: var(--heading);
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.8rem;
  flex-wrap: wrap;
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

.tag-links {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.tag-link,
.mini {
  min-height: 36px;
  padding: 0 0.85rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.18);
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.tag-dot {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 999px;
  flex-shrink: 0;
}

.tag-filter {
  max-width: 180px;
}

@media (max-width: 980px) {
  .dialog-grid {
    grid-template-columns: 1fr;
  }

  .relation-item {
    flex-direction: column;
    align-items: stretch;
  }

  .tag-filter {
    max-width: none;
  }
}
</style>

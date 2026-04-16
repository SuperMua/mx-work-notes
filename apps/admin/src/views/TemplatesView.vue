<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PRIORITY_LABELS } from '@shared'
import type { AdminTemplateDetail, AdminTemplateListItem, AdminWorkspaceListItem, Template } from '@shared'

import AdminDialog from '@/components/AdminDialog.vue'
import { checklistItemsToText, cloneTemplate, createEmptyTemplate, joinTags, prepareTemplateForSave } from '@/lib/forms'
import { getQueryString, mergeQuery } from '@/lib/query'
import { useAdminAuthStore } from '@/stores/auth'

const authStore = useAdminAuthStore()
const route = useRoute()
const router = useRouter()

const workspaces = ref<AdminWorkspaceListItem[]>([])
const templates = ref<AdminTemplateListItem[]>([])
const selectedTemplate = ref<AdminTemplateDetail | null>(null)
const workspaceFilter = ref('')
const draftWorkspaceId = ref('')
const query = ref('')
const dialogMode = ref<'create' | 'edit' | null>(null)
const loading = ref(false)
const message = ref('')
const tagsText = ref('')
const checklistText = ref('')
const draft = ref<Template>(createEmptyTemplate())

const dialogOpen = computed(() => dialogMode.value !== null)
const isEditing = computed(() => dialogMode.value === 'edit')
const activeTemplateId = computed(() => selectedTemplate.value?.template.id || getQueryString(route.query.focus))

function resetDraft() {
  draft.value = createEmptyTemplate()
  draftWorkspaceId.value = workspaceFilter.value || workspaces.value[0]?.id || ''
  tagsText.value = ''
  checklistText.value = ''
}

function closeDialog() {
  selectedTemplate.value = null
  dialogMode.value = null
  resetDraft()

  if (getQueryString(route.query.focus)) {
    router.replace({
      query: mergeQuery(route.query, { focus: null }),
    })
  }
}

function openCreateDialog() {
  selectedTemplate.value = null
  resetDraft()
  dialogMode.value = 'create'
}

async function loadWorkspaces() {
  workspaces.value = await authStore.withToken<AdminWorkspaceListItem[]>('/admin/workspaces')
  if (!draftWorkspaceId.value) {
    draftWorkspaceId.value = workspaces.value[0]?.id || ''
  }
}

async function loadTemplates() {
  const params = new URLSearchParams()
  if (query.value.trim()) {
    params.set('query', query.value.trim())
  }
  if (workspaceFilter.value) {
    params.set('workspaceId', workspaceFilter.value)
  }

  templates.value = await authStore.withToken<AdminTemplateListItem[]>(`/admin/templates${params.toString() ? `?${params.toString()}` : ''}`)
}

async function loadTemplateDetail(id: string) {
  const detail = await authStore.withToken<AdminTemplateDetail>(`/admin/templates/${id}`)
  selectedTemplate.value = detail
  draftWorkspaceId.value = detail.workspaceId
  draft.value = cloneTemplate(detail.template)
  tagsText.value = joinTags(detail.template.note.tags)
  checklistText.value = checklistItemsToText(detail.template.note.checklist)
  dialogMode.value = 'edit'
}

function hasFilterSignal() {
  return Boolean(query.value.trim() || workspaceFilter.value)
}

async function syncRouteState() {
  query.value = getQueryString(route.query.query)
  workspaceFilter.value = getQueryString(route.query.workspaceId)

  await loadWorkspaces()
  await loadTemplates()

  const focusId = getQueryString(route.query.focus)
  if (focusId) {
    if (selectedTemplate.value?.template.id !== focusId || dialogMode.value !== 'edit') {
      try {
        await loadTemplateDetail(focusId)
      } catch (error) {
        message.value = error instanceof Error ? error.message : '模板详情加载失败'
      }
    }
    return
  }

  if (hasFilterSignal() && templates.value.length === 1) {
    await loadTemplateDetail(templates.value[0].id)
    return
  }

  if (dialogMode.value === 'edit') {
    selectedTemplate.value = null
    dialogMode.value = null
    resetDraft()
  }
}

function applyFilters() {
  router.replace({
    query: mergeQuery(route.query, {
      query: query.value.trim() || null,
      workspaceId: workspaceFilter.value || null,
      focus: null,
    }),
  })
}

function focusTemplate(templateId: string) {
  router.replace({
    query: mergeQuery(route.query, {
      query: query.value.trim() || null,
      workspaceId: workspaceFilter.value || null,
      focus: templateId,
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

async function saveTemplate() {
  loading.value = true
  message.value = ''

  try {
    const payload = prepareTemplateForSave(draft.value, {
      tagsText: tagsText.value,
      checklistText: checklistText.value,
    })

    if (selectedTemplate.value) {
      await authStore.withToken(`/admin/templates/${selectedTemplate.value.template.id}`, {
        method: 'PATCH',
        body: { template: payload },
      })
      message.value = '模板已更新。'
    } else {
      await authStore.withToken<AdminTemplateDetail>('/admin/templates', {
        method: 'POST',
        body: {
          workspaceId: draftWorkspaceId.value,
          template: payload,
        },
      })
      message.value = '模板已创建。'
    }

    closeDialog()
    await loadTemplates()
  } catch (error) {
    message.value = error instanceof Error ? error.message : '模板保存失败'
  } finally {
    loading.value = false
  }
}

async function deleteTemplate() {
  if (!selectedTemplate.value) {
    return
  }

  loading.value = true
  message.value = ''

  try {
    await authStore.withToken(`/admin/templates/${selectedTemplate.value.template.id}`, {
      method: 'DELETE',
    })
    closeDialog()
    message.value = '模板已删除。'
    await loadTemplates()
  } catch (error) {
    message.value = error instanceof Error ? error.message : '模板删除失败'
  } finally {
    loading.value = false
  }
}

watch(
  () => `${getQueryString(route.query.query)}|${getQueryString(route.query.workspaceId)}|${getQueryString(route.query.focus)}`,
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
        <h3>模板管理</h3>
      </div>
      <div class="toolbar">
        <select v-model="workspaceFilter" class="select">
          <option value="">全部工作区</option>
          <option v-for="workspace in workspaces" :key="workspace.id" :value="workspace.id">{{ workspace.name }}</option>
        </select>
        <input v-model="query" class="field" placeholder="搜索模板名称或描述" @keydown.enter="applyFilters" />
        <button class="btn btn-secondary" @click="applyFilters">筛选</button>
        <button class="btn btn-primary" @click="openCreateDialog">新增模板</button>
      </div>
    </header>

    <div v-if="message" class="message" :class="{ error: message.includes('失败') }">{{ message }}</div>

    <article class="panel">
      <div class="table-shell">
        <table class="table">
          <thead>
            <tr>
              <th>模板名</th>
              <th>键名</th>
              <th>工作区</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="template in templates"
              :key="template.id"
              :class="{ active: activeTemplateId === template.id }"
              @click="focusTemplate(template.id)"
            >
              <td>{{ template.name }}</td>
              <td>{{ template.key }}</td>
              <td>{{ template.workspaceName }}</td>
              <td>{{ template.description || '未填写' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

    <AdminDialog
      :open="dialogOpen"
      :title="isEditing ? '模板详情' : '新增模板'"
      size="xl"
      @close="closeDialog"
    >
      <div v-if="selectedTemplate" class="summary-strip">
        <article class="summary-card wide">
          <span>所属工作区</span>
          <strong>{{ selectedTemplate.workspaceName }}</strong>
        </article>
        <article class="summary-card">
          <span>键名</span>
          <strong>{{ draft.key }}</strong>
        </article>
        <article class="summary-card">
          <span>默认优先级</span>
          <strong>{{ PRIORITY_LABELS[draft.note.priority] }}</strong>
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
          <label>
            <span>模板键名</span>
            <input v-model="draft.key" class="field" placeholder="例如 meeting / study" />
          </label>
          <label>
            <span>图标名</span>
            <input v-model="draft.icon" class="field" placeholder="例如 NotebookPen" />
          </label>
          <label class="full">
            <span>模板名称</span>
            <input v-model="draft.name" class="field" placeholder="请输入模板名称" />
          </label>
          <label class="full">
            <span>模板描述</span>
            <textarea v-model="draft.description" class="textarea" placeholder="请输入模板描述" />
          </label>
          <label class="full">
            <span>便签标题</span>
            <input v-model="draft.note.title" class="field" placeholder="请输入模板标题" />
          </label>
          <label>
            <span>便签类型</span>
            <select v-model="draft.note.type" class="select">
              <option value="note">普通便签</option>
              <option value="checklist">清单便签</option>
            </select>
          </label>
          <label>
            <span>默认优先级</span>
            <select v-model="draft.note.priority" class="select">
              <option value="high">{{ PRIORITY_LABELS.high }}</option>
              <option value="normal">{{ PRIORITY_LABELS.normal }}</option>
              <option value="low">{{ PRIORITY_LABELS.low }}</option>
            </select>
          </label>
          <label class="full">
            <span>标签</span>
            <input v-model="tagsText" class="field" placeholder="多个标签用逗号分隔" />
          </label>
          <label v-if="draft.note.type === 'note'" class="full">
            <span>模板内容</span>
            <textarea v-model="draft.note.content" class="textarea" placeholder="请输入模板内容" />
          </label>
          <label v-else class="full">
            <span>清单内容</span>
            <textarea v-model="checklistText" class="textarea" placeholder="每行一个清单项，已完成可写成 [x] 任务内容" />
          </label>
        </div>

        <aside class="side-panel">
          <div v-if="selectedTemplate" class="relation-panel">
            <h4>工作区摘要</h4>
            <div class="summary-list">
              <span class="pill">成员 {{ selectedTemplate.workspaceSummary.memberCount }}</span>
              <span class="pill">便签 {{ selectedTemplate.workspaceSummary.noteCount }}</span>
              <span class="pill">模板 {{ selectedTemplate.workspaceSummary.templateCount }}</span>
              <span class="pill">标签 {{ selectedTemplate.workspaceSummary.tagCount }}</span>
            </div>
            <div class="relation-actions">
              <button class="btn btn-ghost mini" @click="jumpTo('/workspaces', { focus: draftWorkspaceId })">工作区</button>
              <button class="btn btn-ghost mini" @click="jumpTo('/notes', { workspaceId: draftWorkspaceId })">便签</button>
            </div>
          </div>

          <div v-if="selectedTemplate?.relatedTemplates.length" class="relation-panel">
            <div class="panel-head">
              <h4>同工作区模板</h4>
              <button class="btn btn-ghost mini" @click="jumpTo('/templates', { workspaceId: draftWorkspaceId })">查看全部</button>
            </div>
            <div class="relation-list">
              <div v-for="template in selectedTemplate.relatedTemplates" :key="template.id" class="relation-item">
                <div class="relation-copy">
                  <strong>{{ template.name }}</strong>
                  <span>{{ template.key }} · {{ template.updatedAt.slice(0, 10) }}</span>
                </div>
                <button class="btn btn-ghost mini" @click="jumpTo('/templates', { workspaceId: draftWorkspaceId, focus: template.id })">查看</button>
              </div>
            </div>
          </div>

          <div v-if="selectedTemplate?.relatedTags.length" class="relation-panel">
            <div class="panel-head">
              <h4>关联标签</h4>
              <button class="btn btn-ghost mini" @click="jumpTo('/tags', { workspaceId: draftWorkspaceId })">查看全部</button>
            </div>
            <div class="tag-links">
              <button
                v-for="tag in selectedTemplate.relatedTags"
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
        <button class="btn btn-primary" :disabled="loading" @click="saveTemplate">
          {{ loading ? '保存中...' : isEditing ? '保存修改' : '创建模板' }}
        </button>
        <button v-if="isEditing" class="btn btn-danger" :disabled="loading" @click="deleteTemplate">删除模板</button>
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

@media (max-width: 980px) {
  .dialog-grid {
    grid-template-columns: 1fr;
  }

  .relation-item {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>

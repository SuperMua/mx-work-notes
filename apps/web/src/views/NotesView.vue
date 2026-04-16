<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Download, Keyboard, Plus, Search, Upload, WandSparkles } from 'lucide-vue-next'

import BatchActionBar from '@/components/BatchActionBar.vue'
import NoteDetailPanel from '@/components/NoteDetailPanel.vue'
import NoteListRow from '@/components/NoteListRow.vue'
import DataStrip from '@/components/ui/DataStrip.vue'
import { useWorkspaceStore } from '@/stores/workspace'

const store = useWorkspaceStore()
const searchRef = ref<HTMLInputElement | null>(null)
const selectedTemplate = ref('')
const activeNoteId = ref<string | null>(null)
const mobileDetailOpen = ref(false)
const isMobile = ref(false)
let mediaQuery: MediaQueryList | null = null

const activeNote = computed(() => store.visibleNotes.find((note) => note.id === activeNoteId.value) || null)
const orderedIds = computed(() => store.visibleNotes.map((note) => note.id))
const summaryItems = computed(() => [
  { label: '可处理', value: store.stats.total },
  { label: '已完成', value: store.stats.completed },
  { label: '已逾期', value: store.stats.overdue },
  { label: '今日到期', value: store.stats.dueToday },
])

const viewTabs = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '未完成' },
  { value: 'completed', label: '已完成' },
  { value: 'important', label: '重要' },
  { value: 'today', label: '今天' },
  { value: 'week', label: '本周' },
  { value: 'overdue', label: '已逾期' },
  { value: 'archived', label: '已归档' },
  { value: 'trash', label: '回收站' },
] as const

const currentSelectionLabel = computed(() => (activeNote.value ? activeNote.value.title : '未选中'))

function focusSearch() {
  searchRef.value?.focus()
}

function onGlobalFocusSearch() {
  focusSearch()
}

function syncViewport() {
  if (typeof window === 'undefined') {
    return
  }

  isMobile.value = window.matchMedia('(max-width: 980px)').matches
  if (!isMobile.value) {
    mobileDetailOpen.value = false
  }
}

function selectDefaultVisibleNote() {
  if (!store.visibleNotes.length) {
    activeNoteId.value = null
    mobileDetailOpen.value = false
    return
  }

  if (!activeNoteId.value || !store.visibleNotes.some((note) => note.id === activeNoteId.value)) {
    activeNoteId.value = store.visibleNotes[0].id
  }
}

function activateNote(id: string) {
  activeNoteId.value = id
  if (isMobile.value) {
    mobileDetailOpen.value = true
  }
}

function closeMobileDetail() {
  mobileDetailOpen.value = false
}

function useTemplate() {
  if (selectedTemplate.value) {
    store.createFromTemplate(selectedTemplate.value)
    selectedTemplate.value = ''
  }
}

watch(
  () => store.visibleNotes.map((note) => note.id).join(','),
  () => {
    selectDefaultVisibleNote()
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('smart-notes:focus-search', onGlobalFocusSearch)
  syncViewport()
  mediaQuery = window.matchMedia('(max-width: 980px)')
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', syncViewport)
  } else {
    mediaQuery.addListener(syncViewport)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('smart-notes:focus-search', onGlobalFocusSearch)
  if (mediaQuery) {
    if (typeof mediaQuery.removeEventListener === 'function') {
      mediaQuery.removeEventListener('change', syncViewport)
    } else {
      mediaQuery.removeListener(syncViewport)
    }
  }
})
</script>

<template>
  <section class="page-stack notes-page">
    <DataStrip :items="summaryItems" />

    <section class="surface-section controls-panel">
      <div class="controls-head">
        <div class="search-box">
          <Search :size="17" />
          <input
            ref="searchRef"
            class="search-input"
            data-testid="search-input"
            :value="store.searchQuery"
            placeholder="搜索标题、内容、清单项或标签"
            @input="store.setSearchQuery(($event.target as HTMLInputElement).value)"
            @keydown.enter="store.rememberSearch()"
          />
        </div>

        <div class="actions">
          <select class="select compact" data-testid="sort-select" :value="store.settings.defaultSort" @change="store.setSortMode(($event.target as HTMLSelectElement).value as 'smart' | 'updated' | 'due' | 'title')">
            <option value="smart">智能排序</option>
            <option value="updated">最近更新</option>
            <option value="due">截止时间</option>
            <option value="title">按标题</option>
          </select>

          <div class="template-box">
            <select v-model="selectedTemplate" class="select compact" data-testid="template-select">
              <option value="">从模板创建</option>
              <option v-for="template in store.templates" :key="template.id" :value="template.id">{{ template.name }}</option>
            </select>
            <button class="btn btn-secondary" data-testid="use-template" @click="useTemplate">
              <WandSparkles :size="16" />
              使用模板
            </button>
          </div>

          <button class="btn btn-secondary" data-testid="open-command-palette" @click="store.toggleCommandPalette()">
            <Keyboard :size="16" />
            命令面板
          </button>
          <button class="btn btn-secondary" data-testid="open-import-dialog" @click="store.openImportDialog()">
            <Upload :size="16" />
            导入
          </button>
          <button class="btn btn-secondary" data-testid="export-notes" @click="store.exportCurrent()">
            <Download :size="16" />
            导出
          </button>
          <button class="btn btn-primary" data-testid="create-note" @click="store.openEditor()">
            <Plus :size="16" />
            新建便签
          </button>
        </div>
      </div>

      <div class="tabs">
        <button
          v-for="item in viewTabs"
          :key="item.value"
          class="tab"
          :class="{ active: store.settings.selectedView === item.value }"
          :data-testid="`filter-${item.value}`"
          @click="store.setSelectedView(item.value)"
        >
          {{ item.label }}
        </button>
      </div>

      <div class="tag-row">
        <button
          v-for="tag in store.tagInsights.slice(0, 12)"
          :key="tag.name"
          class="tag-filter"
          :class="{ active: store.activeTags.includes(tag.name) }"
          @click="store.toggleTag(tag.name)"
        >
          {{ tag.name }} · {{ tag.usageCount }}
        </button>
        <button v-if="store.activeTags.length" class="btn btn-ghost mini" data-testid="clear-tag-filters" @click="store.clearTags()">清空标签筛选</button>
      </div>
    </section>

    <BatchActionBar
      v-if="store.selectedNoteIds.length"
      @complete="store.batchComplete"
      @pin="store.batchPinned"
      @priority="store.batchPriority"
      @archive="store.batchArchive"
      @trash="store.batchTrash"
      @restore="store.batchRestore"
      @tags="store.batchTags"
      @clear="store.clearSelection"
    />

    <section class="workspace-layout">
      <article class="surface-sheet list-panel">
        <header class="list-head">
          <div class="list-title">
            <strong>便签列表</strong>
            <span>{{ store.visibleNotes.length }} 条</span>
          </div>
          <span class="pill current-pill">当前：{{ currentSelectionLabel }}</span>
        </header>

        <div v-if="store.visibleNotes.length" class="list-body">
          <NoteListRow
            v-for="(note, index) in store.visibleNotes"
            :key="note.id"
            :note="note"
            :index="index"
            :active="activeNoteId === note.id"
            :selected="store.selectedNoteIds.includes(note.id)"
            @activate="activateNote"
            @select="(id, i, shift) => store.toggleSelection(id, orderedIds, i, shift)"
          />
        </div>

        <div v-else class="empty-box">
          <strong>当前没有匹配的便签</strong>
        </div>
      </article>

      <NoteDetailPanel
        v-if="!isMobile"
        :note="activeNote"
        @edit="(id) => store.openEditor(store.notes.find((note) => note.id === id))"
        @complete="store.toggleNoteComplete"
        @archive="store.archiveNote"
        @unarchive="store.unarchiveNote"
        @trash="store.trashNote"
        @restore="store.restoreNote"
        @purge="store.purgeNote"
        @tag="store.toggleTag"
        @checklist="store.updateChecklistItem"
      />
    </section>

    <Teleport to="body">
      <Transition name="slide-side">
        <div v-if="isMobile && mobileDetailOpen && activeNote" class="mobile-detail-overlay">
          <div class="mobile-detail-sheet">
            <NoteDetailPanel
              :note="activeNote"
              closable
              @close="closeMobileDetail"
              @edit="(id) => store.openEditor(store.notes.find((note) => note.id === id))"
              @complete="store.toggleNoteComplete"
              @archive="store.archiveNote"
              @unarchive="store.unarchiveNote"
              @trash="store.trashNote"
              @restore="store.restoreNote"
              @purge="store.purgeNote"
              @tag="store.toggleTag"
              @checklist="store.updateChecklistItem"
            />
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped>
.notes-page,
.controls-panel {
  display: grid;
  gap: 0.95rem;
}

.controls-panel {
  padding: 1rem 1.05rem;
  border-radius: 32px;
}

.controls-head,
.actions,
.tabs,
.tag-row,
.list-head {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.controls-head,
.list-head {
  justify-content: space-between;
  flex-wrap: wrap;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-height: 54px;
  min-width: min(420px, 100%);
  padding: 0 1rem;
  border-radius: 22px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--panel-bg) 88%, transparent);
  color: var(--text-muted);
}

.search-input {
  flex: 1;
  border: 0;
  background: transparent;
  color: var(--text);
  outline: none;
}

.actions,
.tabs,
.tag-row {
  flex-wrap: wrap;
}

.compact {
  width: auto;
  min-width: 142px;
}

.template-box {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.tab,
.tag-filter {
  min-height: 2.3rem;
  padding: 0 0.92rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface-strong) 88%, transparent);
  color: var(--text-muted);
}

.tab.active,
.tag-filter.active {
  background: var(--selection);
  color: var(--text);
  border-color: var(--selection-border);
}

.workspace-layout {
  display: grid;
  grid-template-columns: 372px minmax(0, 1fr);
  gap: 1rem;
}

.list-panel {
  padding: 0.95rem;
  border-radius: 34px;
  display: grid;
  gap: 0.9rem;
  align-content: start;
}

.list-title {
  display: grid;
  gap: 0.12rem;
}

.list-title span {
  color: var(--text-muted);
}

.current-pill {
  max-width: min(100%, 260px);
}

.list-body {
  display: grid;
  gap: 0.28rem;
}

.empty-box {
  min-height: 320px;
  display: grid;
  place-items: center;
  text-align: center;
  color: var(--text-muted);
}

.mini {
  min-height: 36px;
  padding-inline: 0.9rem;
}

.mobile-detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 65;
  background: var(--mask);
  padding: 0;
}

.mobile-detail-sheet {
  height: 100%;
}

.mobile-detail-sheet :deep(.detail-panel) {
  height: 100%;
  min-height: 0;
  border-radius: 0;
  overflow: auto;
}

.slide-side-enter-active,
.slide-side-leave-active {
  transition:
    transform var(--transition-slow),
    opacity var(--transition-slow);
}

.slide-side-enter-from,
.slide-side-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

@media (max-width: 1180px) {
  .workspace-layout {
    grid-template-columns: 340px minmax(0, 1fr);
  }
}

@media (max-width: 980px) {
  .workspace-layout {
    grid-template-columns: 1fr;
  }

  .list-panel {
    border-radius: 30px;
  }
}

@media (max-width: 760px) {
  .search-box,
  .template-box,
  .compact {
    min-width: 100%;
    width: 100%;
  }

  .controls-panel {
    border-radius: 28px;
  }

  .current-pill {
    max-width: 100%;
  }
}
</style>

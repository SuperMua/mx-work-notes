<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CalendarClock, FolderKanban, NotebookTabs, Plus } from 'lucide-vue-next'
import { NOTE_STATUS_LABELS, PRIORITY_LABELS } from '@shared'
import type { Note } from '@shared'

import NoteDetailPanel from '@/components/NoteDetailPanel.vue'
import NoteListRow from '@/components/NoteListRow.vue'
import DataStrip from '@/components/ui/DataStrip.vue'
import MetricHero from '@/components/ui/MetricHero.vue'
import SurfaceSection from '@/components/ui/SurfaceSection.vue'
import { getChecklistProgress, getDueBadge, relativeTimestamp } from '@/lib/note-utils'
import { useWorkspaceStore } from '@/stores/workspace'

const router = useRouter()
const store = useWorkspaceStore()
const activeDashboardNoteId = ref('')

const focusNotes = computed(() => store.dashboardNotes.focus)
const todayNotes = computed(() => store.dashboardNotes.today)
const overdueNotes = computed(() => store.dashboardNotes.overdue)
const weekNotes = computed(() => store.dashboardNotes.week)

const dashboardPool = computed(() => {
  const unique = new Map<string, Note>()
  ;[...focusNotes.value, ...todayNotes.value, ...overdueNotes.value, ...weekNotes.value].forEach((note) => {
    unique.set(note.id, note)
  })
  return Array.from(unique.values())
})

const activeDashboardNote = computed(() =>
  dashboardPool.value.find((note) => note.id === activeDashboardNoteId.value) || null,
)

const summaryItems = computed(() => [
  { label: '待处理', value: store.stats.total },
  { label: '已完成', value: store.stats.completed },
  { label: '已逾期', value: store.stats.overdue },
  { label: '今日截止', value: store.stats.dueToday },
])

const focusDueBadge = computed(() => {
  const note = activeDashboardNote.value
  return note ? getDueBadge(note) : null
})

const focusSignals = computed(() => {
  const note = activeDashboardNote.value
  if (!note) {
    return []
  }

  const checklist = getChecklistProgress(note)

  return [
    `状态 ${NOTE_STATUS_LABELS[note.status]}`,
    `优先级 ${PRIORITY_LABELS[note.priority]}`,
    `更新 ${relativeTimestamp(note.updatedAt)}`,
    note.type === 'checklist' ? `清单 ${checklist.completed}/${checklist.total}` : `标签 ${note.tags.length || 0}`,
  ]
})

watch(
  dashboardPool,
  (notes) => {
    if (!notes.length) {
      activeDashboardNoteId.value = ''
      return
    }

    if (!notes.some((note) => note.id === activeDashboardNoteId.value)) {
      activeDashboardNoteId.value = notes[0].id
    }
  },
  { immediate: true },
)

function editNote(id: string) {
  const note = store.notes.find((item) => item.id === id)
  if (note) {
    store.openEditor(note)
  }
}

function activateNote(id: string) {
  activeDashboardNoteId.value = id
}

function selectIn(sectionIds: string[], id: string, index: number, shift: boolean) {
  activeDashboardNoteId.value = id
  store.toggleSelection(id, sectionIds, index, shift)
}

function openCreate() {
  store.openEditor()
}

function openNotes() {
  router.push('/notes')
}

function openBoard() {
  router.push('/board')
}

function openCalendar() {
  router.push('/calendar')
}
</script>

<template>
  <section class="page-stack dashboard-shell">
    <MetricHero class="workbench-hero">
      <template #metrics>
        <DataStrip :items="summaryItems" />
      </template>

      <div class="command-strip">
        <article class="focus-pocket">
          <div class="focus-head">
            <span class="focus-kicker">当前工作面</span>
            <span class="focus-state">{{ activeDashboardNote ? '已锁定焦点' : '等待开始' }}</span>
          </div>

          <div class="focus-line">
            <h3>{{ activeDashboardNote?.title || '当前没有待处理便签' }}</h3>
            <span v-if="focusDueBadge" class="focus-due" :data-tone="focusDueBadge.tone">{{ focusDueBadge.label }}</span>
          </div>

          <div class="focus-signals">
            <span v-for="signal in focusSignals" :key="signal" class="focus-pill">{{ signal }}</span>
            <span v-if="!focusSignals.length" class="focus-pill">直接新建一条便签开始处理</span>
          </div>
        </article>

        <div class="action-rack">
          <button type="button" class="action-chip action-chip-primary" @click="openCreate">
            <Plus :size="18" />
            <span>新建</span>
          </button>

          <button type="button" class="action-chip" @click="openNotes">
            <NotebookTabs :size="18" />
            <span>便签</span>
          </button>

          <button type="button" class="action-chip" @click="openBoard">
            <FolderKanban :size="18" />
            <span>看板</span>
          </button>

          <button type="button" class="action-chip" @click="openCalendar">
            <CalendarClock :size="18" />
            <span>日历</span>
          </button>
        </div>
      </div>
    </MetricHero>

    <section class="dashboard-stage">
      <div class="scan-rail">
        <SurfaceSection title="重点任务">
          <template #actions>
            <span class="section-pill">{{ focusNotes.length }} 条</span>
          </template>

          <div v-if="focusNotes.length" class="queue-list">
            <NoteListRow
              v-for="(note, index) in focusNotes"
              :key="note.id"
              :note="note"
              :active="activeDashboardNoteId === note.id"
              :selected="store.selectedNoteIds.includes(note.id)"
              :index="index"
              @activate="activateNote"
              @select="(id, i, shift) => selectIn(focusNotes.map((item) => item.id), id, i, shift)"
            />
          </div>
          <div v-else class="empty-shell">暂无高优先级任务</div>
        </SurfaceSection>

        <SurfaceSection title="今日截止">
          <template #actions>
            <span class="section-pill">{{ todayNotes.length }} 条</span>
          </template>

          <div v-if="todayNotes.length" class="queue-list">
            <NoteListRow
              v-for="(note, index) in todayNotes"
              :key="note.id"
              :note="note"
              :active="activeDashboardNoteId === note.id"
              :selected="store.selectedNoteIds.includes(note.id)"
              :index="index"
              @activate="activateNote"
              @select="(id, i, shift) => selectIn(todayNotes.map((item) => item.id), id, i, shift)"
            />
          </div>
          <div v-else class="empty-shell">暂无今日截止项</div>
        </SurfaceSection>

        <SurfaceSection title="逾期">
          <template #actions>
            <span class="section-pill danger">{{ overdueNotes.length }} 条</span>
          </template>

          <div v-if="overdueNotes.length" class="queue-list">
            <NoteListRow
              v-for="(note, index) in overdueNotes"
              :key="note.id"
              :note="note"
              :active="activeDashboardNoteId === note.id"
              :selected="store.selectedNoteIds.includes(note.id)"
              :index="index"
              @activate="activateNote"
              @select="(id, i, shift) => selectIn(overdueNotes.map((item) => item.id), id, i, shift)"
            />
          </div>
          <div v-else class="empty-shell">暂无逾期项</div>
        </SurfaceSection>

        <SurfaceSection title="本周排期">
          <div v-if="weekNotes.length" class="week-list">
            <button
              v-for="note in weekNotes"
              :key="note.id"
              type="button"
              class="week-item"
              :class="{ active: activeDashboardNoteId === note.id }"
              @click="activateNote(note.id)"
            >
              <strong>{{ note.title }}</strong>
              <span>{{ getDueBadge(note).label }}</span>
            </button>
          </div>
          <div v-else class="empty-shell">暂无本周排期</div>
        </SurfaceSection>
      </div>

      <NoteDetailPanel
        :note="activeDashboardNote"
        @edit="editNote"
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
  </section>
</template>

<style scoped>
.dashboard-shell {
  gap: 1rem;
}

.command-strip,
.dashboard-stage {
  display: grid;
  gap: 1rem;
}

.workbench-hero {
  padding: 1.1rem 1.2rem;
  gap: 1rem;
}

.command-strip {
  grid-template-columns: minmax(0, 1.3fr) minmax(320px, 0.7fr);
  align-items: stretch;
}

.focus-pocket,
.action-rack,
.scan-rail {
  display: grid;
  gap: 0.85rem;
}

.focus-pocket {
  padding: 1rem 1.1rem;
  border-radius: 28px;
  border: 1px solid var(--border);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--panel-bg) 96%, transparent) 0%, color-mix(in srgb, var(--surface-strong) 62%, transparent) 100%);
}

.focus-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
}

.focus-kicker {
  color: var(--text-soft);
  font-size: 0.76rem;
  letter-spacing: 0.08em;
}

.focus-state {
  color: var(--text-muted);
  font-size: 0.82rem;
}

.focus-line {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 0.9rem;
}

.focus-line h3 {
  margin: 0;
  color: var(--heading);
  font-family: var(--font-display);
  font-size: clamp(1.35rem, 2vw, 2rem);
  line-height: 1.08;
}

.focus-signals {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.focus-pill,
.section-pill {
  min-height: 1.8rem;
  padding: 0 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface-strong) 88%, transparent);
  display: inline-flex;
  align-items: center;
  color: var(--text-muted);
  font-size: 0.78rem;
}

.section-pill.danger {
  color: var(--danger);
}

.focus-due {
  flex: none;
  min-height: 2rem;
  padding: 0 0.85rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface-strong) 86%, transparent);
  display: inline-flex;
  align-items: center;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.focus-due[data-tone='danger'] {
  color: var(--danger);
  border-color: color-mix(in srgb, var(--danger) 24%, var(--border));
}

.focus-due[data-tone='warning'] {
  color: var(--warning);
  border-color: color-mix(in srgb, var(--warning) 24%, var(--border));
}

.action-rack {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-content: start;
}

.action-chip {
  min-height: 72px;
  padding: 0.9rem 1rem;
  border-radius: 24px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--panel-bg) 90%, transparent);
  color: inherit;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  transition:
    transform var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast);
}

.action-chip:hover,
.week-item:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--accent) 26%, var(--border));
}

.action-chip-primary {
  background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 92%, #fff 8%), var(--accent-strong));
  color: #fff;
  border-color: transparent;
  box-shadow: 0 14px 28px color-mix(in srgb, var(--accent) 26%, transparent);
}

.action-chip span,
.week-item span {
  font-size: 0.94rem;
  font-weight: 600;
}

.dashboard-stage {
  grid-template-columns: minmax(360px, 0.9fr) minmax(0, 1.1fr);
  align-items: start;
}

.scan-rail {
  position: sticky;
  top: 0;
}

.queue-list,
.week-list {
  display: grid;
  gap: 0.7rem;
}

.week-item {
  padding: 0.9rem 1rem;
  border-radius: 22px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--sheet) 88%, transparent);
  display: grid;
  gap: 0.22rem;
  text-align: left;
  transition:
    transform var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast);
}

.week-item.active {
  border-color: var(--selection-border);
  background: color-mix(in srgb, var(--selection) 78%, var(--sheet));
}

.empty-shell {
  min-height: 96px;
  border-radius: 24px;
  border: 1px dashed var(--border-strong);
  background: color-mix(in srgb, var(--surface-strong) 58%, transparent);
  display: grid;
  place-items: center;
  padding: 1rem;
  color: var(--text-muted);
  text-align: center;
}

@media (max-width: 1180px) {
  .command-strip,
  .dashboard-stage {
    grid-template-columns: 1fr;
  }

  .action-rack {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .scan-rail {
    position: static;
  }
}

@media (max-width: 760px) {
  .workbench-hero {
    padding: 1rem;
  }

  .focus-line {
    flex-direction: column;
  }

  .action-rack {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .action-chip {
    min-height: 64px;
  }
}
</style>

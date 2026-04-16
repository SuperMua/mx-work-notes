<script setup lang="ts">
import { computed, ref } from 'vue'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { CalendarDays, ChevronLeft, ChevronRight, GripVertical, PencilLine } from 'lucide-vue-next'

import type { Note } from '@shared'

import NotesToolbar from '@/components/NotesToolbar.vue'
import InspectorPanel from '@/components/ui/InspectorPanel.vue'
import DataStrip from '@/components/ui/DataStrip.vue'
import SurfaceSection from '@/components/ui/SurfaceSection.vue'
import { formatTimestamp, getDueBadge, sortNotes } from '@/lib/note-utils'
import { useWorkspaceStore } from '@/stores/workspace'

dayjs.locale('zh-cn')

type CalendarMode = 'month' | 'week'

interface CalendarDay {
  key: string
  isoDate: string
  label: string
  shortLabel: string
  notes: Note[]
  isToday: boolean
  isCurrentMonth: boolean
}

const store = useWorkspaceStore()

const currentMode = ref<CalendarMode>('month')
const cursor = ref(dayjs().startOf('day').format('YYYY-MM-DD'))
const selectedDateKey = ref(dayjs().format('YYYY-MM-DD'))
const draggedNoteId = ref<string | null>(null)
const dragOverDateKey = ref<string | null>(null)

const weekdayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const summaryItems = computed(() => [
  { label: '日历内便签', value: store.calendarNotes.length, note: '只有设置了截止时间的便签会进入日历' },
  { label: '今日到期', value: store.dashboardNotes.today.length, note: '今天应收口的任务' },
  { label: '已逾期', value: store.dashboardNotes.overdue.length, note: '需要优先排查的时间风险' },
])

const sortedCalendarNotes = computed(() => sortNotes(store.calendarNotes, 'smart'))

const notesByDate = computed(() => {
  const grouped = new Map<string, Note[]>()

  sortedCalendarNotes.value.forEach((note) => {
    if (!note.dueDate) {
      return
    }

    const key = dayjs(note.dueDate).format('YYYY-MM-DD')
    grouped.set(key, [...(grouped.get(key) || []), note])
  })

  return grouped
})

const visibleStart = computed(() => {
  const base = dayjs(cursor.value)
  return currentMode.value === 'month' ? base.startOf('month').startOf('week') : base.startOf('week')
})

const visibleEnd = computed(() => {
  const base = dayjs(cursor.value)
  return currentMode.value === 'month' ? base.endOf('month').endOf('week') : base.endOf('week')
})

const calendarDays = computed<CalendarDay[]>(() => {
  const days: CalendarDay[] = []
  const today = dayjs()
  const monthBase = dayjs(cursor.value)
  let pointer = visibleStart.value

  while (pointer.isBefore(visibleEnd.value, 'day') || pointer.isSame(visibleEnd.value, 'day')) {
    const key = pointer.format('YYYY-MM-DD')
    days.push({
      key,
      isoDate: key,
      label: pointer.format('DD'),
      shortLabel: pointer.format('M月D日'),
      notes: notesByDate.value.get(key) || [],
      isToday: pointer.isSame(today, 'day'),
      isCurrentMonth: pointer.isSame(monthBase, 'month'),
    })
    pointer = pointer.add(1, 'day')
  }

  return days
})

const calendarRows = computed(() => {
  const rows: CalendarDay[][] = []
  for (let index = 0; index < calendarDays.value.length; index += 7) {
    rows.push(calendarDays.value.slice(index, index + 7))
  }
  return rows
})

const selectedDay = computed(() => {
  const matched = calendarDays.value.find((day) => day.key === selectedDateKey.value)
  if (matched) {
    return matched
  }

  const fallback = dayjs(selectedDateKey.value)
  const key = fallback.isValid() ? fallback.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')
  return {
    key,
    isoDate: key,
    label: fallback.isValid() ? fallback.format('DD') : dayjs().format('DD'),
    shortLabel: fallback.isValid() ? fallback.format('M月D日') : dayjs().format('M月D日'),
    notes: notesByDate.value.get(key) || [],
    isToday: fallback.isValid() ? fallback.isSame(dayjs(), 'day') : true,
    isCurrentMonth: fallback.isValid() ? fallback.isSame(dayjs(cursor.value), 'month') : true,
  }
})

const selectedDayMetrics = computed(() => {
  const notes = selectedDay.value.notes
  return {
    total: notes.length,
    completed: notes.filter((note) => note.completed).length,
    overdue: notes.filter((note) => getDueBadge(note).tone === 'danger').length,
    focus: notes.filter((note) => note.priority === 'high' || note.pinned).length,
  }
})

const rangeLabel = computed(() => {
  const base = dayjs(cursor.value)
  if (currentMode.value === 'month') {
    return base.format('YYYY年MM月')
  }

  const start = base.startOf('week')
  const end = base.endOf('week')
  return `${start.format('MM月DD日')} - ${end.format('MM月DD日')}`
})

function selectDay(day: CalendarDay) {
  selectedDateKey.value = day.key
  cursor.value = day.key
}

function switchMode(mode: CalendarMode) {
  currentMode.value = mode
  const anchor = mode === 'week' ? dayjs(selectedDateKey.value).startOf('week') : dayjs(selectedDateKey.value)
  cursor.value = anchor.format('YYYY-MM-DD')
}

function moveRange(step: number) {
  const next = currentMode.value === 'month' ? dayjs(cursor.value).add(step, 'month') : dayjs(cursor.value).add(step, 'week')
  cursor.value = next.format('YYYY-MM-DD')
  selectedDateKey.value = currentMode.value === 'week' ? next.startOf('week').format('YYYY-MM-DD') : next.format('YYYY-MM-DD')
}

function jumpToday() {
  const today = dayjs().format('YYYY-MM-DD')
  cursor.value = today
  selectedDateKey.value = today
}

function editNote(noteId: string) {
  const note = store.notes.find((item) => item.id === noteId)
  if (note) {
    store.openEditor(note)
  }
}

function startDragging(noteId: string, event: DragEvent) {
  draggedNoteId.value = noteId
  event.dataTransfer?.setData('text/plain', noteId)
  event.dataTransfer?.setData('application/x-smart-note', noteId)
  event.dataTransfer?.setDragImage?.(event.currentTarget as Element, 18, 18)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

function stopDragging() {
  draggedNoteId.value = null
  dragOverDateKey.value = null
}

function handleDragOver(dayKey: string, event: DragEvent) {
  event.preventDefault()
  dragOverDateKey.value = dayKey
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function handleDragLeave(dayKey: string) {
  if (dragOverDateKey.value === dayKey) {
    dragOverDateKey.value = null
  }
}

async function handleDrop(day: CalendarDay, event: DragEvent) {
  event.preventDefault()

  const noteId = event.dataTransfer?.getData('application/x-smart-note') || event.dataTransfer?.getData('text/plain') || draggedNoteId.value
  dragOverDateKey.value = null
  draggedNoteId.value = null

  if (!noteId) {
    return
  }

  const note = store.calendarNotes.find((item) => item.id === noteId)
  if (!note) {
    return
  }

  const source = note.dueDate ? dayjs(note.dueDate) : dayjs()
  const nextDueDate = dayjs(day.isoDate)
    .hour(source.hour())
    .minute(source.minute())
    .second(source.second())
    .millisecond(0)

  await store.updateDueDate(noteId, nextDueDate.toISOString())
  selectDay(day)
}
</script>

<template>
  <section class="page-stack calendar-page">
    <NotesToolbar
      :query="store.searchQuery"
      :sort-mode="store.settings.defaultSort"
      :templates="store.templates"
      @update:query="store.setSearchQuery"
      @remember="store.rememberSearch"
      @sort="store.setSortMode"
      @create="store.openEditor()"
      @template="store.createFromTemplate"
      @import="store.openImportDialog()"
      @export="store.exportCurrent()"
      @palette="store.toggleCommandPalette()"
    />

    <SurfaceSection title="日历排期">
      <DataStrip :items="summaryItems" />
    </SurfaceSection>

    <section class="calendar-workbench">
      <article class="surface-sheet calendar-stage">
        <header class="calendar-toolbar">
          <div class="calendar-toolbar-main">
            <div class="calendar-anchor">
              <span class="pill anchor-pill">
                <CalendarDays :size="14" />
                {{ currentMode === 'month' ? '月历总览' : '周历排期' }}
              </span>
              <h2>{{ rangeLabel }}</h2>
            </div>

            <div class="calendar-controls">
              <div class="stepper">
                <button class="icon-btn" aria-label="上一段时间" @click="moveRange(-1)">
                  <ChevronLeft :size="16" />
                </button>
                <button class="btn btn-secondary compact-btn" @click="jumpToday">回到今天</button>
                <button class="icon-btn" aria-label="下一段时间" @click="moveRange(1)">
                  <ChevronRight :size="16" />
                </button>
              </div>

              <div class="mode-switch">
                <button class="mode-btn" :class="{ active: currentMode === 'month' }" @click="switchMode('month')">月视图</button>
                <button class="mode-btn" :class="{ active: currentMode === 'week' }" @click="switchMode('week')">周视图</button>
              </div>
            </div>
          </div>

          <div class="weekday-strip" aria-hidden="true">
            <span v-for="label in weekdayLabels" :key="label">{{ label }}</span>
          </div>
        </header>

        <div class="calendar-grid">
          <div v-for="row in calendarRows" :key="row[0]?.key" class="calendar-row">
            <article
              v-for="day in row"
              :key="day.key"
              class="calendar-cell"
              :class="{
                today: day.isToday,
                muted: !day.isCurrentMonth && currentMode === 'month',
                selected: selectedDateKey === day.key,
                'drag-over': dragOverDateKey === day.key,
              }"
              :data-testid="`calendar-day-${day.key}`"
              @click="selectDay(day)"
              @dragover="handleDragOver(day.key, $event)"
              @dragleave="handleDragLeave(day.key)"
              @drop="handleDrop(day, $event)"
            >
              <header class="day-head">
                <div>
                  <span class="day-label">{{ day.label }}</span>
                  <span class="day-date">{{ day.shortLabel }}</span>
                </div>
                <span class="day-count">{{ day.notes.length }}</span>
              </header>

              <div class="day-content">
                <button
                  v-for="note in day.notes.slice(0, currentMode === 'month' ? 3 : 4)"
                  :key="note.id"
                  class="day-note"
                  :class="[note.priority, { done: note.completed, pinned: note.pinned }]"
                  draggable="true"
                  :data-testid="`calendar-note-${note.id}`"
                  @click.stop="selectDay(day)"
                  @dragstart="startDragging(note.id, $event)"
                  @dragend="stopDragging()"
                >
                  <span class="drag-handle"><GripVertical :size="13" /></span>
                  <span class="day-note-copy">
                    <strong>{{ note.title }}</strong>
                    <small>{{ formatTimestamp(note.dueDate, 'HH:mm') }}</small>
                  </span>
                </button>

                <p v-if="day.notes.length > (currentMode === 'month' ? 3 : 4)" class="more-indicator">
                  还有 {{ day.notes.length - (currentMode === 'month' ? 3 : 4) }} 条安排
                </p>
              </div>
            </article>
          </div>
        </div>
      </article>

      <InspectorPanel
        class="calendar-inspector"
        :title="selectedDay.isToday ? '今天的安排' : `${selectedDay.shortLabel} 的安排`"
      >
        <section class="day-metrics">
          <article class="day-metric">
            <span>总数</span>
            <strong>{{ selectedDayMetrics.total }}</strong>
          </article>
          <article class="day-metric">
            <span>已完成</span>
            <strong>{{ selectedDayMetrics.completed }}</strong>
          </article>
          <article class="day-metric">
            <span>逾期</span>
            <strong>{{ selectedDayMetrics.overdue }}</strong>
          </article>
          <article class="day-metric">
            <span>重点</span>
            <strong>{{ selectedDayMetrics.focus }}</strong>
          </article>
        </section>

        <div v-if="selectedDay.notes.length" class="agenda-list">
          <article v-for="note in selectedDay.notes" :key="note.id" class="agenda-card">
            <header class="agenda-head">
              <div class="agenda-title">
                <p class="agenda-meta">
                  <span class="pill">{{ note.status === 'todo' ? '待处理' : note.status === 'doing' ? '进行中' : '已完成' }}</span>
                  <span class="pill" :class="note.priority">{{ note.priority === 'high' ? '高优先级' : note.priority === 'low' ? '低优先级' : '普通优先级' }}</span>
                  <span v-if="note.pinned" class="pill">已置顶</span>
                </p>
                <h3>{{ note.title }}</h3>
              </div>
              <button class="btn btn-secondary compact-btn" @click="editNote(note.id)">
                <PencilLine :size="15" />
                编辑
              </button>
            </header>

            <div class="agenda-body">
              <p>{{ note.type === 'checklist' ? `清单模式，共 ${note.checklist.length} 项` : note.content || '暂无详细内容' }}</p>
            </div>

            <footer class="agenda-foot">
              <span class="pill" :class="getDueBadge(note).tone">{{ getDueBadge(note).label }}</span>
              <span class="pill">{{ formatTimestamp(note.dueDate) }}</span>
              <button class="btn btn-ghost compact-btn" @click="store.toggleNoteComplete(note.id)">
                {{ note.completed ? '取消完成' : '标记完成' }}
              </button>
            </footer>
          </article>
        </div>

        <div v-else class="calendar-empty">
          <strong>这一天还是空的</strong>
          <button class="btn btn-primary" @click="store.openEditor()">新建便签</button>
        </div>
      </InspectorPanel>
    </section>
  </section>
</template>

<style scoped>
.calendar-page {
  display: grid;
  gap: 1rem;
}

.calendar-workbench {
  display: grid;
  grid-template-columns: minmax(0, 1.9fr) minmax(320px, 0.92fr);
  gap: 1rem;
  align-items: start;
}

.calendar-stage,
.calendar-inspector {
  display: grid;
  gap: 1.1rem;
  padding: 1.1rem;
  border-radius: 30px;
}

.calendar-toolbar,
.calendar-toolbar-main,
.calendar-controls,
.stepper,
.mode-switch,
.weekday-strip,
.agenda-head,
.agenda-foot,
.agenda-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.calendar-toolbar {
  display: grid;
  gap: 1rem;
}

.calendar-toolbar-main {
  justify-content: space-between;
  flex-wrap: wrap;
}

.calendar-anchor {
  display: grid;
  gap: 0.4rem;
}

.calendar-anchor h2 {
  font-family: var(--font-display);
  font-size: clamp(1.65rem, 2vw, 2.15rem);
  font-weight: 700;
  letter-spacing: -0.05em;
}

.anchor-pill {
  width: fit-content;
}

.stepper {
  padding: 0.35rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-strong);
}

.compact-btn {
  min-height: 2.35rem;
  padding-inline: 0.9rem;
}

.mode-switch {
  padding: 0.3rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.26);
}

.mode-btn {
  min-height: 2.35rem;
  padding: 0 1rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-muted);
  transition: background var(--transition-fast), color var(--transition-fast), transform var(--transition-fast);
}

.mode-btn.active {
  background: var(--accent);
  color: #fff;
}

.weekday-strip {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.75rem;
  color: var(--text-soft);
  font-size: 0.82rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.calendar-grid {
  display: grid;
  gap: 0.75rem;
}

.calendar-row {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.75rem;
}

.calendar-cell {
  display: grid;
  gap: 0.9rem;
  min-height: 200px;
  padding: 0.95rem;
  border-radius: 24px;
  border: 1px solid var(--border);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.12), transparent 40%),
    var(--surface-strong);
  transition:
    border-color var(--transition-fast),
    background var(--transition-fast),
    transform var(--transition-fast),
    box-shadow var(--transition-fast);
}

.calendar-cell:hover {
  transform: translateY(-2px);
  border-color: var(--selection-border);
}

.calendar-cell.selected {
  border-color: var(--selection-border);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), transparent 42%),
    var(--selection);
}

.calendar-cell.today {
  box-shadow: inset 0 0 0 1px var(--selection-border);
}

.calendar-cell.muted {
  opacity: 0.58;
}

.calendar-cell.drag-over {
  border-style: dashed;
  border-color: var(--accent);
  background: var(--accent-soft);
}

.day-head {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 0.7rem;
}

.day-label {
  display: block;
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--heading);
}

.day-date {
  display: block;
  margin-top: 0.1rem;
  color: var(--text-soft);
  font-size: 0.82rem;
}

.day-count {
  min-width: 1.8rem;
  min-height: 1.8rem;
  padding: 0 0.45rem;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--heading);
  display: grid;
  place-items: center;
  font-size: 0.82rem;
}

.day-content,
.agenda-list,
.calendar-empty {
  display: grid;
  gap: 0.7rem;
}

.day-note {
  width: 100%;
  padding: 0.72rem 0.78rem;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.42);
  color: var(--text);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: 0.55rem;
  text-align: left;
  transition:
    transform var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast);
}

.day-note:hover {
  transform: translateY(-1px);
  border-color: var(--selection-border);
}

.day-note.pinned {
  box-shadow: inset 3px 0 0 var(--accent);
}

.day-note.high {
  background: color-mix(in srgb, var(--danger) 10%, var(--surface-strong));
}

.day-note.normal {
  background: color-mix(in srgb, var(--accent) 7%, var(--surface-strong));
}

.day-note.low {
  background: color-mix(in srgb, var(--success) 8%, var(--surface-strong));
}

.day-note.done {
  opacity: 0.72;
}

.drag-handle {
  color: var(--text-soft);
  padding-top: 0.12rem;
}

.day-note-copy {
  display: grid;
  gap: 0.25rem;
  min-width: 0;
}

.day-note-copy strong,
.agenda-title h3 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.day-note-copy small {
  color: var(--text-soft);
}

.more-indicator {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.84rem;
}

.day-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.day-metric,
.agenda-card,
.calendar-empty {
  padding: 0.95rem 1rem;
  border-radius: 24px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.28);
}

.day-metric {
  display: grid;
  gap: 0.35rem;
}

.day-metric span {
  color: var(--text-soft);
  font-size: 0.82rem;
}

.day-metric strong {
  font-family: var(--font-display);
  font-size: 1.5rem;
  color: var(--heading);
}

.agenda-card {
  display: grid;
  gap: 0.9rem;
}

.agenda-head,
.agenda-foot {
  justify-content: space-between;
  flex-wrap: wrap;
}

.agenda-title {
  display: grid;
  gap: 0.45rem;
  min-width: 0;
}

.agenda-title h3 {
  font-size: 1rem;
}

.agenda-meta {
  flex-wrap: wrap;
}

.agenda-body p {
  margin: 0;
  line-height: 1.75;
  color: var(--text-muted);
}

.calendar-empty {
  justify-items: start;
}

@media (max-width: 1280px) {
  .calendar-workbench {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 960px) {
  .weekday-strip,
  .calendar-row {
    grid-template-columns: repeat(7, minmax(120px, 1fr));
  }

  .calendar-stage {
    overflow: auto;
  }

  .calendar-grid {
    min-width: 980px;
  }
}

@media (max-width: 720px) {
  .calendar-controls,
  .calendar-toolbar-main {
    width: 100%;
  }

  .calendar-controls {
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .day-metrics {
    grid-template-columns: 1fr 1fr;
  }
}
</style>

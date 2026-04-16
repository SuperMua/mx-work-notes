<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle2, Circle, ListChecks, Pin } from 'lucide-vue-next'
import { NOTE_STATUS_LABELS, PRIORITY_SHORT_LABELS } from '@shared'

import type { Note } from '@shared'

import { getChecklistProgress, getDueBadge, relativeTimestamp } from '@/lib/note-utils'

const props = defineProps<{
  note: Note
  active: boolean
  selected: boolean
  index: number
}>()

const emit = defineEmits<{
  activate: [id: string]
  select: [id: string, index: number, shift: boolean]
}>()

const dueBadge = computed(() => getDueBadge(props.note))
const checklist = computed(() => getChecklistProgress(props.note))
const summaryText = computed(() => {
  if (props.note.type === 'checklist') {
    return `清单 ${checklist.value.completed}/${checklist.value.total}`
  }

  if (props.note.tags.length) {
    return props.note.tags.slice(0, 2).join(' / ')
  }

  return '普通便签'
})

function activate() {
  emit('activate', props.note.id)
}

function toggleSelection(event: MouseEvent) {
  emit('select', props.note.id, props.index, event.shiftKey)
}
</script>

<template>
  <article class="note-row" :class="{ active, selected }" :data-testid="`note-row-${note.id}`" @click="activate">
    <button class="selector" :class="{ selected }" :data-testid="`note-select-${note.id}`" @click.stop="toggleSelection">
      <CheckCircle2 v-if="selected" :size="15" />
      <Circle v-else :size="15" />
    </button>

    <div class="content">
      <div class="title-line">
        <strong>{{ note.title }}</strong>
        <div class="mini-icons">
          <Pin v-if="note.pinned" :size="12" />
          <ListChecks v-if="note.type === 'checklist'" :size="12" />
        </div>
      </div>

      <div class="meta-line">
        <div class="meta-group">
          <span class="meta-item">{{ summaryText }}</span>
          <span class="meta-item">{{ NOTE_STATUS_LABELS[note.status] }}</span>
        </div>
        <span class="due-pill inline" :class="{ overdue: dueBadge.tone === 'danger' }">{{ dueBadge.label }}</span>
        <span class="meta-time">{{ relativeTimestamp(note.updatedAt) }}</span>
      </div>
    </div>

    <div class="status-side">
      <span class="priority" :class="note.priority">{{ PRIORITY_SHORT_LABELS[note.priority] }}</span>
    </div>
  </article>
</template>

<style scoped>
.note-row {
  position: relative;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 52px;
  gap: 0.8rem;
  align-items: center;
  min-height: 86px;
  padding: 0.85rem 0.95rem;
  border-radius: 24px;
  border: 1px solid transparent;
  background: transparent;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    transform var(--transition-fast),
    box-shadow var(--transition-fast);
}

.note-row:hover {
  background: var(--surface-hover);
  transform: translateY(-1px);
}

.note-row.active {
  border-color: var(--selection-border);
  background: color-mix(in srgb, var(--selection) 88%, var(--sheet));
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--selection-border) 72%, transparent),
    0 12px 28px rgba(18, 24, 38, 0.08);
}

.note-row.selected {
  border-color: color-mix(in srgb, var(--accent) 36%, var(--border));
}

.selector {
  width: 1.95rem;
  height: 1.95rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--sheet) 82%, transparent);
  color: var(--text-muted);
  display: grid;
  place-items: center;
}

.selector.selected {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.content {
  min-width: 0;
  display: grid;
  gap: 0.34rem;
}

.title-line,
.meta-line {
  display: flex;
  align-items: center;
}

.title-line {
  gap: 0.55rem;
}

.title-line strong {
  min-width: 0;
  flex: 1;
  color: var(--heading);
  font-size: 0.98rem;
  line-height: 1.38;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-icons {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--text-soft);
  flex-shrink: 0;
}

.meta-line {
  gap: 0.55rem;
  color: var(--text-muted);
  font-size: 0.8rem;
  min-width: 0;
}

.meta-group {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  overflow: hidden;
  flex: 1 1 auto;
}

.meta-item,
.meta-time {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta-item:not(:last-child)::after {
  content: '';
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: var(--line);
  display: inline-block;
  margin-left: 0.55rem;
}

.status-side {
  display: grid;
  justify-items: end;
  align-items: center;
  width: 52px;
  min-width: 52px;
  text-align: right;
}

.due-pill,
.priority {
  min-height: 1.8rem;
  padding: 0 0.7rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface-strong) 88%, transparent);
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  color: var(--text-muted);
  font-size: 0.76rem;
}

.due-pill {
  flex: 0 0 auto;
  justify-content: center;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 112px;
}

.due-pill.inline {
  min-height: 1.6rem;
  padding-inline: 0.62rem;
  font-size: 0.72rem;
  background: color-mix(in srgb, var(--surface-strong) 94%, transparent);
}

.meta-time {
  flex: 0 0 auto;
}

.due-pill.overdue {
  color: var(--danger);
  border-color: color-mix(in srgb, var(--danger) 34%, var(--border));
}

.priority.high {
  color: var(--danger);
}

.priority.normal {
  color: var(--accent);
}

.priority.low {
  color: var(--success);
}

@media (max-width: 760px) {
  .note-row {
    grid-template-columns: 34px minmax(0, 1fr) 44px;
    align-items: start;
  }

  .status-side {
    width: 44px;
    min-width: 44px;
    justify-items: end;
  }

  .meta-line {
    flex-wrap: wrap;
  }

  .meta-group {
    flex-basis: 100%;
  }

  .meta-time {
    margin-left: auto;
  }

  .due-pill.inline {
    max-width: calc(100% - 4.5rem);
  }
}
</style>

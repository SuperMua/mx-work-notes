<script setup lang="ts">
import { computed } from 'vue'
import { Archive, CalendarClock, Check, PanelTopOpen, Pin, RotateCcw, Trash2 } from 'lucide-vue-next'

import type { Note } from '@shared'

import { formatTimestamp, getChecklistProgress, getDueBadge, highlightText, relativeTimestamp } from '@/lib/note-utils'

const props = defineProps<{
  note: Note
  query: string
  selected?: boolean
  selectionIndex?: number
}>()

const emit = defineEmits<{
  edit: [id: string]
  complete: [id: string]
  trash: [id: string]
  restore: [id: string]
  purge: [id: string]
  archive: [id: string]
  unarchive: [id: string]
  select: [id: string, index: number, shift: boolean]
  tag: [value: string]
  checklist: [noteId: string, itemId: string, text: string, completed: boolean]
}>()

const dueBadge = computed(() => getDueBadge(props.note))
const checklist = computed(() => getChecklistProgress(props.note))
const toneClass = computed(() => `tone-${dueBadge.value.tone}`)
const priorityLabel = computed(() => ({ high: '高优先级', normal: '普通优先级', low: '低优先级' }[props.note.priority]))
const statusLabel = computed(() => ({ todo: '待处理', doing: '进行中', done: '已完成' }[props.note.status]))

function selectCard(event: MouseEvent) {
  emit('select', props.note.id, props.selectionIndex || 0, event.shiftKey)
}
</script>

<template>
  <article class="panel note-card" :class="{ selected }" :data-testid="`note-card-${note.id}`">
    <header class="card-head">
      <div class="leading">
        <button class="selector" :class="{ selected }" :data-testid="`note-select-${note.id}`" :aria-label="`选择便签 ${note.title}`" @click="selectCard">
          <Check :size="15" />
        </button>
        <div class="title-block">
          <p class="eyebrow">
            <Pin v-if="note.pinned" :size="14" />
            <span>{{ priorityLabel }}</span>
          </p>
          <h3 v-html="highlightText(note.title, query)" />
        </div>
      </div>
      <div class="actions">
        <button class="icon-btn" :data-testid="`note-complete-${note.id}`" :aria-label="`切换完成 ${note.title}`" @click="emit('complete', note.id)">
          <Check :size="16" />
        </button>
        <button class="icon-btn" :data-testid="`note-edit-${note.id}`" :aria-label="`编辑便签 ${note.title}`" @click="emit('edit', note.id)">
          <PanelTopOpen :size="16" />
        </button>
      </div>
    </header>

    <p v-if="note.type === 'note'" class="content" v-html="highlightText(note.content || '暂无内容', query)" />

    <ul v-else class="checklist">
      <li v-for="item in note.checklist" :key="item.id">
        <label>
          <input
            type="checkbox"
            :checked="item.completed"
            :data-testid="`note-checklist-${note.id}-${item.id}`"
            @change="emit('checklist', note.id, item.id, item.text, ($event.target as HTMLInputElement).checked)"
          />
          <span :class="{ done: item.completed }">{{ item.text }}</span>
        </label>
      </li>
    </ul>

    <footer class="card-foot">
      <div class="meta-stack">
        <span class="pill" :class="toneClass">
          <CalendarClock :size="14" />
          {{ dueBadge.label }}
        </span>
        <span class="pill">{{ relativeTimestamp(note.updatedAt) }}</span>
        <span v-if="note.type === 'checklist'" class="pill">
          {{ checklist.completed }}/{{ checklist.total }} 已完成
        </span>
      </div>

      <div class="tag-row">
        <button v-for="tag in note.tags" :key="tag" class="tag" :data-testid="`note-tag-${tag}`" @click="emit('tag', tag)">
          {{ tag }}
        </button>
      </div>

      <div class="card-bottom">
        <div class="status-line">
          <span>{{ statusLabel }}</span>
          <span class="stamp">{{ formatTimestamp(note.dueDate) }}</span>
        </div>

        <div class="trail-actions">
          <button v-if="!note.archivedAt && !note.deletedAt" class="link-btn" :data-testid="`note-archive-${note.id}`" @click="emit('archive', note.id)">
            <Archive :size="15" />
            归档
          </button>
          <button v-if="note.archivedAt" class="link-btn" :data-testid="`note-unarchive-${note.id}`" @click="emit('unarchive', note.id)">
            <RotateCcw :size="15" />
            取消归档
          </button>
          <button v-if="!note.deletedAt" class="link-btn danger" :data-testid="`note-trash-${note.id}`" @click="emit('trash', note.id)">
            <Trash2 :size="15" />
            回收站
          </button>
          <button v-else class="link-btn" :data-testid="`note-restore-${note.id}`" @click="emit('restore', note.id)">
            <RotateCcw :size="15" />
            恢复
          </button>
          <button v-if="note.deletedAt" class="link-btn danger" :data-testid="`note-purge-${note.id}`" @click="emit('purge', note.id)">
            <Trash2 :size="15" />
            永久删除
          </button>
        </div>
      </div>
    </footer>
  </article>
</template>

<style scoped>
.note-card {
  display: grid;
  gap: 1rem;
  padding: 1.15rem;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.4);
}

.note-card.selected {
  border-color: var(--selection-border);
  background: var(--selection);
}

.card-head,
.leading,
.actions,
.meta-stack,
.tag-row,
.trail-actions {
  display: flex;
  gap: 0.75rem;
}

.card-head,
.card-bottom {
  display: grid;
  gap: 0.85rem;
}

.card-head {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
}

.leading {
  min-width: 0;
  align-items: start;
}

.selector {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.48);
  color: var(--text-muted);
  display: grid;
  place-items: center;
}

.selector.selected {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.title-block {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0;
  color: var(--text-soft);
  font-size: 0.84rem;
}

.title-block h3 {
  margin: 0;
  line-height: 1.45;
}

.actions,
.meta-stack,
.tag-row,
.trail-actions {
  flex-wrap: wrap;
}

.content {
  margin: 0;
  color: var(--text);
  line-height: 1.8;
  white-space: pre-wrap;
}

.checklist {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.6rem;
}

.checklist label {
  display: flex;
  gap: 0.7rem;
  align-items: start;
  color: var(--text);
}

.checklist span.done {
  color: var(--text-muted);
  text-decoration: line-through;
}

.tag {
  min-height: 2rem;
  padding: 0 0.8rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-strong);
  color: var(--text-muted);
}

.status-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.stamp {
  color: var(--text-soft);
}

.trail-actions {
  gap: 0.9rem;
}

.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--text-muted);
}

.link-btn.danger {
  color: var(--danger);
}

.tone-danger {
  color: var(--danger);
}

.tone-warning {
  color: var(--warning);
}

.tone-info {
  color: var(--accent);
}
</style>

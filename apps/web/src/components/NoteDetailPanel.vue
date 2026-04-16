<script setup lang="ts">
import { computed } from 'vue'
import { Archive, CalendarClock, Check, Clock3, RotateCcw, ShieldCheck, Trash2, X } from 'lucide-vue-next'
import { NOTE_STATUS_LABELS, PRIORITY_LABELS, SYNC_STATUS_LABELS } from '@shared'

import type { Note } from '@shared'

import InspectorPanel from '@/components/ui/InspectorPanel.vue'
import { formatTimestamp, getChecklistProgress, getDueBadge } from '@/lib/note-utils'

const props = withDefaults(
  defineProps<{
    note: Note | null
    closable?: boolean
  }>(),
  {
    closable: false,
  },
)

const emit = defineEmits<{
  edit: [id: string]
  complete: [id: string]
  archive: [id: string]
  unarchive: [id: string]
  trash: [id: string]
  restore: [id: string]
  purge: [id: string]
  tag: [value: string]
  checklist: [noteId: string, itemId: string, text: string, completed: boolean]
  close: []
}>()

const dueBadge = computed(() => (props.note ? getDueBadge(props.note) : null))
const checklist = computed(() => (props.note ? getChecklistProgress(props.note) : { completed: 0, total: 0, percent: 0 }))
const statusLabel = computed(() => (props.note ? NOTE_STATUS_LABELS[props.note.status] : ''))
const recordItems = computed(() => {
  if (!props.note) {
    return []
  }

  return [
    { label: '创建时间', value: formatTimestamp(props.note.createdAt) },
    { label: '最近更新', value: formatTimestamp(props.note.updatedAt) },
    { label: '完成时间', value: formatTimestamp(props.note.completedAt) },
    { label: '同步状态', value: SYNC_STATUS_LABELS[props.note.syncStatus] },
  ]
})
</script>

<template>
  <InspectorPanel
    class="detail-panel"
    data-testid="note-detail-panel"
    :title="note ? note.title : '请选择一条便签'"
  >
    <template #actions>
      <button v-if="closable" class="icon-btn" data-testid="note-detail-close" type="button" @click="emit('close')">
        <X :size="16" />
      </button>
      <template v-if="note">
        <button class="btn btn-secondary" :data-testid="`note-complete-${note.id}`" @click="emit('complete', note.id)">
          <Check :size="16" />
          {{ note.completed ? '取消完成' : '标记完成' }}
        </button>
        <button class="btn btn-primary" :data-testid="`note-edit-${note.id}`" @click="emit('edit', note.id)">编辑</button>
      </template>
    </template>

    <template v-if="note">
      <div class="detail-surface">
        <section class="detail-block detail-headline">
          <div class="headline-tags">
            <span class="pill" v-if="note.pinned">置顶</span>
            <span class="pill" :class="note.priority">{{ PRIORITY_LABELS[note.priority] }}</span>
            <span class="pill" v-if="note.type === 'checklist'">清单模式</span>
            <span class="pill" v-if="note.archivedAt">已归档</span>
            <span class="pill" v-if="note.deletedAt">回收站中</span>
          </div>

          <div class="headline-metrics">
            <article class="metric-chip">
              <span>当前状态</span>
              <strong>{{ statusLabel }}</strong>
            </article>
            <article class="metric-chip">
              <span>截止时间</span>
              <strong :class="{ danger: dueBadge?.tone === 'danger' }">
                <CalendarClock :size="15" />
                {{ dueBadge?.label }}
              </strong>
            </article>
            <article class="metric-chip">
              <span>提醒时间</span>
              <strong>
                <Clock3 :size="15" />
                {{ formatTimestamp(note.remindAt) }}
              </strong>
            </article>
          </div>
        </section>

        <div class="divider" />

        <section class="detail-block content-block">
          <header class="block-head">
            <h3>{{ note.type === 'checklist' ? '清单内容' : '正文内容' }}</h3>
            <span v-if="note.type === 'checklist'" class="muted">已完成 {{ checklist.completed }}/{{ checklist.total }}</span>
          </header>

          <p v-if="note.type === 'note'" class="content">{{ note.content || '暂无内容' }}</p>

          <div v-else class="checklist">
            <label v-for="item in note.checklist" :key="item.id" class="check-item">
              <input
                type="checkbox"
                :checked="item.completed"
                :data-testid="`note-checklist-${note.id}-${item.id}`"
                @change="emit('checklist', note.id, item.id, item.text, ($event.target as HTMLInputElement).checked)"
              />
              <span :class="{ done: item.completed }">{{ item.text }}</span>
            </label>
          </div>
        </section>

        <div class="divider" />

        <section class="detail-block tag-block">
          <header class="block-head">
            <h3>标签</h3>
            <span class="muted">{{ note.tags.length }} 个</span>
          </header>

          <div class="tag-row">
            <button v-for="tag in note.tags" :key="tag" class="tag" :data-testid="`note-tag-${tag}`" @click="emit('tag', tag)">
              {{ tag }}
            </button>
            <span v-if="!note.tags.length" class="empty">暂无标签</span>
          </div>
        </section>

        <div class="divider" />

        <section class="detail-block record-block">
          <header class="block-head">
            <h3>记录信息</h3>
          </header>

          <div class="record-grid">
            <article v-for="item in recordItems" :key="item.label" class="record-item">
              <span>{{ item.label }}</span>
              <strong>
                <ShieldCheck v-if="item.label === '同步状态'" :size="14" />
                {{ item.value }}
              </strong>
            </article>
          </div>
        </section>

        <div class="divider" />

        <footer class="trail-actions">
          <button v-if="!note.archivedAt && !note.deletedAt" class="btn btn-secondary" :data-testid="`note-archive-${note.id}`" @click="emit('archive', note.id)">
            <Archive :size="15" />
            归档
          </button>
          <button v-if="note.archivedAt" class="btn btn-secondary" :data-testid="`note-unarchive-${note.id}`" @click="emit('unarchive', note.id)">
            <RotateCcw :size="15" />
            取消归档
          </button>
          <button v-if="!note.deletedAt" class="btn btn-secondary" :data-testid="`note-trash-${note.id}`" @click="emit('trash', note.id)">
            <Trash2 :size="15" />
            移入回收站
          </button>
          <button v-else class="btn btn-secondary" :data-testid="`note-restore-${note.id}`" @click="emit('restore', note.id)">
            <RotateCcw :size="15" />
            恢复
          </button>
          <button v-if="note.deletedAt" class="btn btn-danger" :data-testid="`note-purge-${note.id}`" @click="emit('purge', note.id)">
            <Trash2 :size="15" />
            永久删除
          </button>
        </footer>
      </div>
    </template>

    <div v-else class="empty-state" data-testid="note-detail-empty">
      <strong>先从左侧选择一条便签</strong>
    </div>
  </InspectorPanel>
</template>

<style scoped>
.detail-panel {
  min-height: 72vh;
}

.detail-surface {
  display: grid;
  gap: 1rem;
  padding: 0.1rem 0;
}

.detail-block {
  display: grid;
  gap: 0.95rem;
}

.headline-tags,
.headline-metrics,
.trail-actions,
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
}

.headline-metrics {
  gap: 0.8rem;
}

.metric-chip {
  min-width: 160px;
  padding: 0.85rem 0.95rem;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface-strong) 84%, transparent);
  display: grid;
  gap: 0.3rem;
}

.metric-chip span,
.record-item span {
  color: var(--text-soft);
  font-size: 0.8rem;
  letter-spacing: 0.05em;
}

.metric-chip strong,
.record-item strong {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  color: var(--heading);
}

.metric-chip strong.danger {
  color: var(--danger);
}

.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.block-head h3 {
  margin: 0;
  font-size: 1rem;
}

.content {
  margin: 0;
  color: var(--text);
  line-height: 1.92;
  white-space: pre-wrap;
  font-size: 1rem;
}

.checklist {
  display: grid;
  gap: 0.78rem;
}

.check-item {
  display: flex;
  align-items: start;
  gap: 0.8rem;
  color: var(--text);
  padding: 0.2rem 0;
}

.check-item input {
  margin-top: 0.16rem;
}

.check-item span.done {
  color: var(--text-muted);
  text-decoration: line-through;
}

.tag {
  min-height: 2.1rem;
  padding: 0 0.9rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-strong);
  color: var(--text-muted);
}

.record-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.record-item {
  padding: 0.9rem 0.95rem;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--sheet) 86%, transparent);
  display: grid;
  gap: 0.28rem;
}

.empty-state {
  min-height: 40vh;
  display: grid;
  place-items: center;
  text-align: center;
  color: var(--text-muted);
}

@media (max-width: 920px) {
  .record-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup lang="ts">
import type { NoteView, TagMeta } from '@shared'

import TagChip from './TagChip.vue'

defineProps<{
  view: NoteView
  activeTags: string[]
  tags: TagMeta[]
}>()

defineEmits<{
  'set-view': [view: NoteView]
  'toggle-tag': [tag: string]
  'clear-tags': []
}>()

const views: Array<{ value: NoteView; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '未完成' },
  { value: 'completed', label: '已完成' },
  { value: 'important', label: '重要' },
  { value: 'today', label: '今天' },
  { value: 'week', label: '本周' },
  { value: 'overdue', label: '已逾期' },
  { value: 'archived', label: '已归档' },
  { value: 'trash', label: '回收站' },
]
</script>

<template>
  <section class="filter-wrap">
    <div class="view-tabs">
      <button
        v-for="item in views"
        :key="item.value"
        class="tab"
        :class="{ active: item.value === view }"
        :data-testid="`filter-${item.value}`"
        @click="$emit('set-view', item.value)"
      >
        {{ item.label }}
      </button>
    </div>

    <div class="tag-row">
      <TagChip
        v-for="tag in tags.slice(0, 10)"
        :key="tag.name"
        :label="`${tag.name} · ${tag.usageCount}`"
        :color="tag.color"
        :active="activeTags.includes(tag.name)"
        :pinned="tag.pinned"
        @click="$emit('toggle-tag', tag.name)"
      />
      <button v-if="activeTags.length" class="btn btn-ghost" data-testid="clear-tag-filters" @click="$emit('clear-tags')">清空标签筛选</button>
    </div>
  </section>
</template>

<style scoped>
.filter-wrap {
  display: grid;
  gap: 1rem;
}

.view-tabs,
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
}

.tab {
  padding: 0.6rem 0.95rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-muted);
}

.tab.active {
  color: white;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.16), rgba(56, 189, 248, 0.14));
  border-color: rgba(255, 255, 255, 0.18);
}
</style>

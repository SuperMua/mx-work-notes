<script setup lang="ts">
defineProps<{
  label: string
  color?: string
  active?: boolean
  pinned?: boolean
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <button class="tag-chip" :class="{ active }" @click="$emit('click')">
    <span class="tag-dot" :style="{ background: color || 'var(--accent)' }" />
    <span>{{ label }}</span>
    <span v-if="pinned" class="tag-pin">置顶</span>
  </button>
</template>

<style scoped>
.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-muted);
}

.tag-chip.active {
  border-color: rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.12);
  color: var(--text);
}

.tag-dot {
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 999px;
}

.tag-pin {
  font-size: 0.72rem;
  opacity: 0.72;
}
</style>

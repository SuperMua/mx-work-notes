<script setup lang="ts">
defineProps<{
  title: string
  copy: string
}>()
</script>

<template>
  <div class="empty-panel empty-state">
    <strong>{{ title }}</strong>
    <p>{{ copy }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty-state {
  min-height: 240px;
  display: grid;
  place-items: center;
  text-align: center;
  gap: 0.5rem;
}

.empty-state strong {
  font-size: 1.05rem;
  color: var(--heading);
}

.empty-state p {
  max-width: 420px;
  color: var(--text-muted);
  line-height: 1.7;
}
</style>

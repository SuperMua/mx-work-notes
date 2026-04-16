<script setup lang="ts">
defineProps<{
  kicker?: string
  title: string
  copy?: string
  tone?: 'section' | 'sheet' | 'inspector'
}>()
</script>

<template>
  <section
    class="panel surface-block"
    :class="{
      'surface-section': tone === 'section' || !tone,
      'surface-sheet': tone === 'sheet',
      'surface-inspector': tone === 'inspector',
    }"
  >
    <header class="section-head">
      <div class="section-head-main">
        <h2 class="section-title">{{ title }}</h2>
      </div>
      <div v-if="$slots.actions" class="page-actions">
        <slot name="actions" />
      </div>
    </header>

    <slot />
  </section>
</template>

<style scoped>
.surface-block {
  display: grid;
  gap: 1rem;
  padding: 1.25rem;
  border-radius: var(--radius-lg);
}
</style>

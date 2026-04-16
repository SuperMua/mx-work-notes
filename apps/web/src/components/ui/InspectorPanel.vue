<script setup lang="ts">
defineProps<{
  eyebrow?: string
  title?: string
  copy?: string
}>()
</script>

<template>
  <section class="surface-inspector inspector-panel">
    <header v-if="title || eyebrow || copy" class="section-head">
      <div class="section-head-main">
        <p v-if="eyebrow" class="section-kicker">{{ eyebrow }}</p>
        <h2 v-if="title" class="section-title">{{ title }}</h2>
        <p v-if="copy" class="section-copy">{{ copy }}</p>
      </div>
      <div v-if="$slots.actions" class="page-actions">
        <slot name="actions" />
      </div>
    </header>
    <slot />
  </section>
</template>

<style scoped>
.inspector-panel {
  display: grid;
  gap: 1.1rem;
  padding: 1.3rem;
  border-radius: var(--radius-xl);
}
</style>

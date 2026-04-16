<script setup lang="ts">
defineProps<{
  eyebrow?: string
  title?: string
  copy?: string
}>()
</script>

<template>
  <section class="surface-section hero-shell">
    <div v-if="title" class="hero-copy">
      <h2 class="hero-title">{{ title }}</h2>
    </div>

    <div v-if="$slots.metrics" class="hero-metrics">
      <slot name="metrics" />
    </div>

    <div v-if="$slots.default" class="hero-body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.hero-shell {
  padding: 1.4rem;
  border-radius: var(--radius-xl);
  display: grid;
  gap: 1.25rem;
}

.hero-copy {
  display: grid;
  gap: 0;
  max-width: 820px;
}

.hero-title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(1.9rem, 3vw, 3rem);
  line-height: 1.05;
  letter-spacing: -0.05em;
}

.hero-metrics,
.hero-body {
  display: grid;
  gap: 1rem;
}
</style>

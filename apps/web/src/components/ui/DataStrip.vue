<script setup lang="ts">
defineProps<{
  items: Array<{
    label: string
    value: string | number
    note?: string
  }>
}>()
</script>

<template>
  <section class="data-strip">
    <article v-for="item in items" :key="item.label" class="data-pill">
      <span class="label">{{ item.label }}</span>
      <strong>{{ item.value }}</strong>
    </article>
  </section>
</template>

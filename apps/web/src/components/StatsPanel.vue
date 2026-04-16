<script setup lang="ts">
defineProps<{
  stats: {
    total: number
    completed: number
    overdue: number
    dueToday: number
  }
}>()
</script>

<template>
  <section class="stats-grid">
    <article class="surface-sheet stat-card">
      <span>可执行便签</span>
      <strong>{{ stats.total }}</strong>
    </article>
    <article class="surface-sheet stat-card">
      <span>已完成</span>
      <strong>{{ stats.completed }}</strong>
    </article>
    <article class="surface-sheet stat-card danger">
      <span>已逾期</span>
      <strong>{{ stats.overdue }}</strong>
    </article>
    <article class="surface-sheet stat-card info">
      <span>今日到期</span>
      <strong>{{ stats.dueToday }}</strong>
    </article>
  </section>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.85rem;
}

.stat-card {
  padding: 1rem 1.05rem;
  border-radius: 24px;
  display: grid;
  gap: 0.35rem;
}

.stat-card span {
  color: var(--text-muted);
}

.stat-card strong {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 2rem;
  color: var(--heading);
}

.stat-card.danger strong {
  color: var(--danger);
}

.stat-card.info strong {
  color: var(--accent);
}

@media (max-width: 1080px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>

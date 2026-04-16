<template>
  <div class="toolbar-group">
    <slot />
  </div>
</template>

<style scoped>
.toolbar-group {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.65rem;
  padding: 0.35rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.38);
}

@media (max-width: 760px) {
  .toolbar-group {
    width: 100%;
    justify-content: flex-start;
    border-radius: var(--radius-md);
  }
}
</style>

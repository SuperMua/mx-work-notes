<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
  }>(),
  {
    size: 'lg',
  },
)

const emit = defineEmits<{
  close: []
}>()

function handleKeydown(event: KeyboardEvent) {
  if (props.open && event.key === 'Escape') {
    emit('close')
  }
}

watch(
  () => props.open,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
  },
  { immediate: true },
)

window.addEventListener('keydown', handleKeydown)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="open" class="dialog-backdrop" @click.self="emit('close')">
        <section class="dialog-card" :class="`size-${size}`" role="dialog" aria-modal="true">
          <header class="dialog-header">
            <h3>{{ title }}</h3>
            <button class="dialog-close" type="button" @click="emit('close')">关闭</button>
          </header>

          <div class="dialog-body">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="dialog-footer">
            <slot name="footer" />
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--mask) 88%, rgba(9, 12, 18, 0.28));
  backdrop-filter: blur(12px);
  display: grid;
  place-items: center;
  padding: 1.4rem;
  z-index: 120;
}

.dialog-card {
  width: min(100%, 960px);
  max-height: calc(100vh - 2.8rem);
  border-radius: 30px;
  border: 1px solid var(--border);
  background: var(--panel);
  box-shadow: var(--shadow-soft);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
}

.dialog-card.size-sm {
  max-width: 520px;
}

.dialog-card.size-md {
  max-width: 680px;
}

.dialog-card.size-lg {
  max-width: 920px;
}

.dialog-card.size-xl {
  max-width: 1160px;
}

.dialog-header,
.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 1.1rem 1.2rem;
  border-bottom: 1px solid var(--border);
}

.dialog-footer {
  justify-content: flex-end;
  flex-wrap: wrap;
  border-top: 1px solid var(--border);
  border-bottom: 0;
}

.dialog-header h3 {
  font-size: 1.1rem;
  color: var(--heading);
}

.dialog-close {
  min-height: 2.4rem;
  padding: 0 0.9rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
}

.dialog-body {
  padding: 1.2rem;
  overflow: auto;
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.dialog-fade-enter-from .dialog-card,
.dialog-fade-leave-to .dialog-card {
  transform: translateY(8px) scale(0.985);
}

@media (max-width: 900px) {
  .dialog-backdrop {
    padding: 0.8rem;
  }

  .dialog-card {
    max-height: calc(100vh - 1.6rem);
    border-radius: 24px;
  }

  .dialog-header,
  .dialog-body,
  .dialog-footer {
    padding: 1rem;
  }
}
</style>

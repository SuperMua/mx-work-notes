<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { Note } from '@shared'
import type SortableType from 'sortablejs'
import type { SortableEvent } from 'sortablejs'

const props = withDefaults(
  defineProps<{
    items: Note[]
    group?: string
    ghostClass?: string
  }>(),
  {
    group: 'notes-board',
    ghostClass: 'ghost-card',
  },
)

const emit = defineEmits<{
  change: [event: { added?: { element: { id: string }; newIndex: number }; moved?: { element: { id: string }; newIndex: number } }]
}>()

const laneRef = ref<HTMLElement | null>(null)

let sortable: SortableType | null = null

function buildPayload(event: SortableEvent) {
  const noteId = event.item instanceof HTMLElement ? event.item.dataset.boardId : undefined
  if (!noteId || event.newIndex == null) {
    return null
  }

  if (event.from === event.to) {
    return {
      moved: {
        element: { id: noteId },
        newIndex: event.newIndex,
      },
    }
  }

  return {
    added: {
      element: { id: noteId },
      newIndex: event.newIndex,
    },
  }
}

async function mountSortable() {
  if (!laneRef.value || sortable) {
    return
  }

  const host = laneRef.value
  const { default: Sortable } = await import('sortablejs')

  if (!laneRef.value || laneRef.value !== host) {
    return
  }

  sortable = Sortable.create(host, {
    animation: 180,
    group: props.group,
    ghostClass: props.ghostClass,
    draggable: '[data-board-id]',
    filter: 'button,input,textarea,select,label,a',
    preventOnFilter: false,
    onAdd(event) {
      const payload = buildPayload(event)
      if (payload) {
        emit('change', payload)
      }
    },
    onUpdate(event) {
      const payload = buildPayload(event)
      if (payload) {
        emit('change', payload)
      }
    },
  })
}

function destroySortable() {
  sortable?.destroy()
  sortable = null
}

onMounted(() => {
  void mountSortable()
})

watch(
  () => props.group,
  async () => {
    destroySortable()
    await nextTick()
    void mountSortable()
  },
)

onBeforeUnmount(() => {
  destroySortable()
})
</script>

<template>
  <div ref="laneRef" class="board-lane">
    <div v-for="(item, index) in items" :key="item.id" class="board-lane__item" :data-board-id="item.id">
      <slot name="item" :element="item" :index="index" />
    </div>
  </div>
</template>

<style scoped>
.board-lane {
  display: grid;
  align-content: start;
}

.board-lane__item {
  min-width: 0;
}
</style>

<script setup lang="ts">
import { computed } from 'vue'

import BoardLane from '@/components/board/BoardLane.vue'
import NoteCard from '@/components/NoteCard.vue'
import NotesToolbar from '@/components/NotesToolbar.vue'
import DataStrip from '@/components/ui/DataStrip.vue'
import SurfaceSection from '@/components/ui/SurfaceSection.vue'
import { useWorkspaceStore } from '@/stores/workspace'

const store = useWorkspaceStore()

const columns: Array<{ key: 'todo' | 'doing' | 'done'; label: string }> = [
  { key: 'todo', label: '待处理' },
  { key: 'doing', label: '进行中' },
  { key: 'done', label: '已完成' },
]

const summaryItems = computed(() => [
  { label: '待处理', value: store.boardColumns.todo.length, note: '需要开始推进的任务' },
  { label: '进行中', value: store.boardColumns.doing.length, note: '正在执行中的任务' },
  { label: '已完成', value: store.boardColumns.done.length, note: '已收口的任务' },
])

function editNote(id: string) {
  const note = store.notes.find((item) => item.id === id)
  if (note) {
    store.openEditor(note)
  }
}

function handleBoardChange(status: 'todo' | 'doing' | 'done', event: { added?: { element: { id: string }; newIndex: number }; moved?: { element: { id: string }; newIndex: number } }) {
  const payload = event.added || event.moved
  if (!payload) {
    return
  }
  store.moveBoardNote(payload.element.id, status, payload.newIndex)
}
</script>

<template>
  <section class="page-stack board-page">
    <NotesToolbar
      :query="store.searchQuery"
      :sort-mode="store.settings.defaultSort"
      :templates="store.templates"
      @update:query="store.setSearchQuery"
      @remember="store.rememberSearch"
      @sort="store.setSortMode"
      @create="store.openEditor()"
      @template="store.createFromTemplate"
      @import="store.openImportDialog()"
      @export="store.exportCurrent()"
      @palette="store.toggleCommandPalette()"
    />

    <SurfaceSection title="看板视图">
      <DataStrip :items="summaryItems" />
    </SurfaceSection>

    <section class="columns">
      <article v-for="column in columns" :key="column.key" class="surface-section column">
        <header class="column-head">
          <div>
            <h2>{{ column.label }}</h2>
          </div>
          <span class="pill">{{ store.boardColumns[column.key].length }}</span>
        </header>

        <BoardLane
          class="lane"
          :items="store.boardColumns[column.key]"
          group="notes-board"
          ghost-class="ghost-card"
          @change="handleBoardChange(column.key, $event)"
        >
          <template #item="{ element, index }">
            <NoteCard
              :note="element"
              :query="store.searchQuery"
              :selection-index="index"
              @edit="editNote"
              @complete="store.toggleNoteComplete"
              @trash="store.trashNote"
              @restore="store.restoreNote"
              @purge="store.purgeNote"
              @archive="store.archiveNote"
              @unarchive="store.unarchiveNote"
              @select="(id, i, shift) => store.toggleSelection(id, store.boardColumns[column.key].map((note) => note.id), i, shift)"
              @tag="store.toggleTag"
              @checklist="store.updateChecklistItem"
            />
          </template>
        </BoardLane>
      </article>
    </section>
  </section>
</template>

<style scoped>
.board-page {
  display: grid;
  gap: 1rem;
}

.columns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.column {
  padding: 1rem;
  border-radius: 30px;
}

.column-head {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 1rem;
}

.column-head h2 {
  margin: 0;
}

.lane {
  min-height: 320px;
  display: grid;
  align-content: start;
  gap: 0.85rem;
}

.ghost-card {
  opacity: 0.5;
}

@media (max-width: 1180px) {
  .columns {
    grid-template-columns: 1fr;
  }
}
</style>

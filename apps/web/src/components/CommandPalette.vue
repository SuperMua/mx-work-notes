<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CalendarDays, CircleUserRound, Command, KanbanSquare, LayoutGrid, Plus, WandSparkles, X } from 'lucide-vue-next'

import { useWorkspaceStore } from '@/stores/workspace'

const router = useRouter()
const store = useWorkspaceStore()
const query = ref('')

const commands = computed(() => {
  const items = [
    { id: 'new', label: '新建便签', icon: Plus, action: () => store.openEditor() },
    { id: 'dashboard', label: '打开工作台', icon: LayoutGrid, action: () => router.push('/dashboard') },
    { id: 'notes', label: '打开便签列表', icon: LayoutGrid, action: () => router.push('/notes') },
    { id: 'board', label: '打开看板视图', icon: KanbanSquare, action: () => router.push('/board') },
    { id: 'calendar', label: '打开日历视图', icon: CalendarDays, action: () => router.push('/calendar') },
    { id: 'login', label: '打开账号与同步', icon: CircleUserRound, action: () => router.push('/login') },
    ...store.templates.map((template) => ({
      id: template.id,
      label: `用模板创建：${template.name}`,
      icon: WandSparkles,
      action: () => store.createFromTemplate(template.id),
    })),
  ]

  if (!query.value.trim()) {
    return items
  }

  return items.filter((item) => item.label.toLowerCase().includes(query.value.toLowerCase()))
})

function run(action: () => void) {
  action()
  store.toggleCommandPalette(false)
  query.value = ''
}
</script>

<template>
  <Teleport to="body">
    <div v-if="store.commandPaletteOpen" class="overlay">
      <section class="surface-inspector palette">
        <header>
          <div class="label">
            <Command :size="16" />
            命令面板
          </div>
          <button class="icon-btn" @click="store.toggleCommandPalette(false)">
            <X :size="16" />
          </button>
        </header>

        <input v-model="query" class="field" placeholder="输入命令，例如：新建、看板、日历、模板" />

        <div class="list">
          <button v-for="command in commands" :key="command.id" class="command-row" @click="run(command.action)">
            <component :is="command.icon" :size="16" />
            <span>{{ command.label }}</span>
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 63;
  display: grid;
  place-items: start center;
  padding: 10vh 1.5rem 1.5rem;
  background: rgba(3, 7, 18, 0.38);
  backdrop-filter: blur(8px);
}

.palette {
  width: min(700px, 100%);
  border-radius: 28px;
  padding: 1rem;
  display: grid;
  gap: 0.9rem;
}

header,
.label,
.command-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

header {
  justify-content: space-between;
}

.list {
  display: grid;
  gap: 0.6rem;
}

.command-row {
  padding: 0.9rem 1rem;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.22);
  color: var(--text);
}

.command-row:hover {
  background: var(--surface-hover);
}
</style>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Download, Keyboard, Plus, Search, Upload, WandSparkles } from 'lucide-vue-next'

import type { AppSettings, Template } from '@shared'

const props = defineProps<{
  query: string
  sortMode: AppSettings['defaultSort']
  templates: Template[]
}>()

const emit = defineEmits<{
  'update:query': [value: string]
  remember: []
  sort: [value: AppSettings['defaultSort']]
  create: []
  template: [value: string]
  import: []
  export: []
  palette: []
}>()

const searchRef = ref<HTMLInputElement | null>(null)
const selectedTemplate = ref('')

const sortOptions = computed(() => [
  { value: 'smart', label: '智能排序' },
  { value: 'updated', label: '最近更新' },
  { value: 'due', label: '截止时间' },
  { value: 'title', label: '按标题排序' },
])

function focusSearch() {
  searchRef.value?.focus()
}

function onGlobalFocusSearch() {
  focusSearch()
}

function useTemplate() {
  if (selectedTemplate.value) {
    emit('template', selectedTemplate.value)
    selectedTemplate.value = ''
  }
}

onMounted(() => {
  window.addEventListener('smart-notes:focus-search', onGlobalFocusSearch)
})

onBeforeUnmount(() => {
  window.removeEventListener('smart-notes:focus-search', onGlobalFocusSearch)
})
</script>

<template>
  <section class="surface-section toolbar">
    <div class="toolbar-main">
      <div class="search-box">
        <Search :size="18" />
        <input
          ref="searchRef"
          data-testid="search-input"
          class="search-input"
          :value="query"
          placeholder="搜索标题、内容、清单项或标签"
          @input="emit('update:query', ($event.target as HTMLInputElement).value)"
          @keydown.enter="emit('remember')"
        />
      </div>

      <div class="toolbar-actions">
        <select class="select compact" data-testid="sort-select" :value="sortMode" @change="emit('sort', ($event.target as HTMLSelectElement).value as AppSettings['defaultSort'])">
          <option v-for="option in sortOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>

        <div class="template-box">
          <select v-model="selectedTemplate" class="select compact" data-testid="template-select">
            <option value="">从模板创建</option>
            <option v-for="template in props.templates" :key="template.id" :value="template.id">
              {{ template.name }}
            </option>
          </select>
          <button class="btn btn-secondary" data-testid="use-template" @click="useTemplate">
            <WandSparkles :size="16" />
            使用模板
          </button>
        </div>

        <button class="btn btn-secondary" data-testid="open-command-palette" @click="emit('palette')">
          <Keyboard :size="16" />
          命令面板
        </button>
        <button class="btn btn-secondary" data-testid="open-import-dialog" @click="emit('import')">
          <Upload :size="16" />
          导入
        </button>
        <button class="btn btn-secondary" data-testid="export-notes" @click="emit('export')">
          <Download :size="16" />
          导出
        </button>
        <button class="btn btn-primary" data-testid="create-note" @click="emit('create')">
          <Plus :size="16" />
          新建便签
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.toolbar {
  padding: 1rem 1.05rem;
  border-radius: 30px;
}

.toolbar-main,
.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.toolbar-main {
  justify-content: space-between;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 50px;
  min-width: min(460px, 100%);
  padding: 0 1rem;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.38);
  color: var(--text-muted);
}

.search-input {
  flex: 1;
  border: 0;
  background: transparent;
  color: var(--text);
  outline: none;
}

.compact {
  width: auto;
  min-width: 160px;
}

.template-box {
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
}

@media (max-width: 960px) {
  .search-box,
  .template-box {
    min-width: 100%;
    width: 100%;
  }
}
</style>

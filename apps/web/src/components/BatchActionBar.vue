<script setup lang="ts">
import { ref } from 'vue'

const tagsInput = ref('')

const emit = defineEmits<{
  complete: [value: boolean]
  pin: [value: boolean]
  priority: [value: 'high' | 'normal' | 'low']
  archive: []
  trash: []
  restore: []
  tags: [value: string]
  clear: []
}>()

function submitTags() {
  emit('tags', tagsInput.value)
  tagsInput.value = ''
}
</script>

<template>
  <section class="surface-sheet batch-bar" data-testid="batch-action-bar">
    <div class="copy">
      <strong>批量操作</strong>
      <span>当前已选中多条便签，可一次性完成置顶、优先级、标签、归档与回收站操作。</span>
    </div>

    <div class="actions">
      <button class="btn btn-secondary" data-testid="batch-complete" @click="emit('complete', true)">批量完成</button>
      <button class="btn btn-secondary" data-testid="batch-uncomplete" @click="emit('complete', false)">取消完成</button>
      <button class="btn btn-secondary" data-testid="batch-pin" @click="emit('pin', true)">置顶</button>
      <button class="btn btn-secondary" data-testid="batch-unpin" @click="emit('pin', false)">取消置顶</button>
      <button class="btn btn-secondary" data-testid="batch-priority-high" @click="emit('priority', 'high')">高优先级</button>
      <button class="btn btn-secondary" data-testid="batch-priority-normal" @click="emit('priority', 'normal')">普通优先级</button>
      <button class="btn btn-secondary" data-testid="batch-priority-low" @click="emit('priority', 'low')">低优先级</button>
      <button class="btn btn-secondary" data-testid="batch-archive" @click="emit('archive')">归档</button>
      <button class="btn btn-secondary" data-testid="batch-restore" @click="emit('restore')">恢复</button>
      <button class="btn btn-danger" data-testid="batch-trash" @click="emit('trash')">移入回收站</button>

      <div class="tag-box">
        <input v-model="tagsInput" class="field" data-testid="batch-tags-input" placeholder="批量追加标签，例如：发布, 重要" />
        <button class="btn btn-primary" data-testid="batch-tags-apply" @click="submitTags">应用标签</button>
      </div>

      <button class="btn btn-ghost" data-testid="batch-clear" @click="emit('clear')">清空选择</button>
    </div>
  </section>
</template>

<style scoped>
.batch-bar {
  padding: 1rem 1.1rem;
  border-radius: 30px;
  display: grid;
  gap: 1rem;
}

.copy {
  display: grid;
  gap: 0.2rem;
}

.copy span {
  color: var(--text-muted);
  line-height: 1.6;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.tag-box {
  display: flex;
  gap: 0.65rem;
  min-width: min(480px, 100%);
}

@media (max-width: 900px) {
  .tag-box {
    min-width: 100%;
    flex-direction: column;
  }
}
</style>

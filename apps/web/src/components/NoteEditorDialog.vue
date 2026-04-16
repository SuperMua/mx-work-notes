<script setup lang="ts">
import { computed } from 'vue'
import { Plus, Sparkles, X } from 'lucide-vue-next'

import { useWorkspaceStore } from '@/stores/workspace'

const store = useWorkspaceStore()

const tagsInput = computed({
  get: () => store.editorDraft.tags.join(', '),
  set: (value: string) => {
    store.editorDraft.tags = value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  },
})

const dueDateInput = computed({
  get: () => (store.editorDraft.dueDate ? store.editorDraft.dueDate.slice(0, 16) : ''),
  set: (value: string) => {
    store.editorDraft.dueDate = value ? new Date(value).toISOString() : null
  },
})

const remindInput = computed({
  get: () => (store.editorDraft.remindAt ? store.editorDraft.remindAt.slice(0, 16) : ''),
  set: (value: string) => {
    store.editorDraft.remindAt = value ? new Date(value).toISOString() : null
  },
})

function addChecklist() {
  store.addChecklistItem()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade-up">
      <div v-if="store.editorOpen" class="overlay" data-testid="editor-overlay">
        <section class="surface-inspector editor" data-testid="editor-dialog">
          <header class="editor-head">
            <div class="title-block">
              <h2><Sparkles :size="18" /> {{ store.editingNoteId ? '编辑便签' : '新建便签' }}</h2>
            </div>
            <button class="icon-btn" type="button" aria-label="关闭编辑器" @click="store.closeEditor()">
              <X :size="16" />
            </button>
          </header>

          <div class="editor-body">
            <div class="editor-grid">
              <section class="main-column">
                <label>
                  <span>标题</span>
                  <input
                    v-model="store.editorDraft.title"
                    class="field"
                    data-testid="editor-title"
                    placeholder="例如：发布前检查 / 周会纪要 / 学习计划"
                  />
                </label>

                <label>
                  <span>标签</span>
                  <input v-model="tagsInput" class="field" data-testid="editor-tags" placeholder="工作, 重要, 复盘" />
                </label>

                <label v-if="store.editorDraft.type === 'note'">
                  <span>内容</span>
                  <textarea
                    v-model="store.editorDraft.content"
                    class="textarea editor-textarea"
                    data-testid="editor-content"
                    placeholder="记录上下文、行动项或复盘要点"
                  />
                </label>

                <section v-else class="checklist-box">
                  <header class="checklist-head">
                    <h3>清单项目</h3>
                    <button class="btn btn-secondary" data-testid="editor-add-checklist" type="button" @click="addChecklist">
                      <Plus :size="16" />
                      添加子任务
                    </button>
                  </header>

                  <div class="checklist-editor">
                    <div
                      v-for="(item, index) in store.editorDraft.checklist"
                      :key="item.id"
                      class="check-row"
                      :data-testid="`editor-checklist-row-${index}`"
                    >
                      <input v-model="item.completed" :data-testid="`editor-checklist-complete-${index}`" type="checkbox" />
                      <input
                        v-model="item.text"
                        class="field"
                        :data-testid="`editor-checklist-text-${index}`"
                        placeholder="输入任务内容"
                      />
                      <button
                        class="icon-btn"
                        :aria-label="`删除清单项 ${index + 1}`"
                        :data-testid="`editor-checklist-remove-${index}`"
                        type="button"
                        @click="store.removeChecklistItem(item.id)"
                      >
                        <X :size="14" />
                      </button>
                    </div>
                  </div>
                </section>
              </section>

              <aside class="meta-column">
                <section class="meta-section">
                  <h3>元信息</h3>
                  <div class="meta-grid">
                    <label>
                      <span>优先级</span>
                      <select v-model="store.editorDraft.priority" class="select" data-testid="editor-priority">
                        <option value="high">高优先级</option>
                        <option value="normal">普通优先级</option>
                        <option value="low">低优先级</option>
                      </select>
                    </label>
                    <label>
                      <span>状态</span>
                      <select v-model="store.editorDraft.status" class="select" data-testid="editor-status">
                        <option value="todo">待处理</option>
                        <option value="doing">进行中</option>
                        <option value="done">已完成</option>
                      </select>
                    </label>
                    <label>
                      <span>截止时间</span>
                      <input v-model="dueDateInput" class="field" data-testid="editor-due-date" type="datetime-local" />
                    </label>
                    <label>
                      <span>提醒时间</span>
                      <input v-model="remindInput" class="field" data-testid="editor-remind-at" type="datetime-local" />
                    </label>
                  </div>
                </section>

                <section class="meta-section">
                  <h3>工作模式</h3>
                  <div class="switches">
                    <label class="switch">
                      <input v-model="store.editorDraft.pinned" data-testid="editor-pinned" type="checkbox" />
                      <span>置顶便签</span>
                    </label>
                    <label class="switch">
                      <input
                        v-model="store.editorDraft.type"
                        data-testid="editor-type-toggle"
                        true-value="checklist"
                        false-value="note"
                        type="checkbox"
                      />
                      <span>{{ store.editorDraft.type === 'checklist' ? '清单模式' : '普通便签' }}</span>
                    </label>
                  </div>
                </section>

                <section class="meta-section palette-block">
                  <div class="palette-head">
                    <span>便签配色</span>
                  </div>
                  <div class="palette">
                    <button
                      v-for="color in ['#f7f9fc', '#f6f3ff', '#eef5ff', '#eefbf5', '#fff5ef', '#fff3f3']"
                      :key="color"
                      class="swatch"
                      :class="{ active: store.editorDraft.color === color }"
                      :style="{ background: color }"
                      :data-testid="`editor-color-${color.replace('#', '')}`"
                      :title="`选择颜色 ${color}`"
                      type="button"
                      @click="store.editorDraft.color = color"
                    />
                  </div>
                </section>
              </aside>
            </div>
          </div>

          <footer class="editor-foot">
            <button class="btn btn-ghost" data-testid="editor-cancel" type="button" @click="store.closeEditor()">取消</button>
            <button class="btn btn-primary" data-testid="editor-save" type="button" @click="store.saveNote()">保存便签</button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: grid;
  place-items: center;
  padding: clamp(1rem, 2.8vw, 2rem);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--mask) 88%, transparent), var(--mask)),
    radial-gradient(circle at top left, color-mix(in srgb, var(--accent-soft) 58%, transparent), transparent 40%);
  backdrop-filter: blur(18px);
}

.editor {
  width: min(1140px, 100%);
  max-height: min(calc(100vh - 2rem), 940px);
  border-radius: 38px;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
}

.editor-head,
.editor-foot {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.editor-head {
  justify-content: space-between;
  padding: 1.35rem 1.45rem 1rem;
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--inspector) 92%, transparent);
}

.editor-body {
  min-height: 0;
  overflow: auto;
  padding: 1.2rem 1.45rem 0;
}

.editor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.18fr) 288px;
  gap: 1rem;
}

.main-column,
.meta-column,
.meta-grid,
.checklist-editor,
label {
  display: grid;
  gap: 0.85rem;
}

.meta-column {
  align-content: start;
}

.meta-section,
.palette-block,
.checklist-box {
  padding: 1rem 1.05rem;
  border-radius: 24px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--sheet) 90%, transparent);
}

.meta-section h3 {
  margin: 0 0 0.75rem;
  font-size: 0.92rem;
}

.editor-textarea {
  min-height: 360px;
}

.editor-foot {
  justify-content: flex-end;
  padding: 1rem 1.45rem 1.25rem;
  border-top: 1px solid var(--line);
  background: color-mix(in srgb, var(--inspector) 94%, transparent);
  position: sticky;
  bottom: 0;
}

.editor-foot .btn {
  min-width: 118px;
}

.title-block h2 {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(1.7rem, 3vw, 2.4rem);
  line-height: 1.05;
  letter-spacing: -0.04em;
}

label > span,
.palette-head span {
  color: var(--heading);
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.switches {
  display: grid;
  gap: 0.75rem;
}

.switch {
  min-height: 56px;
  padding: 0 1rem;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface-strong) 86%, transparent);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.switch input {
  width: 1rem;
  height: 1rem;
}

.palette {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.swatch {
  width: 2.35rem;
  height: 2.35rem;
  border-radius: 999px;
  border: 2px solid transparent;
  box-shadow:
    inset 0 0 0 1px rgba(15, 23, 42, 0.08),
    0 10px 18px rgba(15, 23, 42, 0.08);
  transition:
    transform var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.swatch:hover {
  transform: translateY(-1px);
}

.swatch.active {
  border-color: var(--accent);
  box-shadow:
    inset 0 0 0 1px rgba(15, 23, 42, 0.08),
    0 14px 24px rgba(15, 23, 42, 0.12);
  transform: translateY(-1px) scale(1.04);
}

.checklist-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.checklist-head h3 {
  margin: 0;
  color: var(--heading);
}

.check-row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.72rem 0.8rem;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface-strong) 80%, transparent);
}

.check-row input[type='checkbox'] {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

@media (max-width: 960px) {
  .overlay {
    padding: 0;
  }

  .editor {
    width: 100%;
    max-width: none;
    max-height: 100vh;
    height: 100vh;
    border-radius: 0;
  }

  .editor-grid {
    grid-template-columns: 1fr;
  }

  .editor-head,
  .editor-foot {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .editor-body {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

@media (max-width: 760px) {
  .overlay {
    align-items: stretch;
  }

  .editor {
    animation: mobile-slide-in var(--transition-slow);
  }

  .checklist-head,
  .editor-head {
    flex-direction: column;
    align-items: stretch;
  }

  .editor-foot {
    flex-direction: column-reverse;
    align-items: stretch;
    padding-bottom: calc(1rem + env(safe-area-inset-bottom));
  }

  .editor-foot .btn {
    width: 100%;
  }
}

@keyframes mobile-slide-in {
  from {
    transform: translateX(100%);
  }

  to {
    transform: translateX(0);
  }
}
</style>

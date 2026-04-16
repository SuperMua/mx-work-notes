<script setup lang="ts">
import { computed } from 'vue'
import { FileJson2, X } from 'lucide-vue-next'

import { useWorkspaceStore } from '@/stores/workspace'

const store = useWorkspaceStore()

const previewNotes = computed(() => store.importPreview?.notes.slice(0, 8) || [])
</script>

<template>
  <Teleport to="body">
    <Transition name="fade-up">
      <div v-if="store.importDialogOpen" class="overlay" data-testid="import-overlay">
        <section class="surface-inspector dialog" data-testid="import-dialog">
          <header class="dialog-head">
            <div class="title-block">
              <h2><FileJson2 :size="18" /> 导入 JSON 数据</h2>
            </div>
            <button class="icon-btn" aria-label="关闭导入对话框" @click="store.closeImportDialog()">
              <X :size="16" />
            </button>
          </header>

          <div class="dialog-grid">
            <section class="input-panel">
              <textarea
                v-model="store.importText"
                class="textarea import-area"
                data-testid="import-text"
                placeholder="粘贴导出的 JSON 数据，系统会先生成预览和冲突清单。"
              />

              <div class="toolbar">
                <button class="btn btn-secondary" data-testid="import-preview" @click="store.previewImport()">生成预览</button>
                <select v-model="store.importStrategy" class="select compact" data-testid="import-strategy">
                  <option value="newer">同 ID 保留更新时间较新的记录</option>
                  <option value="prefer-import">优先导入数据</option>
                  <option value="prefer-local">优先本地数据</option>
                  <option value="keep-both">保留双方并生成副本</option>
                </select>
                <button class="btn btn-primary" data-testid="import-confirm" :disabled="!store.importPreview" @click="store.confirmImport()">确认导入</button>
              </div>
            </section>

            <section class="preview-panel" data-testid="import-preview-result">
              <div class="summary-row">
                <article class="summary-card">
                  <span>待处理记录</span>
                  <strong>{{ store.importPreview?.notes.length || 0 }}</strong>
                </article>
                <article class="summary-card">
                  <span>冲突数量</span>
                  <strong>{{ store.importPreview?.conflicts.length || 0 }}</strong>
                </article>
              </div>

              <div class="strategy-card">
                <span>当前策略</span>
                <strong>
                  {{
                    store.importStrategy === 'newer'
                      ? '保留较新版本'
                      : store.importStrategy === 'prefer-import'
                        ? '优先导入'
                        : store.importStrategy === 'prefer-local'
                          ? '优先本地'
                          : '保留双方'
                  }}
                </strong>
              </div>

              <div class="preview-list">
                <div v-if="previewNotes.length" class="preview-block">
                  <h3>导入预览</h3>
                  <ul class="preview-items">
                    <li v-for="note in previewNotes" :key="note.id">
                      <strong>{{ note.title }}</strong>
                      <span>{{ note.tags.join(' / ') || '无标签' }}</span>
                    </li>
                  </ul>
                </div>

                <div v-if="store.importPreview?.conflicts.length" class="preview-block">
                  <h3>冲突摘要</h3>
                  <ul class="preview-items">
                    <li v-for="conflict in store.importPreview.conflicts.slice(0, 6)" :key="conflict.incoming.id">
                      <strong>{{ conflict.incoming.title }}</strong>
                      <span>本地：{{ conflict.existing.updatedAt }}</span>
                      <span>导入：{{ conflict.incoming.updatedAt }}</span>
                    </li>
                  </ul>
                </div>

                <div v-if="!store.importPreview" class="empty-block">
                  <strong>生成预览后，这里会显示导入数量、冲突结果和最终策略。</strong>
                </div>
              </div>
            </section>
          </div>

          <footer class="dialog-foot">
            <button class="btn btn-ghost" @click="store.closeImportDialog()">取消</button>
            <button class="btn btn-primary" :disabled="!store.importPreview" @click="store.confirmImport()">开始导入</button>
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
  z-index: 71;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--mask) 90%, transparent), var(--mask)),
    radial-gradient(circle at top left, color-mix(in srgb, var(--accent-soft) 54%, transparent), transparent 40%);
  backdrop-filter: blur(14px);
}

.dialog {
  width: min(1120px, 100%);
  max-height: min(calc(100vh - 2rem), 920px);
  border-radius: 34px;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
}

.dialog-head,
.toolbar,
.dialog-foot {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  align-items: center;
  flex-wrap: wrap;
}

.dialog-head {
  padding: 1.3rem 1.4rem 1rem;
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--inspector) 92%, transparent);
}

.title-block h2 {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(1.55rem, 2.8vw, 2.2rem);
  letter-spacing: -0.04em;
}

.dialog-grid {
  min-height: 0;
  overflow: auto;
  padding: 1.2rem 1.4rem 0;
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) 340px;
  gap: 1rem;
}

.input-panel,
.preview-panel {
  border: 1px solid var(--border);
  border-radius: 26px;
  background: color-mix(in srgb, var(--panel-bg) 86%, transparent);
  padding: 1rem;
  display: grid;
  gap: 1rem;
}

.import-area {
  min-height: 380px;
}

.summary-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.summary-card,
.strategy-card {
  border: 1px solid var(--border);
  border-radius: 22px;
  background: color-mix(in srgb, var(--surface-strong) 88%, transparent);
  padding: 1rem;
  display: grid;
  gap: 0.22rem;
}

.summary-card span,
.strategy-card span {
  color: var(--text-soft);
  font-size: 0.8rem;
  letter-spacing: 0.08em;
}

.summary-card strong,
.strategy-card strong {
  color: var(--heading);
}

.preview-list {
  display: grid;
  gap: 0.9rem;
  align-content: start;
}

.preview-block {
  display: grid;
  gap: 0.75rem;
}

.preview-block h3 {
  margin: 0;
  color: var(--heading);
  font-size: 1rem;
}

.preview-items {
  list-style: none;
  display: grid;
  gap: 0.7rem;
  margin: 0;
  padding: 0;
}

.preview-items li {
  display: grid;
  gap: 0.14rem;
  padding: 0.9rem 1rem;
  border-radius: 18px;
  background: color-mix(in srgb, var(--surface-strong) 82%, transparent);
  color: var(--text-muted);
}

.empty-block {
  min-height: 180px;
  display: grid;
  place-items: center;
  text-align: center;
  color: var(--text-muted);
  border: 1px dashed var(--border-strong);
  border-radius: 22px;
}

.dialog-foot {
  justify-content: flex-end;
  padding: 1rem 1.4rem 1.2rem;
  border-top: 1px solid var(--line);
  background: color-mix(in srgb, var(--inspector) 94%, transparent);
}

.compact {
  width: auto;
  min-width: 240px;
}

@media (max-width: 900px) {
  .dialog-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .overlay {
    padding: 0;
    align-items: stretch;
  }

  .dialog {
    width: 100%;
    max-height: 100vh;
    height: 100vh;
    border-radius: 0;
  }

  .dialog-head,
  .dialog-grid,
  .dialog-foot {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .dialog-foot {
    flex-direction: column-reverse;
    align-items: stretch;
    padding-bottom: calc(1rem + env(safe-area-inset-bottom));
  }

  .summary-row {
    grid-template-columns: 1fr;
  }

  .compact {
    width: 100%;
  }
}
</style>

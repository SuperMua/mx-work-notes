<script setup lang="ts">
import { computed } from 'vue'
import { EXPORT_FORMAT_LABELS, NOTIFICATION_STATE_LABELS } from '@shared'

import SurfaceSection from '@/components/ui/SurfaceSection.vue'
import { useWorkspaceStore } from '@/stores/workspace'

const store = useWorkspaceStore()

const themes = [
  {
    value: 'light-workbench',
    label: '浅色工作台',
  },
  {
    value: 'dark-workbench',
    label: '深色工作台',
  },
] as const

const exportFormats = computed(() => [
  { value: 'json', label: EXPORT_FORMAT_LABELS.json },
  { value: 'markdown', label: EXPORT_FORMAT_LABELS.markdown },
  { value: 'txt', label: EXPORT_FORMAT_LABELS.txt },
])
</script>

<template>
  <section class="page-stack settings-page">
    <SurfaceSection title="工作流默认项">
      <div class="workflow-grid">
        <label class="setting-card">
          <span>默认视图</span>
          <select class="select" :value="store.settings.defaultView" @change="store.saveSettings({ defaultView: ($event.target as HTMLSelectElement).value as 'dashboard' | 'notes' | 'board' | 'calendar' })">
            <option value="dashboard">工作台</option>
            <option value="notes">便签列表</option>
            <option value="board">看板</option>
            <option value="calendar">日历</option>
          </select>
        </label>

        <label class="setting-card">
          <span>默认优先级</span>
          <select class="select" :value="store.settings.defaultPriority" @change="store.saveSettings({ defaultPriority: ($event.target as HTMLSelectElement).value as 'high' | 'normal' | 'low' })">
            <option value="high">高优先级</option>
            <option value="normal">普通优先级</option>
            <option value="low">低优先级</option>
          </select>
        </label>

        <label class="setting-card">
          <span>默认排序</span>
          <select class="select" :value="store.settings.defaultSort" @change="store.setSortMode(($event.target as HTMLSelectElement).value as 'smart' | 'updated' | 'due' | 'title')">
            <option value="smart">智能排序</option>
            <option value="updated">最近更新</option>
            <option value="due">截止时间</option>
            <option value="title">按标题</option>
          </select>
        </label>

        <label class="setting-card">
          <span>默认导出格式</span>
          <select class="select" :value="store.settings.exportFormat" @change="store.saveSettings({ exportFormat: ($event.target as HTMLSelectElement).value as 'json' | 'markdown' | 'txt' })">
            <option v-for="item in exportFormats" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
      </div>
    </SurfaceSection>

    <SurfaceSection title="主题预览">
      <div class="theme-grid">
        <button
          v-for="theme in themes"
          :key="theme.value"
          class="theme-card"
          :class="{ active: store.settings.theme === theme.value }"
          :data-testid="`theme-${theme.value}`"
          @click="store.setTheme(theme.value)"
        >
          <div class="theme-preview" :class="theme.value">
            <aside class="preview-rail">
              <span class="rail-mark">MX</span>
              <span class="rail-line short" />
              <span class="rail-line" />
            </aside>
            <div class="preview-main">
              <div class="preview-header">
                <span class="preview-title" />
                <span class="preview-button" />
              </div>
              <div class="preview-layout">
                <div class="preview-list">
                  <span class="preview-row active" />
                  <span class="preview-row" />
                  <span class="preview-row" />
                </div>
                <div class="preview-detail">
                  <span class="detail-title" />
                  <span class="detail-line long" />
                  <span class="detail-line" />
                  <div class="detail-bottom">
                    <span class="detail-chip" />
                    <span class="detail-input" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <strong>{{ theme.label }}</strong>
        </button>
      </div>
    </SurfaceSection>

    <div class="settings-split">
      <SurfaceSection title="通知状态">
        <div class="notice-box">
          <span class="pill">当前权限：{{ NOTIFICATION_STATE_LABELS[store.settings.notificationPermission] }}</span>
          <button class="btn btn-secondary" @click="store.requestNotificationPermission()">请求浏览器通知权限</button>
        </div>
      </SurfaceSection>

      <SurfaceSection title="标签风格库">
        <div class="tag-list">
          <div v-for="tag in store.tagInsights" :key="tag.name" class="tag-row">
            <div class="tag-copy">
              <strong>{{ tag.name }}</strong>
              <span>{{ tag.usageCount }} 次</span>
            </div>
            <div class="tag-actions">
              <input :value="tag.color" type="color" @input="store.updateTagColor(tag.name, ($event.target as HTMLInputElement).value)" />
              <button class="btn btn-ghost mini" @click="store.togglePinnedTag(tag.name)">
                {{ tag.pinned ? '取消常用' : '设为常用' }}
              </button>
            </div>
          </div>
        </div>
      </SurfaceSection>
    </div>
  </section>
</template>

<style scoped>
.settings-page {
  display: grid;
  gap: 1rem;
}

.workflow-grid,
.theme-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.setting-card,
.theme-card,
.notice-box,
.tag-row {
  border: 1px solid var(--border);
  border-radius: 28px;
  background: color-mix(in srgb, var(--panel-bg) 86%, transparent);
}

.setting-card,
.tag-row {
  padding: 1rem 1.05rem;
  display: grid;
  gap: 0.7rem;
}

.setting-card span {
  color: var(--heading);
  font-size: 0.9rem;
  font-weight: 600;
}

.theme-card {
  padding: 1rem;
  display: grid;
  gap: 0.8rem;
  text-align: left;
}

.theme-card.active {
  border-color: var(--selection-border);
  box-shadow: 0 0 0 1px var(--selection-border);
}

.theme-preview {
  height: 210px;
  border-radius: 24px;
  padding: 1rem;
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 0.9rem;
  border: 1px solid transparent;
}

.theme-preview.light-workbench {
  background: linear-gradient(180deg, #f8f5ef 0%, #efe7db 100%);
  border-color: rgba(78, 66, 44, 0.12);
}

.theme-preview.dark-workbench {
  background: linear-gradient(180deg, #141922 0%, #10141b 100%);
  border-color: rgba(255, 255, 255, 0.1);
}

.preview-rail,
.preview-main,
.preview-layout,
.preview-list,
.preview-detail {
  display: grid;
  gap: 0.75rem;
}

.preview-rail {
  align-content: start;
  padding: 0.8rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.28);
}

.dark-workbench .preview-rail {
  background: rgba(255, 255, 255, 0.08);
}

.rail-mark {
  display: inline-grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.8rem;
  background: rgba(47, 72, 111, 0.18);
  color: #2f486f;
  font-family: var(--font-display);
  font-weight: 700;
}

.dark-workbench .rail-mark {
  background: rgba(154, 174, 212, 0.18);
  color: #d5e0f4;
}

.rail-line,
.preview-title,
.preview-button,
.preview-row,
.detail-title,
.detail-line,
.detail-chip,
.detail-input {
  border-radius: 999px;
}

.rail-line,
.preview-row,
.detail-line,
.detail-input {
  height: 10px;
  background: rgba(47, 72, 111, 0.12);
}

.dark-workbench .rail-line,
.dark-workbench .preview-row,
.dark-workbench .detail-line,
.dark-workbench .detail-input {
  background: rgba(154, 174, 212, 0.18);
}

.rail-line.short {
  width: 70%;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
}

.preview-title {
  width: 42%;
  height: 14px;
  background: rgba(47, 72, 111, 0.18);
}

.preview-button {
  width: 74px;
  height: 30px;
  background: rgba(47, 72, 111, 0.26);
}

.dark-workbench .preview-title,
.dark-workbench .preview-button {
  background: rgba(154, 174, 212, 0.24);
}

.preview-layout {
  grid-template-columns: 1fr 1.12fr;
}

.preview-list,
.preview-detail {
  padding: 0.8rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.28);
}

.dark-workbench .preview-list,
.dark-workbench .preview-detail {
  background: rgba(255, 255, 255, 0.08);
}

.preview-row {
  height: 42px;
}

.preview-row.active {
  background: rgba(47, 72, 111, 0.24);
}

.dark-workbench .preview-row.active {
  background: rgba(154, 174, 212, 0.3);
}

.detail-title {
  width: 68%;
  height: 14px;
  background: rgba(47, 72, 111, 0.22);
}

.dark-workbench .detail-title {
  background: rgba(154, 174, 212, 0.26);
}

.detail-line.long {
  width: 92%;
}

.detail-bottom {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.detail-chip {
  width: 82px;
  height: 30px;
  background: rgba(47, 72, 111, 0.16);
}

.detail-input {
  flex: 1;
  height: 30px;
}

.dark-workbench .detail-chip {
  background: rgba(154, 174, 212, 0.18);
}

.settings-split {
  display: grid;
  grid-template-columns: minmax(0, 0.72fr) minmax(0, 1.28fr);
  gap: 1rem;
}

.notice-box {
  padding: 1rem 1.05rem;
  display: grid;
  gap: 1rem;
}

.tag-list {
  display: grid;
  gap: 0.75rem;
}

.tag-row,
.tag-actions {
  display: flex;
  gap: 0.8rem;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}

.tag-copy {
  display: grid;
  gap: 0.16rem;
}

.tag-copy span {
  color: var(--text-muted);
}

.mini {
  min-height: 36px;
  padding-inline: 0.9rem;
}

@media (max-width: 1120px) {
  .settings-split {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 960px) {
  .workflow-grid,
  .theme-grid,
  .preview-layout {
    grid-template-columns: 1fr;
  }
}
</style>

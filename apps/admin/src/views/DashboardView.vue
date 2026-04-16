<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { AdminDashboardMetrics, AdminRecentItem, AdminTrendPoint } from '@shared'

import { useAdminAuthStore } from '@/stores/auth'

const authStore = useAdminAuthStore()
const router = useRouter()
const metrics = ref<AdminDashboardMetrics | null>(null)
const loading = ref(false)
const message = ref('')

function normalizeMetrics(payload: Partial<AdminDashboardMetrics>): AdminDashboardMetrics {
  return {
    users: payload.users ?? 0,
    workspaces: payload.workspaces ?? 0,
    members: payload.members ?? 0,
    notes: payload.notes ?? 0,
    templates: payload.templates ?? 0,
    tags: payload.tags ?? 0,
    completedNotes: payload.completedNotes ?? 0,
    overdueNotes: payload.overdueNotes ?? 0,
    trashedNotes: payload.trashedNotes ?? 0,
    conflicts: payload.conflicts ?? 0,
    statusDistribution: payload.statusDistribution ?? [],
    noteTrend7Days: payload.noteTrend7Days ?? [],
    noteTrend30Days: payload.noteTrend30Days ?? [],
    workspaceRanking: payload.workspaceRanking ?? [],
    topTags: payload.topTags ?? [],
    riskWorkspaces: payload.riskWorkspaces ?? [],
    recentConflicts: payload.recentConflicts ?? [],
    recentUsers: payload.recentUsers ?? [],
    recentWorkspaces: payload.recentWorkspaces ?? [],
  }
}

const headlineStats = computed(() => {
  if (!metrics.value) {
    return []
  }

  return [
    { label: '账号数', value: metrics.value.users, hint: '进入账号管理', path: '/users', query: {} },
    { label: '工作区数', value: metrics.value.workspaces, hint: '查看工作区', path: '/workspaces', query: {} },
    { label: '便签总数', value: metrics.value.notes, hint: '查看活跃便签', path: '/notes', query: { state: 'active' } },
    { label: '同步冲突', value: metrics.value.conflicts, hint: '打开同步监控', path: '/sync', query: {} },
  ]
})

const heroTotal = computed(() => metrics.value?.notes ?? 0)
const overviewSignals = computed(() => {
  if (!metrics.value) {
    return []
  }

  return [
    { label: '已完成', value: metrics.value.completedNotes },
    { label: '已逾期', value: metrics.value.overdueNotes },
    { label: '回收站', value: metrics.value.trashedNotes },
  ]
})

const trendPanels = computed(() => {
  if (!metrics.value) {
    return [] as Array<{
      key: string
      title: string
      points: AdminTrendPoint[]
      dense: boolean
    }>
  }

  return [
    {
      key: 'trend-7d',
      title: '近 7 天新增趋势',
      points: metrics.value.noteTrend7Days,
      dense: false,
    },
    {
      key: 'trend-30d',
      title: '近 30 天新增趋势',
      points: metrics.value.noteTrend30Days,
      dense: true,
    },
  ]
})

const primaryTrendPanel = computed(() => trendPanels.value[0] ?? null)
const secondaryTrendPanel = computed(() => trendPanels.value[1] ?? null)

const activityFeed = computed(() => {
  if (!metrics.value) {
    return [] as Array<AdminRecentItem & { path: string; query?: Record<string, string> }>
  }

  return [...metrics.value.recentConflicts, ...metrics.value.recentUsers, ...metrics.value.recentWorkspaces]
    .map((item) => ({
      ...item,
      ...(item.kind === 'user'
        ? { path: '/users', query: { focus: item.id } }
        : item.kind === 'workspace'
          ? { path: '/workspaces', query: { focus: item.id } }
          : { path: '/sync', query: { focus: item.id, workspaceId: item.workspaceId || '' } }),
    }))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 8)
})

function trendMax(points: AdminTrendPoint[]) {
  return Math.max(...points.map((point) => point.value), 1)
}

function trendTotal(points: AdminTrendPoint[]) {
  return points.reduce((sum, point) => sum + point.value, 0)
}

function trendAverage(points: AdminTrendPoint[]) {
  return points.length ? Math.round(trendTotal(points) / points.length) : 0
}

function trendPeak(points: AdminTrendPoint[]) {
  return points.reduce<AdminTrendPoint>(
    (peak, point) => (point.value > peak.value ? point : peak),
    points[0] ?? { date: '', value: 0 },
  )
}

function formatTrendLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value.slice(5)
  }

  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${month}-${day}`
}

function formatTrendPeakDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function formatFeedStamp(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

function shouldShowTrendLabel(index: number, total: number, dense: boolean) {
  if (!dense || total <= 8) {
    return true
  }

  const step = total > 24 ? 5 : 3
  return index === 0 || index === total - 1 || index % step === 0
}

function trendBarHeight(points: AdminTrendPoint[], value: number) {
  if (!value) {
    return '2px'
  }

  return `${Math.max((value / trendMax(points)) * 100, 8)}%`
}

function statusMeterWidth(points: AdminDashboardMetrics['statusDistribution'], value: number) {
  const max = Math.max(...points.map((point) => point.value), 1)
  if (!value) {
    return '10%'
  }

  return `${Math.max((value / max) * 100, 12)}%`
}

function goTo(path: string, query?: Record<string, string | undefined>) {
  router.push({
    path,
    query,
  })
}

function statusQuery(key: string) {
  switch (key) {
    case 'trash':
      return { state: 'trash' }
    case 'archived':
      return { state: 'archived' }
    case 'todo':
    case 'doing':
    case 'done':
      return { state: 'active', status: key }
    default:
      return { state: 'active' }
  }
}

async function loadMetrics() {
  loading.value = true
  message.value = ''

  try {
    const response = await authStore.withToken<Partial<AdminDashboardMetrics>>('/admin/dashboard')
    metrics.value = normalizeMetrics(response)
  } catch (error) {
    message.value = error instanceof Error ? error.message : '数据看板加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadMetrics)
</script>

<template>
  <section class="page dashboard-page">
    <div v-if="message" class="message error">{{ message }}</div>

    <section class="overview-shell">
      <article class="panel overview-main">
        <div class="overview-head">
          <h2 class="overview-title">运营总览</h2>

          <button class="btn btn-secondary overview-refresh" :disabled="loading" @click="loadMetrics">
            {{ loading ? '刷新中...' : '刷新数据' }}
          </button>
        </div>

        <div class="overview-body">
          <section class="overview-hero">
            <div class="overview-total-block">
              <span class="overview-total-copy">全局便签</span>
              <div class="overview-total-line">
                <h1 class="overview-total">{{ heroTotal }}</h1>
              </div>
            </div>

            <div class="overview-signal-row">
              <span v-for="item in overviewSignals" :key="item.label" class="signal-pill">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </span>
            </div>
          </section>

          <div class="overview-kpi-strip">
            <button
              v-for="item in headlineStats"
              :key="item.label"
              class="kpi-strip-item hero-button"
              type="button"
              @click="goTo(item.path, item.query)"
            >
              <span class="kpi-label">{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </button>
          </div>
        </div>
      </article>

      <article class="panel overview-side">
        <section class="side-section">
          <div class="section-top section-top-compact">
            <h3>状态分布</h3>
          </div>

          <div v-if="metrics?.statusDistribution.length" class="status-board">
            <button
              v-for="item in metrics.statusDistribution"
              :key="item.key"
              class="status-block"
              :data-tone="item.key"
              type="button"
              @click="goTo('/notes', statusQuery(item.key))"
            >
              <div class="status-block-head">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
              <div class="status-meter">
                <span :style="{ width: statusMeterWidth(metrics.statusDistribution, item.value) }" />
              </div>
            </button>
          </div>
          <div v-else class="empty-panel">当前没有状态分布数据。</div>
        </section>

        <div class="side-divider" />

        <section class="side-section">
          <div class="section-top section-top-compact">
            <h3>工作区排行</h3>
          </div>

          <div v-if="metrics?.workspaceRanking.length" class="workspace-board">
            <button
              v-for="(item, index) in metrics.workspaceRanking.slice(0, 5)"
              :key="item.workspaceId"
              class="workspace-line rank-button"
              type="button"
              @click="goTo('/workspaces', { focus: item.workspaceId })"
            >
              <span class="workspace-rank">{{ `${index + 1}`.padStart(2, '0') }}</span>
              <div class="workspace-copy">
                <strong>{{ item.workspaceName }}</strong>
                <span>便签 {{ item.noteCount }}</span>
              </div>
              <span class="workspace-side">成员 {{ item.memberCount }}</span>
            </button>
          </div>
          <div v-else class="empty-panel">当前还没有工作区排行数据。</div>
        </section>
      </article>
    </section>

    <section v-if="metrics" class="analytics-shell">
      <article v-if="primaryTrendPanel" class="panel trend-feature-panel">
        <div class="section-top trend-top">
          <div class="stack trend-heading">
            <div class="section-top section-top-compact">
              <h3>{{ primaryTrendPanel.title }}</h3>
            </div>
            <div class="trend-summary">
              <span class="pill">累计 {{ trendTotal(primaryTrendPanel.points) }}</span>
              <span class="pill">日均 {{ trendAverage(primaryTrendPanel.points) }}</span>
              <span class="pill">峰值 {{ trendPeak(primaryTrendPanel.points).value }}</span>
              <span class="pill">峰值日 {{ formatTrendPeakDate(trendPeak(primaryTrendPanel.points).date) }}</span>
            </div>
          </div>
        </div>

        <div v-if="primaryTrendPanel.points.length" class="trend-shell trend-shell-feature">
          <div class="trend-guides">
            <span>{{ trendMax(primaryTrendPanel.points) }}</span>
            <span>{{ Math.round(trendMax(primaryTrendPanel.points) / 2) }}</span>
            <span>0</span>
          </div>

          <div class="trend-plot trend-plot-feature">
            <div
              v-for="(point, index) in primaryTrendPanel.points"
              :key="point.date"
              class="trend-column"
              :title="`${formatTrendPeakDate(point.date)}：${point.value}`"
            >
              <div class="trend-track trend-track-feature">
                <div
                  class="trend-fill"
                  :class="{
                    zero: point.value === 0,
                    peak: point.value === trendPeak(primaryTrendPanel.points).value,
                  }"
                  :style="{ height: trendBarHeight(primaryTrendPanel.points, point.value) }"
                />
              </div>
              <span class="trend-label">
                {{ shouldShowTrendLabel(index, primaryTrendPanel.points.length, primaryTrendPanel.dense) ? formatTrendLabel(point.date) : '' }}
              </span>
            </div>
          </div>
        </div>
        <div v-else class="empty-panel">当前没有趋势数据。</div>
      </article>

      <article v-if="secondaryTrendPanel" class="panel trend-support-panel">
        <div class="section-top section-top-compact">
          <h3>{{ secondaryTrendPanel.title }}</h3>
        </div>

        <div class="trend-summary trend-summary-compact">
          <span class="pill">累计 {{ trendTotal(secondaryTrendPanel.points) }}</span>
          <span class="pill">峰值 {{ trendPeak(secondaryTrendPanel.points).value }}</span>
        </div>

        <div v-if="secondaryTrendPanel.points.length" class="trend-shell trend-shell-support" :class="{ dense: secondaryTrendPanel.dense }">
          <div class="trend-guides">
            <span>{{ trendMax(secondaryTrendPanel.points) }}</span>
            <span>{{ Math.round(trendMax(secondaryTrendPanel.points) / 2) }}</span>
            <span>0</span>
          </div>

          <div class="trend-plot trend-plot-support">
            <div
              v-for="(point, index) in secondaryTrendPanel.points"
              :key="point.date"
              class="trend-column"
              :title="`${formatTrendPeakDate(point.date)}：${point.value}`"
            >
              <div class="trend-track trend-track-support">
                <div
                  class="trend-fill trend-fill-support"
                  :class="{
                    zero: point.value === 0,
                    peak: point.value === trendPeak(secondaryTrendPanel.points).value,
                  }"
                  :style="{ height: trendBarHeight(secondaryTrendPanel.points, point.value) }"
                />
              </div>
              <span class="trend-label">
                {{ shouldShowTrendLabel(index, secondaryTrendPanel.points.length, secondaryTrendPanel.dense) ? formatTrendLabel(point.date) : '' }}
              </span>
            </div>
          </div>
        </div>
        <div v-else class="empty-panel">当前没有趋势数据。</div>
      </article>
    </section>

    <section v-if="metrics" class="operations-shell">
      <article class="panel risk-panel">
        <div class="section-top section-top-compact">
          <h3>高风险工作区</h3>
        </div>

        <div v-if="metrics.riskWorkspaces.length" class="risk-board">
          <button
            v-for="(workspace, index) in metrics.riskWorkspaces"
            :key="workspace.workspaceId"
            class="risk-row rank-button"
            :data-emphasis="index === 0 ? 'top' : 'normal'"
            type="button"
            @click="goTo('/notes', { workspaceId: workspace.workspaceId, state: 'overdue' })"
          >
            <span class="risk-rank">{{ `${index + 1}`.padStart(2, '0') }}</span>
            <div class="risk-row-main">
              <strong>{{ workspace.workspaceName }}</strong>
              <span>便签 {{ workspace.noteCount }} · 成员 {{ workspace.memberCount }}</span>
            </div>
            <div class="risk-metrics">
              <span class="risk-metric danger">逾期 {{ workspace.overdueCount }}</span>
              <span class="risk-metric">冲突 {{ workspace.conflictCount }}</span>
            </div>
          </button>
        </div>
        <div v-else class="empty-panel">当前没有高风险工作区。</div>
      </article>

      <article class="panel tags-panel">
        <div class="section-top section-top-compact">
          <h3>高频标签</h3>
        </div>

        <div v-if="metrics.topTags.length" class="tag-insight-board">
          <button
            v-for="tag in metrics.topTags"
            :key="`${tag.workspaceId}-${tag.name}`"
            class="tag-insight-row rank-button"
            type="button"
            @click="goTo('/notes', { workspaceId: tag.workspaceId, tag: tag.name })"
          >
            <span class="tag-dot" :style="{ background: tag.color }" />
            <div class="tag-insight-copy">
              <strong>{{ tag.name }}</strong>
              <span>{{ tag.workspaceName }}</span>
            </div>
            <span class="tag-usage">使用 {{ tag.usageCount }}</span>
          </button>
        </div>
        <div v-else class="empty-panel">当前没有标签排行数据。</div>
      </article>

      <article class="panel feed-panel">
        <div class="section-top section-top-compact">
          <h3>最近冲突</h3>
        </div>

        <div v-if="metrics.recentConflicts.length" class="feed-board">
          <button
            v-for="item in metrics.recentConflicts"
            :key="item.id"
            class="feed-row activity-button"
            type="button"
            @click="goTo('/sync', { workspaceId: item.workspaceId || '', focus: item.id })"
          >
            <div class="feed-copy">
              <strong>{{ item.title }}</strong>
              <span>{{ item.subtitle }}</span>
            </div>
            <span class="feed-stamp">{{ formatFeedStamp(item.createdAt) }}</span>
          </button>
        </div>
        <div v-else class="empty-panel">当前没有同步冲突。</div>
      </article>

      <article class="panel feed-panel activity-panel">
        <div class="section-top section-top-compact">
          <h3>最近活动</h3>
        </div>

        <div v-if="activityFeed.length" class="feed-board">
          <button
            v-for="item in activityFeed"
            :key="`${item.kind}-${item.id}`"
            class="feed-row activity-button"
            type="button"
            @click="goTo(item.path, item.query)"
          >
            <div class="feed-copy">
              <strong>{{ item.title }}</strong>
              <span>{{ item.subtitle }}</span>
            </div>
            <span class="feed-stamp">{{ formatFeedStamp(item.createdAt) }}</span>
          </button>
        </div>
        <div v-else class="empty-panel">当前还没有可展示的活动记录。</div>
      </article>
    </section>
  </section>
</template>

<style scoped>
.dashboard-page {
  gap: 1.1rem;
}

.section-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.section-top-compact {
  align-items: center;
}

.section-top-compact h3 {
  margin: 0;
  font-size: 1.02rem;
  letter-spacing: -0.02em;
}

.hero-button,
.rank-button,
.activity-button,
.status-block {
  cursor: pointer;
}

.hero-button,
.rank-button,
.activity-button,
.status-block {
  text-align: left;
}

.hero-button:hover,
.rank-button:hover,
.activity-button:hover,
.status-block:hover {
  transform: translateY(-1px);
}

.overview-shell,
.analytics-shell,
.operations-shell {
  display: grid;
  gap: 1rem;
}

.overview-shell {
  grid-template-columns: minmax(0, 1.24fr) minmax(360px, 0.76fr);
}

.overview-main {
  gap: 1.35rem;
  padding: 1.3rem 1.4rem;
  border-radius: 34px;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--accent-soft) 74%, transparent), transparent 28%),
    linear-gradient(180deg, color-mix(in srgb, var(--panel-strong) 86%, transparent), color-mix(in srgb, var(--panel) 94%, transparent));
}

.overview-head {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 1rem;
}

.overview-body {
  display: grid;
  grid-template-columns: minmax(0, 0.88fr) minmax(320px, 0.96fr);
  gap: 1rem;
  align-items: stretch;
}

.overview-hero {
  display: grid;
  align-content: space-between;
  gap: 1rem;
  min-height: 100%;
}

.overview-total-block {
  display: grid;
  gap: 0.55rem;
}

.overview-title {
  margin: 0;
  color: var(--heading);
  font-size: 1.18rem;
  letter-spacing: -0.03em;
}

.overview-total-copy {
  color: var(--text-soft);
  font-size: 0.8rem;
  letter-spacing: 0.12em;
}

.overview-total-line {
  display: flex;
  align-items: end;
  gap: 1rem;
}

.overview-total {
  margin: 0;
  font-family: var(--font-display);
  color: var(--heading);
  font-size: clamp(3.8rem, 8vw, 6.1rem);
  line-height: 0.88;
  letter-spacing: -0.06em;
}

.overview-refresh {
  min-width: 126px;
}

.overview-signal-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
}

.signal-pill {
  min-height: 92px;
  padding: 0.85rem 0.95rem;
  border-radius: 24px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  display: grid;
  align-content: space-between;
  gap: 0.35rem;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.signal-pill strong {
  color: var(--heading);
  font-weight: 700;
  font-size: 1.4rem;
  line-height: 1;
}

.overview-kpi-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.kpi-strip-item {
  width: 100%;
  min-height: 138px;
  padding: 1rem 1.05rem;
  border-radius: 28px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--panel) 96%, transparent);
  display: grid;
  align-content: space-between;
  gap: 0.55rem;
  transition:
    transform var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast);
}

.kpi-strip-item:hover {
  border-color: var(--border-strong);
  box-shadow: 0 14px 32px rgba(17, 24, 39, 0.08);
}

.kpi-label {
  color: var(--text-soft);
  font-size: 0.84rem;
  letter-spacing: 0.02em;
}

.kpi-strip-item strong {
  font-family: var(--font-display);
  color: var(--heading);
  font-size: clamp(1.9rem, 3vw, 2.65rem);
  line-height: 1;
  letter-spacing: -0.05em;
}

.overview-side {
  gap: 1rem;
  padding: 1.2rem 1.25rem;
  border-radius: 34px;
}

.side-section {
  display: grid;
  gap: 0.85rem;
}

.side-divider {
  height: 1px;
  width: 100%;
  background: color-mix(in srgb, var(--border) 90%, transparent);
}

.status-board,
.workspace-board,
.risk-board,
.tag-insight-board,
.feed-board {
  display: grid;
  gap: 0.7rem;
}

.status-block {
  width: 100%;
  padding: 0.85rem 0.95rem;
  border-radius: 22px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--panel) 94%, transparent);
  display: grid;
  gap: 0.55rem;
  transition:
    transform var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast);
}

.status-block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
}

.status-block-head span {
  color: var(--text-muted);
}

.status-block-head strong {
  color: var(--heading);
  font-size: 1rem;
}

.status-meter {
  height: 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--border) 90%, transparent);
  overflow: hidden;
}

.status-meter span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--accent) 52%, #fff 48%), var(--accent));
}

.status-block[data-tone='done'] .status-meter span {
  background: linear-gradient(90deg, color-mix(in srgb, var(--success) 58%, #fff 42%), var(--success));
}

.status-block[data-tone='archived'] .status-meter span {
  background: linear-gradient(90deg, color-mix(in srgb, var(--text-soft) 58%, #fff 42%), var(--text-soft));
}

.status-block[data-tone='trash'] .status-meter span {
  background: linear-gradient(90deg, color-mix(in srgb, var(--danger) 58%, #fff 42%), var(--danger));
}

.workspace-line {
  width: 100%;
  padding: 0.85rem 0.95rem;
  border-radius: 22px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--panel) 94%, transparent);
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  transition:
    transform var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast);
}

.workspace-rank {
  color: var(--text-soft);
  font-size: 0.82rem;
  letter-spacing: 0.08em;
}

.workspace-copy {
  min-width: 0;
  display: grid;
  gap: 0.18rem;
}

.workspace-copy strong,
.risk-row-main strong,
.tag-insight-copy strong,
.feed-copy strong {
  color: var(--heading);
}

.workspace-copy span,
.workspace-side,
.risk-row-main span,
.tag-insight-copy span,
.feed-copy span,
.feed-stamp {
  color: var(--text-muted);
  font-size: 0.86rem;
}

.analytics-shell {
  grid-template-columns: minmax(0, 1.24fr) minmax(320px, 0.76fr);
  align-items: start;
}

.trend-feature-panel,
.trend-support-panel,
.risk-panel,
.tags-panel,
.feed-panel {
  padding: 1.15rem 1.2rem;
  border-radius: 34px;
}

.trend-feature-panel {
  gap: 1.15rem;
}

.trend-support-panel {
  gap: 0.95rem;
}

.trend-top {
  align-items: start;
}

.trend-heading {
  gap: 0.7rem;
}

.trend-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.trend-shell {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 0.9rem;
  min-height: 232px;
}

.trend-shell-feature {
  min-height: 278px;
}

.trend-shell-support {
  min-height: 212px;
}

.trend-guides {
  display: grid;
  align-content: stretch;
  color: var(--text-soft);
  font-size: 0.78rem;
}

.trend-guides span {
  display: flex;
  align-items: end;
  justify-content: flex-start;
}

.trend-guides span:nth-child(2) {
  align-items: center;
}

.trend-guides span:last-child {
  align-items: start;
}

.trend-plot {
  position: relative;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(26px, 1fr));
  gap: 0.65rem;
  align-items: end;
  min-height: 232px;
  padding: 0.35rem 0 0;
}

.trend-plot-feature {
  min-height: 278px;
}

.trend-plot-support {
  min-height: 212px;
}

.trend-plot::before {
  content: '';
  position: absolute;
  inset: 0 0 1.8rem;
  border-radius: 22px;
  background:
    linear-gradient(to top, color-mix(in srgb, var(--border) 95%, transparent) 1px, transparent 1px) 0 100% / 100% 100% no-repeat,
    linear-gradient(to top, color-mix(in srgb, var(--border) 62%, transparent) 1px, transparent 1px) 0 50% / 100% 50% no-repeat,
    linear-gradient(to top, color-mix(in srgb, var(--border) 42%, transparent) 1px, transparent 1px) 0 0 / 100% 25% no-repeat;
  opacity: 0.92;
  pointer-events: none;
}

.trend-column {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.5rem;
  align-items: end;
  min-width: 0;
}

.trend-track {
  height: 176px;
  display: flex;
  align-items: end;
}

.trend-track-feature {
  height: 206px;
}

.trend-track-support {
  height: 148px;
}

.trend-fill {
  width: 100%;
  min-height: 10px;
  border-radius: 16px 16px 10px 10px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 68%, #fff 32%), var(--accent));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.24);
  transition:
    transform var(--transition-fast),
    filter var(--transition-fast),
    background var(--transition-fast);
}

.trend-fill.peak {
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent-strong) 72%, #fff 28%), var(--accent-strong));
}

.trend-fill-support {
  border-radius: 12px 12px 8px 8px;
}

.trend-column:hover .trend-fill {
  transform: translateY(-2px);
  filter: saturate(1.08);
}

.trend-fill.zero {
  min-height: 2px;
  opacity: 0.42;
}

.trend-label {
  min-height: 1.25rem;
  color: var(--text-soft);
  font-size: 0.74rem;
  line-height: 1;
  text-align: center;
  letter-spacing: 0.02em;
}

.trend-shell.dense .trend-plot {
  gap: 0.45rem;
  grid-template-columns: repeat(auto-fit, minmax(16px, 1fr));
}

.trend-shell.dense .trend-label {
  font-size: 0.7rem;
}

.trend-summary-compact {
  gap: 0.45rem;
}

.operations-shell {
  grid-template-columns: minmax(0, 1.08fr) minmax(340px, 0.92fr);
  align-items: start;
}

.risk-row,
.tag-insight-row,
.feed-row {
  width: 100%;
  padding: 0.9rem 1rem;
  border-radius: 24px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--panel) 95%, transparent);
  transition:
    transform var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast);
}

.risk-row:hover,
.tag-insight-row:hover,
.feed-row:hover,
.workspace-line:hover,
.status-block:hover,
.kpi-strip-item:hover {
  border-color: var(--border-strong);
}

.risk-row {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 1rem;
}

.risk-row[data-emphasis='top'] {
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--accent-soft) 66%, transparent), transparent 82%),
    color-mix(in srgb, var(--panel) 95%, transparent);
}

.risk-rank {
  color: var(--text-soft);
  font-size: 0.78rem;
  letter-spacing: 0.1em;
}

.risk-row-main,
.tag-insight-copy,
.feed-copy {
  min-width: 0;
  display: grid;
  gap: 0.18rem;
}

.risk-metrics {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.45rem;
}

.risk-metric {
  min-height: 1.9rem;
  padding: 0 0.7rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--panel-strong) 92%, transparent);
  display: inline-flex;
  align-items: center;
  color: var(--text-muted);
  font-size: 0.8rem;
}

.risk-metric.danger {
  color: var(--danger);
  border-color: color-mix(in srgb, var(--danger) 28%, var(--border));
}

.tag-insight-row {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
}

.tag-dot {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 999px;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--panel-strong) 72%, transparent);
}

.tag-usage {
  color: var(--heading);
  font-size: 0.88rem;
  white-space: nowrap;
}

.risk-panel {
  grid-row: span 2;
}

.activity-panel {
  grid-column: 1 / -1;
}

.feed-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 0.9rem;
}

.feed-stamp {
  white-space: nowrap;
}

@media (max-width: 1360px) {
  .overview-body {
    grid-template-columns: 1fr;
  }

  .overview-kpi-strip {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .overview-shell,
  .analytics-shell,
  .operations-shell {
    grid-template-columns: 1fr;
  }

  .trend-top {
    flex-direction: column;
    align-items: stretch;
  }

  .trend-shell {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .trend-guides {
    display: flex;
    justify-content: space-between;
  }

  .trend-plot {
    gap: 0.45rem;
  }

  .trend-shell.dense .trend-plot {
    grid-template-columns: repeat(auto-fit, minmax(12px, 1fr));
  }

  .risk-panel,
  .activity-panel {
    grid-column: auto;
    grid-row: auto;
  }

  .risk-row,
  .tag-insight-row,
  .feed-row,
  .workspace-line {
    grid-template-columns: 1fr;
  }

  .risk-row {
    align-items: start;
  }

  .risk-metrics {
    justify-content: flex-start;
  }

  .feed-stamp {
    justify-self: start;
  }
}

@media (max-width: 640px) {
  .overview-head,
  .overview-total-line {
    flex-direction: column;
    align-items: start;
  }

  .overview-signal-row,
  .overview-kpi-strip {
    grid-template-columns: 1fr;
  }

  .overview-refresh {
    width: 100%;
  }
}
</style>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MEMBER_STATUS_LABELS, WORKSPACE_ROLE_LABELS } from '@shared'
import type { AdminUserListItem, AdminWorkspaceDetail, AdminWorkspaceListItem, WorkspaceMember, WorkspaceRole } from '@shared'

import AdminDialog from '@/components/AdminDialog.vue'
import { getQueryString, mergeQuery } from '@/lib/query'
import { useAdminAuthStore } from '@/stores/auth'

const authStore = useAdminAuthStore()
const route = useRoute()
const router = useRouter()

const workspaces = ref<AdminWorkspaceListItem[]>([])
const users = ref<AdminUserListItem[]>([])
const members = ref<WorkspaceMember[]>([])
const workspaceDetail = ref<AdminWorkspaceDetail | null>(null)
const selectedWorkspaceId = ref('')
const selectedMemberId = ref('')
const roleFilter = ref<WorkspaceRole | ''>('')
const dialogMode = ref<'create' | 'edit' | null>(null)
const loading = ref(false)
const message = ref('')
const draft = ref({
  userId: '',
  email: '',
  role: 'editor' as WorkspaceRole,
})

const roleOptions: Array<{ value: WorkspaceRole; label: string }> = [
  { value: 'owner', label: WORKSPACE_ROLE_LABELS.owner },
  { value: 'admin', label: WORKSPACE_ROLE_LABELS.admin },
  { value: 'editor', label: WORKSPACE_ROLE_LABELS.editor },
  { value: 'viewer', label: WORKSPACE_ROLE_LABELS.viewer },
]

const dialogOpen = computed(() => dialogMode.value !== null)
const filteredMembers = computed(() => members.value.filter((member) => !roleFilter.value || member.role === roleFilter.value))
const selectedMember = computed(() => members.value.find((member) => member.id === selectedMemberId.value) || null)
const availableUsers = computed(() => {
  const existingIds = new Set(members.value.map((member) => member.userId))
  return users.value.filter((user) => !existingIds.has(user.id))
})
const ownersText = computed(() => workspaceDetail.value?.owners.map((owner) => owner.name).join(' / ') || '未设置')

function resetDraft() {
  draft.value = {
    userId: '',
    email: '',
    role: 'editor',
  }
}

async function loadLookups() {
  const [workspaceList, userList] = await Promise.all([
    authStore.withToken<AdminWorkspaceListItem[]>('/admin/workspaces'),
    authStore.withToken<AdminUserListItem[]>('/admin/users'),
  ])

  workspaces.value = workspaceList
  users.value = userList
}

async function loadWorkspaceContext(workspaceId: string) {
  const [detail, nextMembers] = await Promise.all([
    authStore.withToken<AdminWorkspaceDetail>(`/admin/workspaces/${workspaceId}`),
    authStore.withToken<WorkspaceMember[]>(`/admin/workspaces/${workspaceId}/members`),
  ])

  workspaceDetail.value = detail
  members.value = nextMembers
}

async function syncRouteState() {
  await loadLookups()

  const routeWorkspaceId = getQueryString(route.query.workspaceId) || workspaces.value[0]?.id || ''
  selectedWorkspaceId.value = routeWorkspaceId
  roleFilter.value = (getQueryString(route.query.role) as WorkspaceRole | '') || ''

  if (!routeWorkspaceId) {
    workspaceDetail.value = null
    members.value = []
    return
  }

  loading.value = true
  message.value = ''

  try {
    await loadWorkspaceContext(routeWorkspaceId)
    const focusId = getQueryString(route.query.focus)
    if (focusId) {
      const targetMember = members.value.find((member) => member.id === focusId)
      if (targetMember) {
        selectedMemberId.value = targetMember.id
        draft.value = {
          userId: targetMember.userId,
          email: targetMember.user?.email || '',
          role: targetMember.role,
        }
        dialogMode.value = 'edit'
        return
      }
    }

    if (!focusId && roleFilter.value && filteredMembers.value.length === 1) {
      focusMember(filteredMembers.value[0].id)
      return
    }

    if (dialogMode.value === 'edit') {
      dialogMode.value = null
      selectedMemberId.value = ''
      resetDraft()
    }
  } catch (error) {
    message.value = error instanceof Error ? error.message : '成员列表加载失败'
  } finally {
    loading.value = false
  }
}

function changeWorkspace(workspaceId: string) {
  router.replace({
    query: mergeQuery(route.query, {
      workspaceId,
      role: roleFilter.value || null,
      focus: null,
    }),
  })
}

function applyRoleFilter() {
  router.replace({
    query: mergeQuery(route.query, {
      workspaceId: selectedWorkspaceId.value || null,
      role: roleFilter.value || null,
      focus: null,
    }),
  })
}

function focusMember(memberId: string) {
  router.replace({
    query: mergeQuery(route.query, {
      workspaceId: selectedWorkspaceId.value || null,
      role: roleFilter.value || null,
      focus: memberId,
    }),
  })
}

function closeDialog() {
  dialogMode.value = null
  selectedMemberId.value = ''
  resetDraft()

  if (getQueryString(route.query.focus)) {
    router.replace({
      query: mergeQuery(route.query, { focus: null }),
    })
  }
}

function openCreateDialog() {
  resetDraft()
  dialogMode.value = 'create'
}

function jumpTo(path: string, queryPatch: Record<string, string | null | undefined>) {
  closeDialog()
  router.push({
    path,
    query: mergeQuery({}, queryPatch),
  })
}

async function addMember() {
  if (!selectedWorkspaceId.value) {
    message.value = '请先选择工作区。'
    return
  }

  loading.value = true
  message.value = ''

  try {
    await authStore.withToken(`/admin/workspaces/${selectedWorkspaceId.value}/members`, {
      method: 'POST',
      body: {
        userId: draft.value.userId || undefined,
        email: draft.value.userId ? undefined : draft.value.email || undefined,
        role: draft.value.role,
      },
    })
    closeDialog()
    message.value = '成员已加入工作区。'
    await loadWorkspaceContext(selectedWorkspaceId.value)
  } catch (error) {
    message.value = error instanceof Error ? error.message : '成员添加失败'
  } finally {
    loading.value = false
  }
}

async function updateMember() {
  if (!selectedMember.value) {
    return
  }

  loading.value = true
  message.value = ''

  try {
    await authStore.withToken(`/admin/workspaces/${selectedWorkspaceId.value}/members/${selectedMember.value.id}`, {
      method: 'PATCH',
      body: { role: draft.value.role },
    })
    closeDialog()
    message.value = '成员角色已更新。'
    await loadWorkspaceContext(selectedWorkspaceId.value)
  } catch (error) {
    message.value = error instanceof Error ? error.message : '成员角色更新失败'
  } finally {
    loading.value = false
  }
}

async function removeMember() {
  if (!selectedMember.value) {
    return
  }

  loading.value = true
  message.value = ''

  try {
    await authStore.withToken(`/admin/workspaces/${selectedWorkspaceId.value}/members/${selectedMember.value.id}`, {
      method: 'DELETE',
    })
    closeDialog()
    message.value = '成员已移出工作区。'
    await loadWorkspaceContext(selectedWorkspaceId.value)
  } catch (error) {
    message.value = error instanceof Error ? error.message : '成员移除失败'
  } finally {
    loading.value = false
  }
}

watch(
  () => `${getQueryString(route.query.workspaceId)}|${getQueryString(route.query.role)}|${getQueryString(route.query.focus)}`,
  async () => {
    await syncRouteState()
  },
)

onMounted(async () => {
  await syncRouteState()
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <div class="stack">
        <h3>成员管理</h3>
      </div>
      <div class="toolbar">
        <select v-model="selectedWorkspaceId" class="select" @change="changeWorkspace(selectedWorkspaceId)">
          <option v-for="workspace in workspaces" :key="workspace.id" :value="workspace.id">{{ workspace.name }}</option>
        </select>
        <select v-model="roleFilter" class="select" @change="applyRoleFilter">
          <option value="">全部角色</option>
          <option v-for="option in roleOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
        <button class="btn btn-secondary" :disabled="loading || !selectedWorkspaceId" @click="syncRouteState">刷新</button>
        <button class="btn btn-primary" :disabled="!selectedWorkspaceId" @click="openCreateDialog">新增成员</button>
      </div>
    </header>

    <div v-if="message" class="message" :class="{ error: message.includes('失败') || message.includes('请先') }">{{ message }}</div>

    <article class="panel context-panel">
      <div class="context-main">
        <strong>{{ workspaceDetail?.name || '未选择工作区' }}</strong>
        <span>拥有者 {{ ownersText }} · 成员 {{ workspaceDetail?.memberCount || 0 }} · 便签 {{ workspaceDetail?.noteCount || 0 }} · 模板 {{ workspaceDetail?.templateCount || 0 }} · 标签 {{ workspaceDetail?.tagCount || 0 }}</span>
      </div>
      <div class="context-stats">
        <span v-for="item in workspaceDetail?.roleBreakdown || []" :key="item.role" class="pill">{{ WORKSPACE_ROLE_LABELS[item.role] }} {{ item.count }}</span>
      </div>
      <div class="context-actions">
        <button v-if="workspaceDetail" class="btn btn-ghost mini" @click="jumpTo('/workspaces', { focus: workspaceDetail.id })">工作区</button>
        <button v-if="workspaceDetail" class="btn btn-ghost mini" @click="jumpTo('/notes', { workspaceId: workspaceDetail.id })">便签</button>
        <button v-if="workspaceDetail" class="btn btn-ghost mini" @click="jumpTo('/templates', { workspaceId: workspaceDetail.id })">模板</button>
        <button v-if="workspaceDetail" class="btn btn-ghost mini" @click="jumpTo('/tags', { workspaceId: workspaceDetail.id })">标签</button>
      </div>
    </article>

    <article class="panel">
      <div v-if="filteredMembers.length" class="table-shell">
        <table class="table">
          <thead>
            <tr>
              <th>成员</th>
              <th>邮箱</th>
              <th>角色</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="member in filteredMembers"
              :key="member.id"
              :class="{ active: selectedMemberId === member.id }"
              @click="focusMember(member.id)"
            >
              <td>{{ member.user?.name || member.userId }}</td>
              <td>{{ member.user?.email || '无邮箱' }}</td>
              <td>{{ WORKSPACE_ROLE_LABELS[member.role] }}</td>
              <td>{{ MEMBER_STATUS_LABELS[member.status] }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-panel">当前工作区还没有匹配的成员。</div>
    </article>

    <AdminDialog
      :open="dialogOpen"
      :title="dialogMode === 'edit' ? '成员详情' : '新增成员'"
      size="md"
      @close="closeDialog"
    >
      <div v-if="selectedMember" class="member-head">
        <div class="member-copy">
          <strong>{{ selectedMember.user?.name || selectedMember.userId }}</strong>
          <span>{{ selectedMember.user?.email || '无邮箱' }}</span>
        </div>
        <div class="member-actions">
          <button class="btn btn-ghost mini" @click="jumpTo('/users', { focus: selectedMember.userId })">账号</button>
          <button class="btn btn-ghost mini" @click="jumpTo('/workspaces', { focus: selectedWorkspaceId })">工作区</button>
          <button class="btn btn-ghost mini" @click="jumpTo('/notes', { workspaceId: selectedWorkspaceId })">便签</button>
        </div>
      </div>

      <div class="form-grid">
        <label v-if="dialogMode === 'create'" class="full">
          <span>已有账号</span>
          <select v-model="draft.userId" class="select">
            <option value="">不选择，改用邮箱邀请</option>
            <option v-for="user in availableUsers" :key="user.id" :value="user.id">{{ user.name }}（{{ user.email }}）</option>
          </select>
        </label>

        <label class="full">
          <span>{{ dialogMode === 'edit' ? '邮箱' : '邮箱邀请' }}</span>
          <input
            v-model="draft.email"
            class="field"
            :disabled="Boolean(dialogMode === 'edit' || draft.userId)"
            :placeholder="dialogMode === 'edit' ? '当前成员邮箱' : '如无已有账号，可直接填写邮箱'"
          />
        </label>

        <label class="full">
          <span>角色</span>
          <select v-model="draft.role" class="select">
            <option v-for="option in roleOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>

        <label v-if="dialogMode === 'edit'" class="full">
          <span>状态</span>
          <input class="field" :value="selectedMember ? MEMBER_STATUS_LABELS[selectedMember.status] : '-'" disabled />
        </label>
      </div>

      <template #footer>
        <button class="btn btn-primary" :disabled="loading" @click="dialogMode === 'edit' ? updateMember() : addMember()">
          {{ loading ? '处理中...' : dialogMode === 'edit' ? '保存修改' : '加入工作区' }}
        </button>
        <button v-if="dialogMode === 'edit'" class="btn btn-danger" :disabled="loading" @click="removeMember">移除成员</button>
      </template>
    </AdminDialog>
  </section>
</template>

<style scoped>
.context-panel,
.context-actions,
.context-stats,
.member-head,
.member-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}

.context-panel,
.member-head {
  justify-content: space-between;
}

.context-main,
.member-copy {
  display: grid;
  gap: 0.18rem;
}

.context-main span,
.member-copy span {
  color: var(--text-muted);
}

.mini {
  min-height: 36px;
  padding-inline: 0.85rem;
}

@media (max-width: 900px) {
  .context-panel,
  .member-head {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>

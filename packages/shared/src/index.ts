export const PRIORITIES = ['low', 'normal', 'high'] as const
export const NOTE_TYPES = ['note', 'checklist'] as const
export const NOTE_STATUSES = ['todo', 'doing', 'done'] as const
export const SYNC_STATUSES = ['local', 'dirty', 'synced', 'conflict'] as const
export const NOTE_VIEWS = ['all', 'active', 'completed', 'important', 'today', 'week', 'overdue', 'archived', 'trash'] as const
export const EXPORT_FORMATS = ['json', 'markdown', 'txt'] as const
export const TEMPLATE_KEYS = ['meeting', 'shopping', 'study', 'retro'] as const
export const APP_VIEWS = ['dashboard', 'notes', 'board', 'calendar'] as const
export const WORKSPACE_ROLES = ['owner', 'admin', 'editor', 'viewer'] as const
export const MEMBER_STATUSES = ['active', 'invited'] as const
export const SYNC_ENTITY_TYPES = ['note', 'template', 'setting'] as const
export const QUEUE_OPERATIONS = ['create', 'update', 'delete'] as const
export const NOTES_BATCH_OPERATIONS = ['create', 'update', 'delete', 'restore', 'archive', 'unarchive'] as const
export const THEMES = ['light-workbench', 'dark-workbench'] as const

export type Priority = (typeof PRIORITIES)[number]
export type NoteType = (typeof NOTE_TYPES)[number]
export type NoteStatus = (typeof NOTE_STATUSES)[number]
export type SyncStatus = (typeof SYNC_STATUSES)[number]
export type NoteView = (typeof NOTE_VIEWS)[number]
export type ExportFormat = (typeof EXPORT_FORMATS)[number]
export type TemplateKey = (typeof TEMPLATE_KEYS)[number]
export type AppView = (typeof APP_VIEWS)[number]
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number]
export type MemberStatus = (typeof MEMBER_STATUSES)[number]
export type SyncEntityType = (typeof SYNC_ENTITY_TYPES)[number]
export type QueueOperation = (typeof QUEUE_OPERATIONS)[number]
export type NotesBatchOperation = (typeof NOTES_BATCH_OPERATIONS)[number]
export type NotificationState = 'default' | 'granted' | 'denied' | 'unsupported'
export type ThemeKey = (typeof THEMES)[number]

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: '低优先级',
  normal: '普通优先级',
  high: '高优先级',
}

export const PRIORITY_SHORT_LABELS: Record<Priority, string> = {
  low: '低',
  normal: '中',
  high: '高',
}

export const NOTE_STATUS_LABELS: Record<NoteStatus, string> = {
  todo: '待处理',
  doing: '进行中',
  done: '已完成',
}

export const WORKSPACE_ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: '拥有者',
  admin: '管理员',
  editor: '编辑者',
  viewer: '查看者',
}

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  active: '正常',
  invited: '待接受',
}

export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  local: '本地',
  dirty: '待同步',
  synced: '已同步',
  conflict: '冲突',
}

export const NOTIFICATION_STATE_LABELS: Record<NotificationState, string> = {
  default: '未设置',
  granted: '已允许',
  denied: '已拒绝',
  unsupported: '当前浏览器不支持',
}

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  json: 'JSON 数据文件',
  markdown: 'Markdown 文档',
  txt: 'TXT 文本文档',
}

export const APP_NAME = 'MX工作便签'
export const APP_SHORT_NAME = 'MX'
export const ADMIN_APP_NAME = 'MX工作便签后台'
export const APP_DESCRIPTION = '登录后进入 MX 工作便签，集中处理便签、任务与工作区。'
export const IMPORTANT_TAG_NAME = '重要'
export const DEFAULT_WORKSPACE_NAME = '默认工作区'
export const DEFAULT_WORKSPACE_DESCRIPTION = 'MX工作便签默认工作区'
export const DEFAULT_THEME: ThemeKey = 'light-workbench'
export const WEB_THEME_STORAGE_KEY = 'smart-notes-web-theme'
export const ADMIN_THEME_STORAGE_KEY = 'smart-notes-admin-theme'

export interface ChecklistItem {
  id: string
  text: string
  completed: boolean
  order: number
  createdAt: string
  updatedAt: string
}

export interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  color: string
  completed: boolean
  type: NoteType
  checklist: ChecklistItem[]
  pinned: boolean
  priority: Priority
  status: NoteStatus
  order: number
  dueDate: string | null
  remindAt: string | null
  deletedAt: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
  source: 'local' | 'import' | 'template' | 'sync'
  version: number
  syncStatus: SyncStatus
}

export interface NoteDraft extends Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'completedAt' | 'version' | 'syncStatus' | 'source'> {}

export interface Template {
  id: string
  key: TemplateKey | string
  name: string
  description: string
  icon: string
  note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'completedAt' | 'deletedAt' | 'archivedAt' | 'version' | 'syncStatus' | 'source'>
  createdAt: string
  updatedAt: string
}

export interface TagMeta {
  name: string
  color: string
  usageCount: number
  pinned: boolean
  lastUsedAt: string | null
}

export interface SearchHistoryItem {
  id: string
  query: string
  createdAt: string
}

export interface SyncQueueItem {
  id: string
  workspaceId?: string | null
  entityType: SyncEntityType
  entityId: string
  operation: QueueOperation
  payload: unknown
  expectedVersion?: number
  createdAt: string
}

export interface UserProfile {
  id: string
  email: string
  name: string
  role: WorkspaceRole
}

export interface Workspace {
  id: string
  name: string
  description: string
  members: number
  createdAt: string
}

export interface WorkspaceMember {
  id: string
  workspaceId: string
  userId: string
  role: WorkspaceRole
  status: MemberStatus
  createdAt: string
  user: UserProfile | null
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthSession {
  tokens: AuthTokens
  user: UserProfile
  workspace: Workspace
}

export interface AuthSessionRecord {
  id: 'primary'
  value: AuthSession
}

export interface SyncCursor {
  value: string | null
}

export interface SyncConflict {
  entityType: Extract<SyncEntityType, 'note' | 'template'>
  entityId: string
  code: 'version_conflict'
  message: string
  incomingRecord: Note | Template | null
  serverRecord: Note | Template | null
  expectedVersion?: number
  actualVersion?: number
}

export interface SyncPushItem {
  workspaceId?: string | null
  entityType: SyncEntityType
  entityId: string
  operation: QueueOperation
  payload: unknown
  expectedVersion?: number
}

export interface SyncPullResponse {
  nextCursor: string
  notes: Note[]
  templates: Template[]
  conflicts: SyncConflict[]
}

export interface SyncPushResponse {
  applied: Array<{
    entityType: SyncEntityType
    entityId: string
    operation: QueueOperation
    version?: number
  }>
  conflicts: SyncConflict[]
}

export interface NoteBatchItem {
  operation: NotesBatchOperation
  entityId: string
  payload: Note | null
  expectedVersion?: number
}

export interface NoteBatchResponse {
  applied: Array<{
    entityId: string
    operation: NotesBatchOperation
    version?: number
  }>
  conflicts: SyncConflict[]
}

export interface AdminTrendPoint {
  date: string
  value: number
}

export interface AdminRankingItem {
  workspaceId: string
  workspaceName: string
  noteCount: number
  memberCount: number
}

export interface AdminRecentItem {
  id: string
  title: string
  subtitle: string
  createdAt: string
  kind?: 'user' | 'workspace' | 'conflict'
  workspaceId?: string
}

export interface AdminStatusDistributionItem {
  key: NoteStatus | 'trash' | 'archived'
  label: string
  value: number
}

export interface AdminTopTagItem {
  workspaceId: string
  workspaceName: string
  name: string
  color: string
  usageCount: number
  lastUsedAt: string | null
}

export interface AdminRiskWorkspaceItem {
  workspaceId: string
  workspaceName: string
  noteCount: number
  memberCount: number
  overdueCount: number
  conflictCount: number
}

export interface AdminDashboardMetrics {
  users: number
  workspaces: number
  members: number
  notes: number
  templates: number
  tags: number
  completedNotes: number
  overdueNotes: number
  trashedNotes: number
  conflicts: number
  statusDistribution: AdminStatusDistributionItem[]
  noteTrend7Days: AdminTrendPoint[]
  noteTrend30Days: AdminTrendPoint[]
  workspaceRanking: AdminRankingItem[]
  topTags: AdminTopTagItem[]
  riskWorkspaces: AdminRiskWorkspaceItem[]
  recentConflicts: AdminRecentItem[]
  recentUsers: AdminRecentItem[]
  recentWorkspaces: AdminRecentItem[]
}

export interface AdminUserListItem {
  id: string
  email: string
  name: string
  createdAt: string
  updatedAt: string
  workspaceCount: number
  ownedWorkspaceCount: number
  roles: WorkspaceRole[]
  canDelete: boolean
}

export interface AdminUserWorkspaceRef {
  workspaceId: string
  workspaceName: string
  role: WorkspaceRole
  memberCount: number
  noteCount: number
  templateCount: number
  tagCount: number
  overdueCount: number
  conflictCount: number
  risk: 'high' | 'normal'
}

export interface AdminUserRoleSummaryItem {
  role: WorkspaceRole
  count: number
}

export interface AdminUserDetail {
  id: string
  email: string
  name: string
  createdAt: string
  updatedAt: string
  canDelete: boolean
  ownedWorkspaces: AdminUserWorkspaceRef[]
  joinedWorkspaces: AdminUserWorkspaceRef[]
  roleSummary: AdminUserRoleSummaryItem[]
}

export interface AdminWorkspaceListItem {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  memberCount: number
  noteCount: number
  templateCount: number
  ownerNames: string[]
}

export interface AdminWorkspaceOwnerItem {
  userId: string
  name: string
  email: string
}

export interface AdminWorkspaceRoleBreakdownItem {
  role: WorkspaceRole
  count: number
}

export interface AdminWorkspaceRecentMemberItem {
  id: string
  userId: string
  name: string
  email: string
  role: WorkspaceRole
  status: MemberStatus
  createdAt: string
}

export interface AdminWorkspaceRecentNoteItem {
  id: string
  title: string
  status: NoteStatus
  priority: Priority
  dueDate: string | null
  updatedAt: string
}

export interface AdminWorkspaceRecentTemplateItem {
  id: string
  key: string
  name: string
  updatedAt: string
}

export interface AdminWorkspaceSummary {
  id: string
  name: string
  memberCount: number
  noteCount: number
  templateCount: number
  tagCount: number
  overdueCount: number
  conflictCount: number
  risk: 'high' | 'normal'
}

export interface AdminWorkspaceDetail {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  owners: AdminWorkspaceOwnerItem[]
  memberCount: number
  noteCount: number
  templateCount: number
  tagCount: number
  overdueCount: number
  conflictCount: number
  roleBreakdown: AdminWorkspaceRoleBreakdownItem[]
  recentMembers: AdminWorkspaceRecentMemberItem[]
  recentNotes: AdminWorkspaceRecentNoteItem[]
  recentTemplates: AdminWorkspaceRecentTemplateItem[]
  topTags: AdminTagListItem[]
  risk: 'high' | 'normal'
}

export interface AdminNoteListItem {
  id: string
  title: string
  workspaceId: string
  workspaceName: string
  priority: Priority
  status: NoteStatus
  type: NoteType
  completed: boolean
  dueDate: string | null
  deletedAt: string | null
  archivedAt: string | null
  updatedAt: string
  tags: string[]
}

export interface AdminNoteDetail {
  workspaceId: string
  workspaceName: string
  workspaceSummary: AdminWorkspaceSummary
  note: Note
  relatedNotes: AdminWorkspaceRecentNoteItem[]
  relatedTags: AdminTagListItem[]
}

export interface AdminTemplateListItem {
  id: string
  key: string
  name: string
  description: string
  workspaceId: string
  workspaceName: string
  updatedAt: string
}

export interface AdminTemplateDetail {
  workspaceId: string
  workspaceName: string
  workspaceSummary: AdminWorkspaceSummary
  template: Template
  relatedTemplates: AdminWorkspaceRecentTemplateItem[]
  relatedTags: AdminTagListItem[]
}

export interface AdminTagListItem {
  workspaceId: string
  workspaceName: string
  name: string
  color: string
  usageCount: number
  pinned: boolean
  lastUsedAt: string | null
}

export interface AdminTagDetail {
  workspaceId: string
  workspaceName: string
  workspaceSummary: AdminWorkspaceSummary
  tag: AdminTagListItem
  notesPreview: AdminWorkspaceRecentNoteItem[]
  impactCount: number
}

export interface AdminConflictListItem {
  id: string
  title: string
  workspaceId: string
  workspaceName: string
  status: NoteStatus
  priority: Priority
  dueDate: string | null
  tags: string[]
  completed: boolean
  state: 'active' | 'archived' | 'trash' | 'overdue'
  updatedAt: string
  syncStatus: SyncStatus
}

export interface AppSettings {
  theme: ThemeKey
  initialized: boolean
  installPromptDismissed: boolean
  defaultView: AppView
  defaultPriority: Priority
  defaultSort: 'smart' | 'updated' | 'due' | 'title'
  exportFormat: ExportFormat
  showArchived: boolean
  notificationPermission: NotificationState
  activeTag: string | null
  selectedView: NoteView
  sidebarCollapsed: boolean
  lastSyncCursor: string | null
}

export interface ImportPreview {
  notes: Note[]
  conflicts: Array<{
    incoming: Note
    existing: Note
  }>
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: DEFAULT_THEME,
  initialized: false,
  installPromptDismissed: false,
  defaultView: 'dashboard',
  defaultPriority: 'normal',
  defaultSort: 'smart',
  exportFormat: 'json',
  showArchived: false,
  notificationPermission: 'default',
  activeTag: null,
  selectedView: 'all',
  sidebarCollapsed: false,
  lastSyncCursor: null,
}

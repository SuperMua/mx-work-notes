import { createRouter, createWebHistory } from 'vue-router'

import { useAdminAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { title: '后台登录' } },
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { title: '数据看板' } },
    { path: '/users', name: 'users', component: () => import('@/views/UsersView.vue'), meta: { title: '账号管理' } },
    { path: '/workspaces', name: 'workspaces', component: () => import('@/views/WorkspacesView.vue'), meta: { title: '工作区管理' } },
    { path: '/members', name: 'members', component: () => import('@/views/MembersView.vue'), meta: { title: '成员管理' } },
    { path: '/notes', name: 'notes', component: () => import('@/views/NotesView.vue'), meta: { title: '便签管理' } },
    { path: '/templates', name: 'templates', component: () => import('@/views/TemplatesView.vue'), meta: { title: '模板管理' } },
    { path: '/tags', name: 'tags', component: () => import('@/views/TagsView.vue'), meta: { title: '标签管理' } },
    { path: '/sync', name: 'sync', component: () => import('@/views/SyncView.vue'), meta: { title: '同步监控' } },
  ],
})

router.beforeEach((to) => {
  const authStore = useAdminAuthStore()
  authStore.initialize()

  if (to.name === 'login') {
    if (authStore.isAuthenticated && authStore.canAccessAdmin) {
      return '/dashboard'
    }
    return true
  }

  if (!authStore.isAuthenticated || !authStore.canAccessAdmin) {
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    }
  }

  return true
})

export default router

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const authStore = useAuthStore()
const AppShell = defineAsyncComponent(() => import('@/components/AppShell.vue'))

const showShell = computed(() => route.name !== 'login' && authStore.isAuthenticated)

onMounted(async () => {
  await authStore.initialize()
})
</script>

<template>
  <AppShell v-if="showShell" />
  <RouterView v-else />
</template>

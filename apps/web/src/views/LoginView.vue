<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { APP_NAME, DEFAULT_THEME, WEB_THEME_STORAGE_KEY } from '@shared'

import BrandAuthLayout from '@/components/ui/BrandAuthLayout.vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const mode = ref<'login' | 'register'>('login')
const email = ref('')
const password = ref('')
const name = ref('')
const status = ref('')
const statusTone = ref<'success' | 'error'>('success')

const panelTitle = computed(() => (mode.value === 'login' ? '登录' : '创建账号'))

const submitLabel = computed(() => {
  if (authStore.loading) {
    return '正在提交...'
  }

  return mode.value === 'login' ? '登录并进入工作台' : '注册并进入工作台'
})

function applyLoginTheme() {
  if (typeof window === 'undefined') {
    return
  }

  const storedTheme = localStorage.getItem(WEB_THEME_STORAGE_KEY)
  const theme = storedTheme === 'dark-workbench' ? 'dark-workbench' : DEFAULT_THEME
  document.body.className = `theme-${theme}`
}

watch(mode, () => {
  status.value = ''
  statusTone.value = 'success'
})

onMounted(() => {
  applyLoginTheme()
})

async function submit() {
  status.value = ''
  statusTone.value = 'success'

  try {
    if (mode.value === 'login') {
      await authStore.login({
        email: email.value,
        password: password.value,
      })
      status.value = '登录成功，正在进入工作台。'
    } else {
      await authStore.register({
        email: email.value,
        password: password.value,
        name: name.value,
      })
      status.value = '注册成功，正在进入工作台。'
    }

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    await router.push(redirect)
  } catch (error) {
    statusTone.value = 'error'
    status.value = error instanceof Error ? error.message : '请求失败，请稍后重试。'
  }
}
</script>

<template>
  <BrandAuthLayout :title="APP_NAME" copy="登录后进入你的工作面。">
    <section class="auth-panel-shell">
      <section class="surface-inspector auth-panel">
        <header class="auth-panel-head">
          <h2>{{ panelTitle }}</h2>

          <div class="auth-segmented" role="tablist" aria-label="身份模式切换">
            <button
              class="auth-tab"
              :class="{ active: mode === 'login' }"
              data-testid="auth-mode-login"
              type="button"
              @click="mode = 'login'"
            >
              登录
            </button>
            <button
              class="auth-tab"
              :class="{ active: mode === 'register' }"
              data-testid="auth-mode-register"
              type="button"
              @click="mode = 'register'"
            >
              注册
            </button>
          </div>
        </header>

        <form class="auth-form" @submit.prevent="submit">
          <div class="auth-status-slot">
            <Transition name="auth-status-fade">
              <div
                v-if="status"
                class="auth-status"
                :class="{ error: statusTone === 'error' }"
                data-testid="auth-status-box"
                role="status"
              >
                {{ status }}
              </div>
            </Transition>
          </div>

          <div class="auth-fields">
            <div class="auth-name-slot" :class="{ active: mode === 'register' }" :aria-hidden="mode !== 'register'">
              <div class="auth-name-slot-inner">
                <label class="auth-field auth-field-full auth-name-field">
                  <span>姓名</span>
                  <input
                    v-model="name"
                    class="field"
                    data-testid="auth-name"
                    autocomplete="name"
                    :disabled="mode !== 'register'"
                    :tabindex="mode === 'register' ? 0 : -1"
                    placeholder="请输入姓名"
                  />
                </label>
              </div>
            </div>

            <label class="auth-field auth-field-full">
              <span>邮箱</span>
              <input
                v-model="email"
                class="field"
                data-testid="auth-email"
                autocomplete="email"
                placeholder="请输入邮箱"
              />
            </label>

            <label class="auth-field auth-field-full">
              <span>密码</span>
              <input
                v-model="password"
                class="field"
                data-testid="auth-password"
                :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
                type="password"
                placeholder="请输入密码"
              />
            </label>
          </div>

          <button class="btn btn-primary submit-btn" data-testid="auth-submit" :disabled="authStore.loading" type="submit">
            {{ submitLabel }}
          </button>
        </form>
      </section>
    </section>
  </BrandAuthLayout>
</template>

<style scoped>
.auth-panel-shell {
  position: relative;
  width: min(530px, 100%);
  padding: 0.9rem 0;
}

.auth-panel-shell::before,
.auth-panel-shell::after {
  content: '';
  position: absolute;
  pointer-events: none;
}

.auth-panel-shell::before {
  inset: 1.2rem -0.9rem 0.35rem 3.2rem;
  border-radius: 36px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--surface-strong) 74%, transparent), color-mix(in srgb, var(--sheet) 58%, transparent));
  opacity: 0.72;
  box-shadow: var(--shadow-soft);
}

.auth-panel-shell::after {
  inset: 0.35rem 0.8rem 1.1rem -0.4rem;
  border-radius: 34px;
  border: 1px solid color-mix(in srgb, var(--border) 66%, transparent);
  opacity: 0.56;
}

.auth-panel {
  position: relative;
  width: 100%;
  padding: 1.55rem;
  border-radius: calc(var(--radius-xl) - 4px);
  display: grid;
  gap: 1.15rem;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--inspector) 98%, transparent), color-mix(in srgb, var(--panel-bg) 92%, transparent));
  box-shadow: 0 24px 64px rgba(24, 32, 46, 0.1);
  overflow: hidden;
}

.auth-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--accent-soft-strong) 48%, transparent), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.2), transparent 22%);
  opacity: 0.72;
  pointer-events: none;
}

.auth-panel-head {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.9rem;
}

.auth-panel-head h2 {
  font-size: 2.1rem;
  line-height: 0.98;
  letter-spacing: -0.06em;
}

.auth-segmented {
  width: fit-content;
  display: inline-grid;
  grid-template-columns: repeat(2, minmax(108px, 1fr));
  gap: 0.24rem;
  padding: 0.24rem;
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--border) 86%, transparent);
  background: color-mix(in srgb, var(--surface-strong) 64%, transparent);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.auth-tab {
  min-height: 2.75rem;
  border-radius: 14px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-soft);
  font-weight: 600;
  letter-spacing: 0.03em;
  transition:
    transform 180ms ease,
    background 180ms ease,
    color 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.auth-tab:hover {
  transform: translateY(-1px);
  color: var(--heading);
}

.auth-tab.active {
  color: #fff;
  border-color: color-mix(in srgb, var(--accent-strong) 72%, transparent);
  background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 92%, #fff 8%), var(--accent-strong));
  box-shadow: 0 10px 22px rgba(32, 45, 67, 0.14);
}

.auth-form {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 1rem;
  min-height: 23.25rem;
}

.auth-status-slot {
  min-height: 0;
}

.auth-status {
  padding: 0.78rem 0.9rem;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--success) 18%, var(--border));
  background: color-mix(in srgb, var(--success) 8%, var(--surface-strong));
  color: var(--heading);
  line-height: 1.6;
  font-size: 0.92rem;
}

.auth-status.error {
  border-color: color-mix(in srgb, var(--danger) 22%, var(--border));
  background: color-mix(in srgb, var(--danger) 8%, var(--surface-strong));
  color: var(--danger);
}

.auth-fields {
  display: grid;
  gap: 0.86rem;
  align-content: start;
}

.auth-name-slot {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transform: translateY(-6px);
  will-change: grid-template-rows, opacity, transform;
  transition:
    grid-template-rows 220ms cubic-bezier(0.2, 0.72, 0.22, 1),
    opacity 160ms ease,
    transform 220ms cubic-bezier(0.2, 0.72, 0.22, 1);
}

.auth-name-slot.active {
  grid-template-rows: 1fr;
  opacity: 1;
  transform: translateY(0);
}

.auth-name-slot-inner {
  overflow: hidden;
}

.auth-field {
  display: grid;
  gap: 0.42rem;
}

.auth-field span {
  color: var(--text-soft);
  font-size: 0.84rem;
  letter-spacing: 0.06em;
}

.auth-field-full {
  grid-column: 1 / -1;
}

.auth-name-field {
  padding-top: 0.02rem;
}

.auth-panel .field {
  min-height: 3.55rem;
  padding: 0.98rem 1rem;
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(248, 243, 234, 0.72));
}

:global(body.theme-dark-workbench) .auth-panel .field {
  background:
    linear-gradient(180deg, rgba(28, 34, 45, 0.94), rgba(21, 26, 34, 0.96));
}

.submit-btn {
  width: 100%;
  min-height: 3.6rem;
  font-size: 1rem;
  margin-top: 0.1rem;
}

.auth-status-fade-enter-active,
.auth-status-fade-leave-active {
  transition:
    opacity 160ms ease,
    transform 220ms cubic-bezier(0.2, 0.72, 0.22, 1);
}

.auth-status-fade-enter-from,
.auth-status-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 720px) {
  .auth-panel-shell {
    width: 100%;
    padding: 0;
  }

  .auth-panel-shell::before,
  .auth-panel-shell::after {
    display: none;
  }

  .auth-panel {
    width: 100%;
    padding: 1.1rem;
    border-radius: calc(var(--radius-lg) + 2px);
  }

  .auth-panel-head h2 {
    font-size: 1.7rem;
  }

  .auth-segmented {
    width: 100%;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .auth-tab {
    min-height: 2.9rem;
  }

  .auth-form {
    min-height: 21.85rem;
  }

  .auth-fields {
    gap: 0.8rem;
  }

  .submit-btn {
    min-height: 3.25rem;
  }
}
</style>

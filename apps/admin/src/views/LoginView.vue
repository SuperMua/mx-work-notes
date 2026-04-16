<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { ADMIN_APP_NAME } from '@shared'

import { useAdminAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAdminAuthStore()

const email = ref('')
const password = ref('')
const message = ref('')

const redirectTarget = computed(() => {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect ? redirect : '/dashboard'
})

const messageText = computed(() => authStore.error || message.value)
const messageTone = computed(() => (authStore.error ? 'error' : 'success'))

async function submit() {
  authStore.clearError()
  message.value = ''

  try {
    await authStore.login({
      email: email.value,
      password: password.value,
    })
    message.value = '登录成功，正在进入后台。'
    await router.push(redirectTarget.value)
  } catch (error) {
    message.value = error instanceof Error ? error.message : '登录失败，请检查账号或接口状态。'
  }
}
</script>

<template>
  <section class="admin-auth-shell">
    <aside class="surface-rail admin-auth-hero">
      <div class="admin-auth-frame" />

      <header class="admin-auth-top">
        <div class="admin-auth-mark">MX</div>
      </header>

      <div class="admin-auth-copy">
        <h1>{{ ADMIN_APP_NAME }}</h1>
        <p>验证后进入管理台。</p>
      </div>

      <div class="admin-auth-structure" aria-hidden="true">
        <div class="structure-band" />

        <div class="structure-columns">
          <div class="structure-column structure-column-tall" />
          <div class="structure-column structure-column-mid" />
          <div class="structure-column structure-column-short" />
        </div>

        <div class="structure-footer">
          <span />
          <span />
          <span />
        </div>
      </div>
    </aside>

    <main class="admin-auth-stage">
      <article class="surface-inspector admin-auth-panel">
        <div class="admin-auth-panel-head">
          <h2>登录后台</h2>
        </div>

        <form class="admin-auth-form" @submit.prevent="submit">
          <div class="admin-auth-status-slot">
            <Transition name="admin-status-fade">
              <div
                v-if="messageText"
                class="admin-auth-status"
                :class="{ error: messageTone === 'error' }"
                data-testid="admin-status"
                role="status"
              >
                {{ messageText }}
              </div>
            </Transition>
          </div>

          <div class="admin-auth-fields">
            <label class="admin-auth-field">
              <span>邮箱</span>
              <input
                v-model="email"
                class="field"
                data-testid="admin-email"
                autocomplete="email"
                placeholder="请输入后台账号邮箱"
              />
            </label>

            <label class="admin-auth-field">
              <span>密码</span>
              <input
                v-model="password"
                class="field"
                data-testid="admin-password"
                autocomplete="current-password"
                type="password"
                placeholder="请输入后台密码"
              />
            </label>
          </div>

          <button class="btn btn-primary admin-auth-submit" data-testid="admin-submit" :disabled="authStore.loading" type="submit">
            {{ authStore.loading ? '登录中...' : '登录后台' }}
          </button>
        </form>
      </article>
    </main>
  </section>
</template>

<style scoped>
.admin-auth-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(440px, 0.92fr);
  gap: 1.1rem;
  padding: 1.25rem;
}

.admin-auth-hero {
  position: relative;
  min-height: calc(100vh - 2.5rem);
  padding: 1.55rem;
  border-radius: 38px;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 1.4rem;
  background:
    radial-gradient(circle at 82% 14%, color-mix(in srgb, var(--accent-soft) 78%, transparent), transparent 26%),
    linear-gradient(180deg, color-mix(in srgb, var(--rail) 94%, transparent), color-mix(in srgb, var(--panel) 94%, transparent));
}

.admin-auth-frame {
  position: absolute;
  inset: 18px;
  border-radius: 30px;
  border: 1px solid color-mix(in srgb, var(--border) 92%, transparent);
  opacity: 0.68;
  pointer-events: none;
}

.admin-auth-top,
.admin-auth-mark,
.admin-auth-copy,
.admin-auth-structure,
.admin-auth-stage {
  position: relative;
  z-index: 1;
}

.admin-auth-top {
  display: flex;
  align-items: flex-start;
}

.admin-auth-mark {
  width: 4.05rem;
  height: 4.05rem;
  border-radius: 1.35rem;
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-size: 1.55rem;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  box-shadow: var(--shadow-soft);
}

.admin-auth-copy {
  align-self: end;
  display: grid;
  gap: 0.75rem;
  max-width: 28rem;
}

.admin-auth-copy h1 {
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--heading);
  font-size: clamp(3.7rem, 6.8vw, 5.8rem);
  line-height: 0.88;
  letter-spacing: -0.09em;
  max-width: 6.6ch;
}

.admin-auth-copy p {
  color: color-mix(in srgb, var(--text-muted) 86%, transparent);
  line-height: 1.55;
  max-width: 13rem;
}

.admin-auth-structure {
  min-height: 254px;
  border-radius: 30px;
  border: 1px solid color-mix(in srgb, var(--border) 90%, transparent);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--panel-strong) 92%, transparent), color-mix(in srgb, var(--panel) 88%, transparent));
  padding: 1rem;
  display: grid;
  gap: 0.85rem;
  overflow: hidden;
}

.structure-band,
.structure-column,
.structure-footer span {
  border-radius: 22px;
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  background: linear-gradient(180deg, color-mix(in srgb, var(--panel) 88%, transparent), color-mix(in srgb, var(--surface-hover) 66%, transparent));
}

.structure-band {
  min-height: 64px;
  position: relative;
}

.structure-band::before,
.structure-band::after,
.structure-column::before,
.structure-column::after {
  content: '';
  position: absolute;
  left: 1rem;
  right: 1rem;
  height: 1px;
  background: color-mix(in srgb, var(--line) 74%, transparent);
}

.structure-band::before {
  top: 18px;
}

.structure-band::after {
  top: 34px;
}

.structure-columns {
  display: grid;
  grid-template-columns: 1.2fr 0.95fr 0.8fr;
  gap: 0.85rem;
  align-items: end;
  flex: 1;
}

.structure-column {
  position: relative;
  overflow: hidden;
}

.structure-column::before {
  top: 18px;
}

.structure-column::after {
  top: 44px;
}

.structure-column-tall {
  min-height: 142px;
}

.structure-column-mid {
  min-height: 122px;
}

.structure-column-short {
  min-height: 96px;
}

.structure-footer {
  display: grid;
  grid-template-columns: 1.2fr 0.9fr 0.74fr;
  gap: 0.75rem;
}

.structure-footer span {
  min-height: 18px;
}

.admin-auth-stage {
  position: relative;
  min-height: calc(100vh - 2.5rem);
  display: grid;
  place-items: center;
  padding: 2.2rem 1.4rem;
}

.admin-auth-stage::before,
.admin-auth-stage::after {
  content: '';
  position: absolute;
  pointer-events: none;
}

.admin-auth-stage::before {
  inset: 1rem 0.55rem;
  border-radius: 38px;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--mask) 70%, transparent), color-mix(in srgb, var(--panel) 56%, transparent));
  opacity: 0.8;
}

.admin-auth-stage::after {
  inset: 2.4rem auto 2.4rem 3rem;
  width: 1px;
  background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--line) 78%, transparent) 14%, color-mix(in srgb, var(--line) 78%, transparent) 86%, transparent);
  opacity: 0.7;
}

.admin-auth-panel {
  position: relative;
  width: min(430px, 100%);
  padding: 1.5rem;
  border-radius: 34px;
  display: grid;
  align-content: center;
  gap: 1rem;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--panel) 98%, transparent), color-mix(in srgb, var(--panel-strong) 90%, transparent));
  box-shadow: 0 24px 60px rgba(18, 24, 38, 0.14);
  overflow: hidden;
}

.admin-auth-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--accent-soft) 42%, transparent), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.14), transparent 18%);
  opacity: 0.7;
  pointer-events: none;
}

.admin-auth-panel-head h2 {
  position: relative;
  z-index: 1;
  font-size: 2.05rem;
  line-height: 0.98;
  letter-spacing: -0.06em;
  color: var(--heading);
}

.admin-auth-form {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 1rem;
}

.admin-auth-status-slot {
  min-height: 0;
}

.admin-auth-fields {
  display: grid;
  gap: 0.9rem;
}

.admin-auth-field {
  display: grid;
  gap: 0.45rem;
}

.admin-auth-field span {
  color: var(--text-soft);
  font-size: 0.84rem;
  letter-spacing: 0.06em;
}

.admin-auth-status {
  padding: 0.78rem 0.9rem;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--success) 20%, var(--border));
  background: color-mix(in srgb, var(--success) 8%, var(--panel-strong));
  color: var(--heading);
  line-height: 1.6;
  font-size: 0.92rem;
}

.admin-auth-status.error {
  border-color: color-mix(in srgb, var(--danger) 24%, var(--border));
  background: color-mix(in srgb, var(--danger) 8%, var(--panel-strong));
  color: var(--danger);
}

.admin-auth-panel .field {
  min-height: 3.5rem;
  padding: 0.96rem 1rem;
  border-radius: 20px;
}

:global(body.theme-dark-workbench) .admin-auth-panel .field {
  background:
    linear-gradient(180deg, rgba(28, 34, 45, 0.94), rgba(21, 26, 34, 0.96));
}

.admin-auth-submit {
  width: 100%;
  min-height: 3.55rem;
  font-size: 1rem;
}

.admin-status-fade-enter-active,
.admin-status-fade-leave-active {
  transition: all var(--transition-fast);
}

.admin-status-fade-enter-from,
.admin-status-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 1180px) {
  .admin-auth-shell {
    grid-template-columns: 1fr;
  }

  .admin-auth-hero,
  .admin-auth-stage {
    min-height: auto;
  }

  .admin-auth-stage::after {
    display: none;
  }
}

@media (max-width: 720px) {
  .admin-auth-shell {
    padding: 0.9rem;
    gap: 0.9rem;
  }

  .admin-auth-hero,
  .admin-auth-stage {
    padding: 1.1rem;
  }

  .admin-auth-hero {
    border-radius: 30px;
  }

  .admin-auth-frame {
    inset: 12px;
    border-radius: 24px;
  }

  .admin-auth-mark {
    width: 3.3rem;
    height: 3.3rem;
    border-radius: 1.15rem;
    font-size: 1.3rem;
  }

  .admin-auth-copy h1 {
    font-size: clamp(2.8rem, 15vw, 4.4rem);
  }

  .admin-auth-structure {
    min-height: 186px;
  }

  .structure-columns,
  .structure-footer {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .admin-auth-stage {
    padding: 0;
    min-height: auto;
  }

  .admin-auth-stage::before {
    inset: 0.2rem;
    border-radius: 30px;
  }

  .admin-auth-panel {
    width: 100%;
    padding: 1.1rem;
    border-radius: 30px;
  }

  .admin-auth-panel-head h2 {
    font-size: 1.7rem;
  }
}
</style>

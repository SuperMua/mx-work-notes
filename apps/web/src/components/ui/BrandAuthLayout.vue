<script setup lang="ts">
defineProps<{
  eyebrow?: string
  title: string
  copy?: string
}>()
</script>

<template>
  <section class="auth-layout">
    <aside class="surface-rail auth-brand">
      <div class="auth-brand-frame" />

      <header class="auth-brand-top">
        <div class="auth-brand-mark">MX</div>
      </header>

      <div class="auth-brand-body">
        <div class="auth-copy-stack">
          <p v-if="eyebrow" class="page-eyebrow auth-kicker">{{ eyebrow }}</p>
          <h1 class="brand-title">{{ title }}</h1>
          <p v-if="copy" class="brand-copy">{{ copy }}</p>
        </div>

        <div class="auth-atmosphere" aria-hidden="true">
          <div class="auth-haze" />
          <div class="auth-axis auth-axis-upper" />
          <div class="auth-axis auth-axis-lower" />
          <div class="auth-plinth" />
          <div class="auth-monolith" />
        </div>
      </div>

      <div v-if="$slots.details" class="brand-detail">
        <slot name="details" />
      </div>
    </aside>

    <main class="auth-stage">
      <slot />
    </main>
  </section>
</template>

<style scoped>
.auth-layout {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1.18fr) minmax(460px, 0.82fr);
  gap: 1.1rem;
  padding: 1.15rem;
}

.auth-brand {
  position: relative;
  min-height: calc(100vh - 2.3rem);
  padding: 1.55rem;
  border-radius: calc(var(--radius-xl) + 8px);
  overflow: hidden;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 1.2rem;
  background:
    radial-gradient(circle at 84% 18%, color-mix(in srgb, var(--accent-soft-strong) 62%, transparent), transparent 30%),
    linear-gradient(180deg, color-mix(in srgb, var(--rail) 96%, transparent), color-mix(in srgb, var(--section) 92%, transparent));
  animation: auth-fade-in 520ms cubic-bezier(0.2, 0.9, 0.2, 1);
}

.auth-brand-frame {
  position: absolute;
  inset: 16px;
  border-radius: calc(var(--radius-xl) + 2px);
  border: 1px solid color-mix(in srgb, var(--border) 86%, transparent);
  opacity: 0.74;
  pointer-events: none;
}

.auth-brand-top,
.auth-brand-body,
.brand-detail {
  position: relative;
  z-index: 1;
}

.auth-brand-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.auth-brand-mark {
  width: 4rem;
  height: 4rem;
  border-radius: 1.35rem;
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.58rem;
  letter-spacing: -0.04em;
  color: #fff;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  box-shadow: var(--shadow-float);
}

.auth-brand-body {
  min-height: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: stretch;
}

.auth-copy-stack {
  grid-area: 1 / 1;
  display: grid;
  justify-self: center;
  align-self: center;
  place-items: center;
  gap: 0.9rem;
  width: min(100%, 46rem);
  padding: 0 2.4rem;
  text-align: center;
  z-index: 2;
}

.auth-kicker {
  color: var(--text-soft);
}

.brand-title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(4.4rem, 7.2vw, 7.2rem);
  line-height: 0.88;
  letter-spacing: -0.1em;
  white-space: nowrap;
  width: fit-content;
  max-width: 100%;
  margin-inline: auto;
}

.brand-copy {
  max-width: 18rem;
  color: color-mix(in srgb, var(--text-muted) 88%, transparent);
  line-height: 1.55;
  font-size: 0.9rem;
  margin-inline: auto;
}

.auth-atmosphere {
  grid-area: 1 / 1;
  position: relative;
  min-height: clamp(340px, 56vh, 680px);
  overflow: hidden;
}

.auth-haze {
  position: absolute;
  inset: 10% -6% auto auto;
  width: 62%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--accent-soft-strong) 94%, transparent), transparent 72%);
  filter: blur(22px);
  opacity: 0.78;
}

.auth-axis {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: color-mix(in srgb, var(--line) 74%, transparent);
}

.auth-axis-upper {
  top: 28%;
  opacity: 0.46;
}

.auth-axis-lower {
  bottom: 20%;
  opacity: 0.62;
}

.auth-plinth,
.auth-monolith {
  position: absolute;
  border: 1px solid color-mix(in srgb, var(--border-strong) 78%, transparent);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--panel-bg) 98%, transparent), color-mix(in srgb, var(--surface-strong) 88%, transparent));
}

.auth-plinth {
  left: 0;
  right: 14%;
  bottom: 2%;
  height: 34%;
  border-radius: 30px;
  box-shadow: 0 18px 42px rgba(22, 28, 38, 0.08);
}

.auth-plinth::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(color-mix(in srgb, var(--line) 38%, transparent) 1px, transparent 1px) 0 0 / 100% 34px,
    linear-gradient(90deg, color-mix(in srgb, var(--line) 28%, transparent) 1px, transparent 1px) 0 0 / 34px 100%;
  opacity: 0.28;
}

.auth-monolith {
  right: 6%;
  bottom: 8%;
  width: 43%;
  height: 72%;
  border-radius: 34px;
  box-shadow: var(--shadow-soft);
}

.auth-monolith::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.38), transparent 22%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.16), transparent 22%);
  opacity: 0.58;
}

.auth-monolith::after {
  content: '';
  position: absolute;
  right: 8%;
  top: 8%;
  bottom: 8%;
  width: 1px;
  background: color-mix(in srgb, var(--line) 58%, transparent);
  opacity: 0.52;
}

.brand-detail {
  display: grid;
  gap: 0.75rem;
}

.auth-stage {
  position: relative;
  min-height: calc(100vh - 2.3rem);
  display: grid;
  place-items: center;
  padding: 2.2rem 1.45rem;
}

.auth-stage::before {
  content: '';
  position: absolute;
  inset: 1.1rem 0.6rem;
  border-radius: calc(var(--radius-xl) + 2px);
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--mask) 72%, transparent), color-mix(in srgb, var(--canvas) 52%, transparent));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28);
  opacity: 0.78;
  pointer-events: none;
}

.auth-stage > * {
  position: relative;
  z-index: 1;
}

@keyframes auth-fade-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

:global(body.theme-dark-workbench) .auth-brand {
  background:
    radial-gradient(circle at 84% 18%, color-mix(in srgb, var(--accent-soft-strong) 82%, transparent), transparent 30%),
    linear-gradient(180deg, color-mix(in srgb, var(--rail) 96%, transparent), color-mix(in srgb, var(--section) 96%, transparent));
}

:global(body.theme-dark-workbench) .auth-plinth,
:global(body.theme-dark-workbench) .auth-monolith {
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--panel-bg) 96%, transparent), color-mix(in srgb, var(--surface-strong) 78%, transparent));
  box-shadow: 0 26px 54px rgba(0, 0, 0, 0.24);
}

@media (max-width: 1220px) {
  .auth-layout {
    grid-template-columns: 1fr;
  }

  .auth-brand,
  .auth-stage {
    min-height: auto;
  }

  .auth-brand {
    padding: 1.35rem;
    gap: 1rem;
  }

  .auth-brand-body {
    min-height: 420px;
  }

  .auth-copy-stack {
    width: min(100%, 40rem);
    padding-inline: 1.6rem;
  }

  .brand-title {
    font-size: clamp(3.5rem, 8.6vw, 5.4rem);
  }

  .brand-copy {
    max-width: 20rem;
  }

  .auth-atmosphere {
    min-height: 260px;
  }

  .auth-monolith {
    width: 36%;
    height: 78%;
  }
}

@media (max-width: 720px) {
  .auth-layout {
    padding: 0.85rem;
    gap: 0.85rem;
  }

  .auth-brand {
    border-radius: calc(var(--radius-lg) + 4px);
    padding: 1rem;
  }

  .auth-brand-frame {
    inset: 12px;
    border-radius: calc(var(--radius-lg) - 1px);
  }

  .auth-brand-mark {
    width: 3.15rem;
    height: 3.15rem;
    border-radius: 1.05rem;
    font-size: 1.24rem;
  }

  .brand-title {
    font-size: clamp(2.5rem, 11.5vw, 4rem);
    letter-spacing: -0.08em;
  }

  .brand-copy {
    max-width: none;
    font-size: 0.88rem;
  }

  .auth-atmosphere {
    min-height: 152px;
  }

  .auth-plinth {
    right: 0;
    height: 40%;
    border-radius: 22px;
  }

  .auth-monolith {
    width: 40%;
    height: 70%;
    border-radius: 22px;
  }

  .auth-stage {
    min-height: auto;
    place-items: stretch;
    padding-block: 0;
  }

  .auth-stage::before {
    inset: 0.15rem;
    border-radius: calc(var(--radius-lg) + 2px);
  }
}
</style>

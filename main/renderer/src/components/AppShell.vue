<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { StudyStage } from '@core/types/curriculum'
import { STUDY_STAGES, SUBJECTS, stageLabel } from '@core/types/curriculum'
import { useSettingsStore } from '../stores/settings'

const route = useRoute()
const settingsStore = useSettingsStore()

const navItems = [
  { path: '/', label: '首页', icon: 'M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z' },
  { path: '/plan', label: '计划', icon: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4' },
  { path: '/qa', label: '答疑', icon: 'M4 8h3l2-2h6l2 2h3v11H4zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' },
  { path: '/chat', label: '对话', icon: 'M4 5h16v11H9l-5 4z' },
  { path: '/writing', label: '批改', icon: 'M5 19h4L20 8l-4-4L5 15zM14 6l4 4' },
  { path: '/mindmap', label: '导图', icon: 'M4 5h6v4H4zM14 3h6v4h-6zM14 15h6v4h-6zM10 7h4M13 5v11h1' },
  { path: '/cards', label: '卡片', icon: 'M6 3h12v18H6zM9 8h6M9 12h6M9 16h4' },
  { path: '/mistakes', label: '错题', icon: 'M6 3h12v18H6zM9 9l6 6M15 9l-6 6' },
  { path: '/settings', label: '设置', icon: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2' }
]

const activePath = computed(() => route.path)
const pageTitle = computed(() => String(route.meta.title ?? '首页'))
const stageText = computed(() => stageLabel(settingsStore.settings.stage))

async function onStageChange(event: Event): Promise<void> {
  const value = (event.target as HTMLSelectElement).value as StudyStage
  await settingsStore.update({ stage: value })
}

async function onSubjectChange(event: Event): Promise<void> {
  await settingsStore.update({ subject: (event.target as HTMLSelectElement).value })
}
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="logo">S</span>
        <div class="brand-text">
          <strong>dxx's StudyPal</strong>
          <small>全学科 AI 学习伴侣</small>
        </div>
      </div>

      <nav class="nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: activePath === item.path }"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path :d="item.icon" />
          </svg>
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="sidebar-foot">
        <label class="foot-label" for="stage-select">学段</label>
        <select id="stage-select" :value="settingsStore.settings.stage" @change="onStageChange">
          <option v-for="stage in STUDY_STAGES" :key="stage.id" :value="stage.id">{{ stage.label }}</option>
        </select>

        <label class="foot-label" for="subject-select">学科</label>
        <select id="subject-select" :value="settingsStore.settings.subject" @change="onSubjectChange">
          <option v-for="subject in SUBJECTS" :key="subject.id" :value="subject.id">{{ subject.label }}</option>
        </select>

        <p class="privacy">本地优先 · 无广告 · 数据不上传</p>
      </div>
    </aside>

    <main class="main">
      <header class="topbar">
        <div>
          <p class="eyebrow">dxx's StudyPal</p>
          <h1>{{ pageTitle }}</h1>
        </div>
        <div class="top-actions">
          <span class="badge">{{ stageText }}</span>
          <RouterLink to="/settings" class="btn sm ghost hide-mobile">设置</RouterLink>
        </div>
      </header>

      <div class="content">
        <slot />
      </div>
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 232px minmax(0, 1fr);
  min-height: 100vh;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px 14px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  position: sticky;
  top: 0;
  height: 100vh;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 6px;
}

.logo {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  background: linear-gradient(135deg, var(--brand), #7aa2ff);
  color: #fff;
  font-weight: 700;
  display: grid;
  place-items: center;
  font-size: 18px;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.brand-text small {
  color: var(--muted);
  font-size: 11.5px;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 10px;
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.15s ease, color 0.15s ease;
}

.nav-item svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linejoin: round;
  stroke-linecap: round;
  flex: none;
}

.nav-item:hover {
  background: var(--surface-2);
  color: var(--text);
}

.nav-item.active {
  background: var(--brand-weak);
  color: var(--brand-strong);
}

.sidebar-foot {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px solid var(--border);
  padding-top: 14px;
}

.foot-label {
  font-size: 12px;
  color: var(--muted);
  font-weight: 600;
}

.sidebar-foot select {
  padding: 6px 10px;
  font-size: 13px;
}

.privacy {
  margin: 8px 0 0;
  font-size: 11.5px;
  color: var(--muted);
  line-height: 1.5;
}

.main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 26px 10px;
  position: sticky;
  top: 0;
  z-index: 5;
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: blur(10px);
}

.eyebrow {
  margin: 0 0 2px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.topbar h1 {
  font-size: 21px;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.content {
  padding: 6px 26px 40px;
  min-width: 0;
}

@media (max-width: 880px) {
  .shell {
    grid-template-columns: 1fr;
    padding-bottom: calc(64px + env(safe-area-inset-bottom));
  }

  .sidebar {
    position: fixed;
    inset: auto 0 0 0;
    height: auto;
    flex-direction: row;
    align-items: center;
    padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
    border-right: none;
    border-top: 1px solid var(--border);
    z-index: 20;
    overflow: hidden;
  }

  .brand,
  .privacy {
    display: none;
  }

  .nav {
    flex-direction: row;
    overflow-x: auto;
    gap: 2px;
    scrollbar-width: none;
    padding-bottom: 0;
  }

  .nav::-webkit-scrollbar {
    display: none;
  }

  .nav-item {
    flex-direction: column;
    gap: 2px;
    padding: 6px 10px;
    font-size: 10.5px;
    min-width: 52px;
  }

  .nav-item svg {
    width: 20px;
    height: 20px;
  }

  .sidebar-foot {
    display: none;
  }

  .topbar {
    padding: 14px 16px 8px;
  }

  .topbar h1 {
    font-size: 19px;
  }

  .content {
    padding: 4px 14px 28px;
  }
}
</style>

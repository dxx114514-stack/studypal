import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('../views/HomeView.vue'), meta: { title: '首页' } },
  { path: '/plan', name: 'plan', component: () => import('../views/PlanView.vue'), meta: { title: '学习计划' } },
  { path: '/qa', name: 'qa', component: () => import('../views/QaView.vue'), meta: { title: '拍照答疑' } },
  { path: '/chat', name: 'chat', component: () => import('../views/ChatView.vue'), meta: { title: 'AI 对话' } },
  { path: '/writing', name: 'writing', component: () => import('../views/WritingView.vue'), meta: { title: '写作批改' } },
  { path: '/mindmap', name: 'mindmap', component: () => import('../views/MindMapView.vue'), meta: { title: '思维导图' } },
  { path: '/cards', name: 'cards', component: () => import('../views/CardsView.vue'), meta: { title: '复习卡片' } },
  { path: '/mistakes', name: 'mistakes', component: () => import('../views/MistakesView.vue'), meta: { title: '错题本' } },
  { path: '/settings', name: 'settings', component: () => import('../views/SettingsView.vue'), meta: { title: '设置' } },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

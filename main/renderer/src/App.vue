<script setup lang="ts">
import { onMounted } from 'vue'
import AppShell from './components/AppShell.vue'
import { useSettingsStore } from './stores/settings'
import { useProvidersStore } from './stores/providers'

const settingsStore = useSettingsStore()
const providersStore = useProvidersStore()

onMounted(async () => {
  await settingsStore.load()
  await providersStore.refresh()
})
</script>

<template>
  <AppShell>
    <RouterView />
  </AppShell>
</template>

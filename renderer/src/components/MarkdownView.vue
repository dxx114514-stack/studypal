<script setup lang="ts">
import { computed } from 'vue'
import { parseThinking } from '@core/utils/thinking'
import { renderMarkdown } from '../services/markdown'

const props = defineProps<{ text: string }>()

const segments = computed(() =>
  parseThinking(props.text ?? '').map((segment) => ({
    ...segment,
    html: renderMarkdown(segment.content)
  }))
)
</script>

<template>
  <div class="markdown-body">
    <template v-for="(segment, index) in segments" :key="index">
      <details v-if="segment.type === 'think'" class="thinking">
        <summary>
          <span class="thinking-label">{{ segment.closed ? '思考过程' : '思考中…' }}</span>
          <span class="thinking-hint">{{ segment.closed ? '点击展开' : '' }}</span>
        </summary>
        <div class="thinking-body markdown-body" v-html="segment.html || '<p>（暂无内容）</p>'" />
      </details>
      <div v-else v-html="segment.html" />
    </template>
  </div>
</template>

<style scoped>
.thinking {
  margin: 10px 0;
  padding: 9px 13px;
  border: 1px dashed var(--border);
  border-radius: 10px;
  background: var(--surface-2);
}

.thinking summary {
  display: flex;
  align-items: center;
  gap: 8px;
  list-style: none;
  cursor: pointer;
  user-select: none;
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
}

.thinking summary::-webkit-details-marker {
  display: none;
}

.thinking summary::before {
  content: '▸';
  font-size: 11px;
  transition: transform 0.15s ease;
}

.thinking[open] summary::before {
  transform: rotate(90deg);
}

.thinking[open] summary {
  margin-bottom: 8px;
}

.thinking-hint {
  font-size: 12px;
  font-weight: 400;
  opacity: 0.65;
}

.thinking-body {
  font-size: 13.5px;
  color: var(--muted);
  border-top: 1px solid var(--border);
  padding-top: 8px;
}
</style>

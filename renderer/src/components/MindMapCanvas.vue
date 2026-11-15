<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { MindNode } from '@core/types/mindmap'
import { layoutTree } from '@core/markdown-tree/layout'

const props = defineProps<{ root: MindNode | null }>()

const svgRef = ref<SVGSVGElement | null>(null)
const viewport = reactive({ scale: 1, x: 0, y: 0 })
let drag: { x: number; y: number } | null = null

const layout = computed(() => (props.root ? layoutTree(props.root) : null))
const byId = computed(() => new Map((layout.value?.nodes ?? []).map((node) => [node.id, node])))
const transform = computed(() => `translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`)

function nodeFill(depth: number): string {
  if (depth === 0) return '#2f6fed'
  if (depth === 1) return '#e8f0ff'
  return '#f7faff'
}

function nodeStroke(depth: number): string {
  if (depth === 0) return '#2f6fed'
  if (depth === 1) return '#bed4ff'
  return '#dbe6f8'
}

function nodeTextColor(depth: number): string {
  return depth === 0 ? '#ffffff' : '#20304d'
}

function truncate(text: string, width: number): string {
  const max = Math.max(4, Math.floor((width - 24) / 9))
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function edgePath(fromId: string, toId: string): string {
  const from = byId.value.get(fromId)
  const to = byId.value.get(toId)
  if (!from || !to) return ''
  const x1 = from.x + from.width
  const y1 = from.y + from.height / 2
  const x2 = to.x
  const y2 = to.y + to.height / 2
  const mid = (x1 + x2) / 2
  return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`
}

function zoom(factor: number): void {
  const next = Math.min(2.6, Math.max(0.3, viewport.scale * factor))
  const ratio = next / viewport.scale
  viewport.scale = next
  viewport.x *= ratio
  viewport.y *= ratio
}

function onWheel(event: WheelEvent): void {
  zoom(event.deltaY > 0 ? 0.92 : 1.08)
}

function onPointerDown(event: PointerEvent): void {
  if (event.button !== 0) return
  drag = { x: event.clientX, y: event.clientY }
  ;(event.currentTarget as Element).setPointerCapture?.(event.pointerId)
}

function onPointerMove(event: PointerEvent): void {
  if (!drag) return
  viewport.x += event.clientX - drag.x
  viewport.y += event.clientY - drag.y
  drag = { x: event.clientX, y: event.clientY }
}

function onPointerUp(): void {
  drag = null
}

function reset(): void {
  viewport.scale = 1
  viewport.x = 0
  viewport.y = 0
}

defineExpose({
  getSvg: (): SVGSVGElement | null => svgRef.value
})
</script>

<template>
  <div class="canvas-wrap">
    <div class="toolbar">
      <button class="btn sm ghost" type="button" @click="zoom(1.15)">放大</button>
      <button class="btn sm ghost" type="button" @click="zoom(0.87)">缩小</button>
      <button class="btn sm ghost" type="button" @click="reset">重置</button>
      <span class="hint hide-mobile">滚轮缩放 · 拖拽平移</span>
    </div>

    <div v-if="layout" class="stage">
      <svg
        ref="svgRef"
        :viewBox="`0 0 ${layout.width} ${layout.height}`"
        class="canvas"
        @wheel.prevent="onWheel"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <rect :width="layout.width" :height="layout.height" fill="#ffffff" />
        <g :transform="transform">
          <path
            v-for="edge in layout.edges"
            :key="`${edge.from}-${edge.to}`"
            :d="edgePath(edge.from, edge.to)"
            fill="none"
            stroke="#b9c9e6"
            stroke-width="1.6"
          />
          <g v-for="node in layout.nodes" :key="node.id">
            <rect
              :x="node.x"
              :y="node.y"
              :width="node.width"
              :height="node.height"
              rx="10"
              :fill="nodeFill(node.depth)"
              :stroke="nodeStroke(node.depth)"
            />
            <text
              :x="node.x + 12"
              :y="node.y + node.height / 2 + 1"
              dominant-baseline="middle"
              :fill="nodeTextColor(node.depth)"
              font-size="13.5"
              font-family="-apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif"
            >
              {{ truncate(node.text, node.width) }}
            </text>
          </g>
        </g>
      </svg>
    </div>
    <div v-else class="empty">粘贴 Markdown 或让 AI 整理后，这里会显示思维导图</div>
  </div>
</template>

<style scoped>
.canvas-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stage {
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  height: 480px;
}

.canvas {
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: grab;
}

.canvas:active {
  cursor: grabbing;
}

@media (max-width: 880px) {
  .stage {
    height: 360px;
  }
}
</style>

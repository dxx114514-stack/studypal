<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ImageInput } from '@core/types/chat'
import { getPlatform } from '../services/platform'

const props = defineProps<{ modelValue: ImageInput | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: ImageInput | null] }>()

const busy = ref(false)
const errorMessage = ref('')

const previewUrl = computed(() =>
  props.modelValue ? `data:${props.modelValue.mimeType};base64,${props.modelValue.dataBase64}` : ''
)

async function pick(source: 'camera' | 'gallery'): Promise<void> {
  if (busy.value) return
  busy.value = true
  errorMessage.value = ''
  try {
    const platform = await getPlatform()
    const image = await platform.pickImage({ source })
    if (image) emit('update:modelValue', image)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '选择图片失败'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="picker">
    <div class="row">
      <button class="btn sm" type="button" :disabled="busy" @click="pick('camera')">拍照</button>
      <button class="btn sm" type="button" :disabled="busy" @click="pick('gallery')">相册 / 文件</button>
      <button v-if="modelValue" class="btn sm ghost" type="button" @click="emit('update:modelValue', null)">
        移除图片
      </button>
      <span v-if="busy" class="hint">正在读取图片…</span>
    </div>

    <div v-if="previewUrl" class="preview">
      <img :src="previewUrl" alt="待识别题目" />
    </div>
    <p v-if="errorMessage" class="hint error-text">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.picker {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preview img {
  max-width: 100%;
  max-height: 240px;
  border-radius: 10px;
  border: 1px solid var(--border);
  object-fit: contain;
  background: var(--surface-2);
}

.error-text {
  color: var(--danger);
}
</style>

/// <reference types="vite/client" />

import type { ElectronBridgeApi } from '../../electron/bridge'

declare global {
  interface Window {
    studypal?: ElectronBridgeApi
    Capacitor?: {
      isNativePlatform?: () => boolean
      getPlatform?: () => string
    }
  }
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

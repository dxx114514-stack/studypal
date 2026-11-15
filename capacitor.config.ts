import type { CapacitorConfig } from '@capacitor/cli'

/**
 * 移动端（iOS / Android）配置。
 * webDir 指向 electron-vite 产出的纯 Web 构建，与桌面端共享同一套渲染进程代码。
 */
const config: CapacitorConfig = {
  appId: 'org.dxx.studypal',
  appName: "dxx's StudyPal",
  webDir: 'out/renderer',
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: false
  },
  ios: {
    contentInset: 'always'
  },
  plugins: {
    LocalNotifications: {
      iconColor: '#2f6fed'
    }
  }
}

export default config

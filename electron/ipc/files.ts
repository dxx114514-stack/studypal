import { BrowserWindow, dialog, ipcMain } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import { basename, extname } from 'node:path'
import { IPC } from '../bridge'
import type { OpenedFile, SaveFileOptions } from '../../core/types/platform'

const TEXT_EXTENSIONS = new Set([
  '.md',
  '.markdown',
  '.txt',
  '.json',
  '.svg',
  '.csv',
  '.log',
  '.html',
  '.xml',
  '.yaml',
  '.yml'
])

export function registerFileIpc(): void {
  ipcMain.handle(IPC.saveFile, async (event, options: SaveFileOptions) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const dialogOptions = {
      defaultPath: options.defaultName,
      filters: options.filters ?? [{ name: '所有文件', extensions: ['*'] }]
    }
    const result = window
      ? await dialog.showSaveDialog(window, dialogOptions)
      : await dialog.showSaveDialog(dialogOptions)

    if (result.canceled || !result.filePath) return { saved: false }

    if (options.dataBase64) {
      await writeFile(result.filePath, Buffer.from(options.dataBase64, 'base64'))
    } else {
      await writeFile(result.filePath, options.text ?? '', 'utf8')
    }
    return { saved: true, path: result.filePath }
  })

  ipcMain.handle(IPC.openFile, async (event, options?: { extensions?: string[] }): Promise<OpenedFile | null> => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const filters = options?.extensions?.length
      ? [{ name: '支持的文件', extensions: options.extensions.map((ext) => ext.replace(/^\./, '')) }]
      : [{ name: '所有文件', extensions: ['*'] }]

    const result = window
      ? await dialog.showOpenDialog(window, { properties: ['openFile'], filters })
      : await dialog.showOpenDialog({ properties: ['openFile'], filters })

    if (result.canceled || result.filePaths.length === 0) return null

    const filePath = result.filePaths[0]
    const name = basename(filePath)
    const extension = extname(filePath).toLowerCase()

    if (TEXT_EXTENSIONS.has(extension)) {
      return { name, path: filePath, text: await readFile(filePath, 'utf8') }
    }
    return { name, path: filePath, dataBase64: (await readFile(filePath)).toString('base64') }
  })
}

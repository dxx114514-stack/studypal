import { registerFileIpc } from './files'
import { registerSecureIpc } from './secureStore'
import { registerSystemIpc } from './system'
import { registerProxyIpc } from './aiProxy'

export function registerIpcHandlers(): void {
  registerFileIpc()
  registerSecureIpc()
  registerSystemIpc()
  registerProxyIpc()
}

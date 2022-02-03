import { debug as debugFn } from 'debug'
import { build, createServer, InlineConfig } from 'vite'
import httpServer from './http-server'
import { resolveServerConfig, StartDevServerOptions } from './resolveServerConfig'
const debug = debugFn('cypress:vite-dev-server:vite')

export { StartDevServerOptions }

export async function startDevServer (startDevServerArgs: StartDevServerOptions): Promise<Cypress.ResolvedDevServerConfig> {
  if (!startDevServerArgs.viteConfig) {
    debug('User did not pass in any Vite dev server configuration')
    startDevServerArgs.viteConfig = {}
  }

  debug('starting vite dev server')
  const resolvedConfig = await resolveServerConfig(startDevServerArgs)
  const port = resolvedConfig.server!.port!

  if (startDevServerArgs.options.config.isTextTerminal) {
    await build({ mode: 'development', ...resolvedConfig })
    const root = resolvedConfig.build!.outDir!

    const server = await httpServer(port, root, resolvedConfig.base!)

    return {
      close: server.close,
      port,
    }
  }

  const viteDevServer = await createServer(resolvedConfig)

  await viteDevServer.listen()

  debug('Component testing vite server started on port', port)

  return {
    close: viteDevServer.close,
    port,
  }
}

export type CypressViteDevServerConfig = Omit<InlineConfig, 'base' | 'root'>

export function devServer (cypressDevServerConfig: Cypress.DevServerConfig, devServerConfig?: CypressViteDevServerConfig) {
  return startDevServer({ options: cypressDevServerConfig, viteConfig: devServerConfig })
}

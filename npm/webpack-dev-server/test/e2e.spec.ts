import path from 'path'
import sinon from 'sinon'
import { expect } from 'chai'
import { EventEmitter } from 'events'
import http from 'http'
import fs from 'fs'
import { webpackDevServerFacts } from '../src/webpackDevServerFacts'

import { defineDevServerConfig, devServer, startDevServer } from '../'

const requestSpecFile = (port: number) => {
  return new Promise((res) => {
    const opts = {
      host: 'localhost',
      port,
      path: '/test/fixtures/foo.spec.js',
    }

    const callback = (response: EventEmitter) => {
      let str = ''

      response.on('data', (chunk) => {
        str += chunk
      })

      response.on('end', () => {
        res(str)
      })
    }

    http.request(opts, callback).end()
  })
}

const root = path.join(__dirname, '..')

const webpackConfig = {
  devServer: webpackDevServerFacts.isV3()
    ? { contentBase: root }
    : { static: { directory: root } },

}

const specs: Cypress.Cypress['spec'][] = [
  {
    name: `${root}/test/fixtures/foo.spec.js`,
    relative: `${root}/test/fixtures/foo.spec.js`,
    absolute: `${root}/test/fixtures/foo.spec.js`,
  },
]

const config = {
  projectRoot: root,
  supportFile: '',
  isTextTerminal: true,
  devServerPublicPathRoute: root,
} as any as Cypress.ResolvedConfigOptions & Cypress.RuntimeConfigOptions

describe('#startDevServer', () => {
  it('serves specs via a webpack dev server', async () => {
    const { port, close } = await startDevServer({
      webpackConfig,
      options: {
        config,
        specs,
        devServerEvents: new EventEmitter(),
      },
    })

    const response = await requestSpecFile(port as number)

    expect(response).to.eq('const foo = () => {}\n')

    return new Promise((res) => {
      close(() => res())
    })
  })

  it('emits dev-server:compile:success event on successful compilation', async () => {
    const devServerEvents = new EventEmitter()
    const { close } = await startDevServer({
      webpackConfig,
      options: {
        config,
        specs,
        devServerEvents,
      },
    })

    return new Promise((res) => {
      devServerEvents.on('dev-server:compile:success', () => {
        close(() => res())
      })
    })
  })

  it('emits dev-server:compile:error event on error compilation', async () => {
    const devServerEvents = new EventEmitter()

    const exitSpy = sinon.stub()

    const { close } = await startDevServer({
      webpackConfig,
      options: {
        config,
        specs: [
          {
            name: `${root}/test/fixtures/compilation-fails.spec.js`,
            relative: `${root}/test/fixtures/compilation-fails.spec.js`,
            absolute: `${root}/test/fixtures/compilation-fails.spec.js`,
          },
        ],
        devServerEvents,
      },
    }, exitSpy as any)

    exitSpy()

    return new Promise((res) => {
      devServerEvents.on('dev-server:compile:error', (err: string) => {
        if (webpackDevServerFacts.isV3()) {
          expect(err).to.contain('./test/fixtures/compilation-fails.spec.js 1:5')
        }

        expect(err).to.contain('Module parse failed: Unexpected token (1:5)')
        expect(err).to.contain('You may need an appropriate loader to handle this file type, currently no loaders are configured to process this file. See https://webpack.js.org/concepts#loaders')
        expect(err).to.contain('> this is an invalid spec file')
        expect(exitSpy.calledOnce).to.be.true
        close(() => res())
      })
    })
  })

  it('touches browser.js when a spec file is added and recompile', async function () {
    const devServerEvents = new EventEmitter()
    const { close } = await startDevServer({
      webpackConfig,
      options: {
        config,
        specs,
        devServerEvents,
      },
    })

    const newSpec: Cypress.Cypress['spec'] = {
      name: `${root}/test/fixtures/bar.spec.js`,
      relative: `${root}/test/fixtures/bar.spec.js`,
      absolute: `${root}/test/fixtures/bar.spec.js`,
    }

    const oldmtime = fs.statSync('./dist/browser.js').mtimeMs

    let firstCompile = true

    return new Promise((res) => {
      devServerEvents.on('dev-server:compile:success', () => {
        if (firstCompile) {
          firstCompile = false
          devServerEvents.emit('dev-server:specs:changed', [newSpec])
          const updatedmtime = fs.statSync('./dist/browser.js').mtimeMs

          expect(oldmtime).to.not.equal(updatedmtime)
        } else {
          close(() => res())
        }
      })
    })
  })

  it('accepts the devServer signature', async function () {
    const devServerEvents = new EventEmitter()
    const { port, close } = await devServer(
      {
        config,
        specs,
        devServerEvents,
      },
      defineDevServerConfig({ webpackConfig }),
    )

    const response = await requestSpecFile(port as number)

    expect(response).to.eq('const foo = () => {}\n')

    return new Promise((res) => {
      close(() => res())
    })
  })
})

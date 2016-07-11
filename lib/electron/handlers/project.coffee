_         = require("lodash")
Promise   = require("bluebird")
extension = require("@cypress/core-extension")
files     = require("../../controllers/files")
config    = require("../../config")
errors    = require("../../errors")
cache     = require("../../cache")
Project   = require("../../project")
launcher  = require("../../launcher")

## global reference to open objects
onRelaunch      = null
openProject     = null
openBrowser     = null
openBrowserOpts = null

module.exports = {
  open: (path, args = {}, options = {}) ->
    _.defaults options, {
      sync: true
      changeEvents: true
      onReloadBrowser: (url, browser) =>
        @relaunch(url, browser)
    }

    options = _.extend {}, config.whitelist(args), options

    ## store the currently open project
    openProject = Project(path)

    ## open the project and return
    ## the config for the project instance
    Promise.all([
      openProject.open(options)
      launcher.getBrowsers()
    ])
    .spread (project, browsers) ->
      ## TODO: maybe if there are no
      ## browsers here we should just
      ## immediately close the server?
      ## but continue sending the config
      Promise.all([
        project.setBrowsers(browsers)
        project.getConfig()
        .then (cfg) ->
          extension.setHostAndPath(cfg.clientUrlDisplay, cfg.socketIoRoute)
      ])
      .return(project)

  opened: -> openProject

  launch: (browser, url, spec, options = {}) ->
    openProject.getConfig()
    .then (cfg) ->
      if spec
        url = openProject.getUrlBySpec(cfg.clientUrl, spec)

      url            ?= cfg.clientUrl
      openBrowser     = browser
      openBrowserOpts = options
      options.proxyServer = cfg.clientUrlDisplay

      launcher.launch(browser, url, options)

  onRelaunch: (fn) ->
    onRelaunch = fn

  relaunch: (url, browser) ->
    if (b = browser) and onRelaunch
      onRelaunch({
        browser: b, url: url
      })
    else
      ## if we didnt specify a browser and
      ## theres not a currently open browser then bail
      return if not b = openBrowser

      ## assume there are openBrowserOpts
      launcher.launch(b, url, openBrowserOpts)

  onSettingsChanged: ->
    Promise.try =>
      if not openProject
        errors.throw("NO_CURRENTLY_OPEN_PROJECT")
      else
        new Promise (resolve, reject) =>
          reboot = =>
            ## store if the browser is open
            b = openBrowser

            openProject
            .getConfig()
            .then (cfg) =>
              @close()
              .then =>
                @open(cfg.projectRoot)
            .then (p) ->
              p.getConfig()
            .then (cfg) ->
              {
                config: cfg
                browser: b
              }
            .then(resolve)
            .catch(reject)

          openProject.on "settings:changed", reboot

  getSpecs: ->
    openProject.getConfig()
    .then (cfg) ->
      files.getTestFiles(cfg)

  changeToSpec: (spec) ->
    openProject.getConfig()
    .then (cfg) ->
      url = openProject.getUrlBySpec(cfg.clientUrl, spec)

      ## TODO: the problem here is that we really need
      ## an 'ack' event when changing the url because
      ## the runner may not even be connected, which
      ## in that case we need to open a new tab or
      ## spawn a new browser instance!
      openProject.changeToUrl(url)

  getBrowsers: ->
    ## always return an array of open browsers
    Promise.resolve(_.compact([openBrowser]))

  closeBrowser: ->
    launcher.close()

    openBrowser     = null
    openBrowserOpts = null

    Promise.resolve(null)

  close: (options = {}) ->
    _.defaults options, {
      sync: true
    }

    nullify = ->
      ## null these back out
      onRelaunch      = null
      openProject     = null

      Promise.resolve(null)

    if not openProject
      nullify()
    else
      Promise.all([
        @closeBrowser()
        openProject.close(options)
      ])
      .then(nullify)
}
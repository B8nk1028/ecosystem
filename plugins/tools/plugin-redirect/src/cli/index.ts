#!/usr/bin/env node
import { removeEndingSlash, removeLeadingSlash } from '@vuepress/helper'
import { cac } from 'cac'
import {
  loadUserConfig,
  resolveAppConfig,
  resolveCliAppConfig,
  resolveUserConfigConventionalPath,
  resolveUserConfigPath,
  transformUserConfigToPlugin,
} from 'vuepress/cli'
import { createBuildApp } from 'vuepress/core'
import { fs, logger, path } from 'vuepress/utils'
import pkg from '../../package.json' with { type: 'json' }
import { getRedirectHTML } from '../node/generate/getRedirectHTML.js'

interface RedirectCommandOptions {
  hostname: string
  output?: string
  config?: string
  cache: string
  temp?: string
  cleanCache?: boolean
  cleanTemp?: boolean
}

const cli = cac('vp-redirect')

cli
  .command(
    'generate [source-dir]',
    'Generate redirect site using VuePress project under source folder',
  )
  .option(
    '--hostname <hostname>',
    'Hostname to redirect to (E.g.: https://new.example.com/)',
    { default: '/' },
  )
  .option('-c, --config <config>', 'Set path to config file')
  .option(
    '-o, --output <output>',
    'Set the output directory (default: .vuepress/redirect)',
  )
  .option('--cache <cache>', 'Set the directory of the cache files')
  .option('-t, --temp <temp>', 'Set the directory of the temporary files')
  .option('--clean-cache', 'Clean the cache files before generation')
  .option('--clean-temp', 'Clean the temporary files before generation')
  .action(async (sourceDir: string, commandOptions: RedirectCommandOptions) => {
    if (!sourceDir) {
      cli.outputHelp()
      return
    }

    // ensure NODE_ENV is set
    process.env.NODE_ENV ??= 'production'

    // resolve app config from cli options
    const cliAppConfig = resolveCliAppConfig(sourceDir, {})

    // resolve user config file
    const userConfigPath = commandOptions.config
      ? resolveUserConfigPath(commandOptions.config)
      : resolveUserConfigConventionalPath(cliAppConfig.source)

    const { userConfig } = await loadUserConfig(userConfigPath)

    // resolve the final app config to use
    const appConfig = resolveAppConfig({
      defaultAppConfig: {},
      cliAppConfig,
      userConfig,
    })

    if (appConfig === null) return

    // create vuepress app
    const app = createBuildApp(appConfig)

    // use user-config plugin
    app.use(transformUserConfigToPlugin(userConfig, cliAppConfig.source))

    // clean temp and cache
    if (commandOptions.cleanTemp === true) {
      logger.info('Cleaning temp...')
      await fs.remove(app.dir.temp())
    }
    if (commandOptions.cleanCache === true) {
      logger.info('Cleaning cache...')
      await fs.remove(app.dir.cache())
    }

    const outputFolder = commandOptions.output
      ? path.join(process.cwd(), commandOptions.output)
      : path.join(app.dir.source(), '.vuepress', 'redirect')

    // empty output directory
    await fs.emptyDir(outputFolder)

    // initialize vuepress app to get pages
    logger.info('Initializing VuePress and preparing data...')

    // initialize vuepress app to get pages
    await app.init()

    logger.info('Generating redirect pages...')

    // redirect all pages
    await Promise.all(
      app.pages.map((page) => {
        const redirectUrl = `${removeEndingSlash(commandOptions.hostname)}${
          app.options.base
        }${removeLeadingSlash(page.path)}`
        const destLocation = path.join(
          outputFolder,
          removeLeadingSlash(page.path.replace(/\/$/, '/index.html')),
        )

        return fs
          .ensureDir(path.dirname(destLocation))
          .then(() => fs.writeFile(destLocation, getRedirectHTML(redirectUrl)))
      }),
    )
  })

cli.command('').action(() => {
  cli.outputHelp()
})

cli.help()
cli.version(pkg.version)

cli.parse()

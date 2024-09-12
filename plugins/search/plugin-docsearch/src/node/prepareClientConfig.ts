import { getRealPath } from '@vuepress/helper'
import type { App } from 'vuepress'
import { PLUGIN_NAME } from './utils.js'

export const prepareClientConfig = (
  app: App,
  injectStyles: boolean,
): Promise<string> =>
  app.writeTemp(
    'docsearch/config.js',
    `
import { Docsearch, injectDocSearchConfig } from "${getRealPath(`${PLUGIN_NAME}/client`, import.meta.url)}"
${
  injectStyles
    ? `\
import '${getRealPath('@docsearch/css', import.meta.url)}'
import '${getRealPath(`${PLUGIN_NAME}/client/styles/docsearch.css`, import.meta.url)}'
import '${getRealPath(`${PLUGIN_NAME}/client/styles/vars.css`, import.meta.url)}'
`
    : ''
}\

export default {
  enhance({ app }) {
    injectDocSearchConfig(app)
    app.component('Docsearch', Docsearch)
  },
}
`,
  )

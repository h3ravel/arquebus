import * as dayjsModule from 'dayjs'
import * as advancedFormatModule from 'dayjs/plugin/advancedFormat.js'
import type { ConfigType, Dayjs, PluginFunc } from 'dayjs'

type DayjsFactory = {
  (date?: ConfigType): Dayjs
  extend(plugin: PluginFunc, option?: unknown): Dayjs
}

const dayjs = (
  (dayjsModule as any).default ?? dayjsModule
) as DayjsFactory

const advancedFormat = (
  (advancedFormatModule as any).default ?? advancedFormatModule
) as PluginFunc

dayjs.extend(advancedFormat)

export default dayjs

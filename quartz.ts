import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { frameRegistry } from "./quartz/components/frames/registry"
import { KeirbeFrame } from "./quartz/components/keirbe/KeirbeFrame"

// keir.be: register our page frame (two-tone header bar), chosen per page type
// in quartz.config.yaml with `layout.byPageType.<type>.template: keirbe`.
frameRegistry.register("keirbe", KeirbeFrame, "keir.be quartz.ts")

const config = await loadQuartzConfig()
export default config
export const layout = await loadQuartzLayout()

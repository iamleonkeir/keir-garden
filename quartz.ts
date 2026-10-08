import path from "path"
import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { frameRegistry } from "./quartz/components/frames/registry"
import { KeirbeFrame } from "./quartz/components/keirbe/KeirbeFrame"
import type { QuartzTransformerPluginInstance } from "./quartz/plugins/types"

// keir.be: register our page frame (two-tone header bar), chosen per page type
// in quartz.config.yaml with `layout.byPageType.<type>.template: keirbe`.
frameRegistry.register("keirbe", KeirbeFrame, "keir.be quartz.ts")

const config = await loadQuartzConfig()

// keir.be: a folder's page (its index.md) with no title of its own is named after the
// folder, where Quartz would call it "index". So the folder-page template needs no title.
const folderTitles: QuartzTransformerPluginInstance = {
  name: "KeirbeFolderTitles",
  markdownPlugins: () => [
    () => (_tree: unknown, file: { data: Record<string, any> }) => {
      const rel = file.data.relativePath as string | undefined
      if (!rel || path.posix.basename(rel) !== "index.md") return
      const folder = path.posix.dirname(rel)
      if (folder === ".") return // the home page
      const frontmatter = (file.data.frontmatter ??= {})
      const title = String(frontmatter.title ?? "").trim()
      if (title === "" || title === "index") frontmatter.title = path.posix.basename(folder)
    },
  ],
}
config.plugins.transformers.push(folderTitles)

// keir.be: notes with the draft box ticked never reach keir.be (the RemoveDrafts filter),
// but the local preview shows them when started with KB_SHOW_DRAFTS=1. Cloudflare's
// build never sets it, so drafts stay off the live site.
if (process.env.KB_SHOW_DRAFTS === "1") {
  config.plugins.filters = config.plugins.filters.filter((f) => f.name !== "RemoveDrafts")
}

export default config
export const layout = await loadQuartzLayout()

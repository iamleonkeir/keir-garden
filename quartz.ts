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

// keir.be: a note's growth stage is its own property (`growth: seedling`, one value), and
// tags are for topics. So every stage still gets a page listing its notes, the site also
// files each note under a hidden tag, growth/<stage>. A new tags list is assigned, so the
// Properties box (which keeps its own copy) never shows it; the graph and the note lists
// leave these tags out too (quartz.config.yaml, _growth.scss).
const STAGES = ["seed", "seedling", "sapling", "tree", "houseplant", "evergreen"]
const growthTags: QuartzTransformerPluginInstance = {
  name: "KeirbeGrowthTags",
  markdownPlugins: () => [
    () => (_tree: unknown, file: { data: Record<string, any> }) => {
      // An empty tags list shows nothing, rather than an empty row in Properties
      const shown = file.data.noteProperties?.properties
      if (shown && Array.isArray(shown.tags) && shown.tags.length === 0) delete shown.tags

      const frontmatter = file.data.frontmatter
      const stage = String(frontmatter?.growth ?? "").trim().toLowerCase()
      if (!STAGES.includes(stage)) return
      const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : []
      frontmatter.tags = [...tags, `growth/${stage}`]
    },
  ],
}
config.plugins.transformers.push(growthTags)

// keir.be: notes with the draft box ticked never reach keir.be (the RemoveDrafts filter),
// but the local preview shows them when started with KB_SHOW_DRAFTS=1. Cloudflare's
// build never sets it, so drafts stay off the live site.
if (process.env.KB_SHOW_DRAFTS === "1") {
  config.plugins.filters = config.plugins.filters.filter((f) => f.name !== "RemoveDrafts")
}

export default config
export const layout = await loadQuartzLayout()

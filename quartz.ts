import path from "path"
import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { frameRegistry } from "./quartz/components/frames/registry"
import { KeirbeFrame } from "./quartz/components/keirbe/KeirbeFrame"
import type { QuartzTransformerPluginInstance } from "./quartz/plugins/types"
import { CustomOgImages } from "@quartz-community/og-image"
import { shareCard } from "./quartz/components/keirbe/ShareCard"

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
const STAGES = ["acorn", "seedling", "sapling", "oak", "plant", "evergreen"]
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

// keir.be: a page's short description (search engines, the share card, folder cards) is
// its opening sentences, taken from its paragraphs: not from headings, which would run
// into the text ("Why notes My memory is…"), nor from callouts. And Quartz splits
// sentences at every ". ", so an initial ended one: "Alice A. Bailey wrote…" came out as
// "Alice A.". Otherwise Quartz's own rules: up to 150 characters, at least one sentence.
// A `description` property still wins.
const NOT_AN_ENDING = /(?<!(?:^|[\s(])(?:\p{Lu}|e\.g|i\.e|etc|vs|Dr|Mr|Mrs|Ms|St))\.\s/u
const NOT_PROSE = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "table", "figure", "aside", "nav"])
type HastNode = { type: string; tagName?: string; value?: string; children?: HastNode[] }
const textOf = (node: HastNode): string =>
  node.type === "text" ? (node.value ?? "") : (node.children ?? []).map(textOf).join("")
const paragraphs = (node: HastNode, out: string[] = []): string[] => {
  for (const child of node.children ?? []) {
    if (child.type !== "element" || NOT_PROSE.has(child.tagName ?? "")) continue
    if (child.tagName === "p") out.push(textOf(child))
    else paragraphs(child, out)
  }
  return out
}
const descriptions: QuartzTransformerPluginInstance = {
  name: "KeirbeDescriptions",
  htmlPlugins: () => [
    () => (tree: unknown, file: { data: Record<string, any> }) => {
      if (file.data.frontmatter?.description) return
      const prose = paragraphs(tree as HastNode).join(" ").replace(/\s+/g, " ").trim()
      const text = prose || String(file.data.text ?? "").replace(/\s+/g, " ").trim()
      if (!text) return
      let description = ""
      for (const [i, sentence] of text.split(NOT_AN_ENDING).entries()) {
        if (!sentence) break
        const whole = sentence.endsWith(".") ? sentence : sentence + "."
        if (i > 0 && description.length + whole.length + 1 > 150) break
        description += (description ? " " : "") + whole
      }
      file.data.description = description.length > 300 ? description.slice(0, 300) + "..." : description
    },
  ],
}
config.plugins.transformers.push(descriptions)

// keir.be: our share card (the picture apps show for a shared link), in place of the
// og-image plugin's own layout: same look, but growth icons instead of the hidden stage tag.
config.plugins.emitters = config.plugins.emitters.map((emitter) =>
  emitter.name === "CustomOgImages" ? CustomOgImages({ imageStructure: shareCard }) : emitter,
)

export default config
export const layout = await loadQuartzLayout()

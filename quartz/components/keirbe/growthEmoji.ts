import type { Element, ElementContent, Root, RootContent, Text } from "hast"
import { SHAPES, Stage } from "./Growth"

/**
 * On the site, the garden's six growth emoji become its drawn icons wherever they appear
 * in a note's text: 🌰 acorn, 🌱 seedling, 🌿 sapling, 🌳 oak,
 * 🪴 houseplant, 🌲 evergreen. Obsidian keeps showing the emoji, and so does search.
 *
 * KeirbeFrame passes the page body a copy of the note's tree with the swap made; the
 * original stays untouched. Code blocks are left alone.
 * Styles: .kb-growth-inline in quartz/styles/keirbe/_growth.scss
 */

const EMOJI: Record<string, Stage> = {
  "🌰": "acorn",
  "🌱": "seedling",
  "🌿": "sapling",
  "🌳": "oak",
  "🪴": "houseplant",
  "🌲": "evergreen",
}
const PATTERN = /(🌰|🌱|🌿|🌳|🪴|🌲)\uFE0F?/gu // \uFE0F: the emoji-style variant, if present
const ANY = /🌰|🌱|🌿|🌳|🪴|🌲/u // no g flag, so a test leaves no search position behind
const SKIP = new Set(["code", "pre", "script", "style", "svg"])

function icon(stage: Stage): Element {
  return {
    type: "element",
    tagName: "span",
    properties: { className: ["kb-growth-inline"], title: stage, role: "img", ariaLabel: stage },
    children: [
      {
        type: "element",
        tagName: "svg",
        properties: {
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "1.5",
          strokeLinecap: "round",
          strokeLinejoin: "round",
          ariaHidden: "true",
        },
        children: SHAPES[stage].map(
          (d): Element => ({ type: "element", tagName: "path", properties: { d }, children: [] }),
        ),
      },
    ],
  }
}

function splitText(node: Text): ElementContent[] | null {
  if (!ANY.test(node.value)) return null
  const out: ElementContent[] = []
  let last = 0
  for (const match of node.value.matchAll(PATTERN)) {
    const at = match.index ?? 0
    if (at > last) out.push({ type: "text", value: node.value.slice(last, at) })
    out.push(icon(EMOJI[match[1]]))
    last = at + match[0].length
  }
  if (last < node.value.length) out.push({ type: "text", value: node.value.slice(last) })
  return out
}

// Copy-on-write: only the branches that hold an emoji are rebuilt
function swap<T extends Root | Element>(node: T): T {
  let changed = false
  const children: RootContent[] = []
  for (const child of node.children as RootContent[]) {
    if (child.type === "text") {
      const parts = splitText(child)
      if (parts) {
        children.push(...parts)
        changed = true
        continue
      }
    } else if (child.type === "element" && !SKIP.has(child.tagName)) {
      const next = swap(child)
      if (next !== child) changed = true
      children.push(next)
      continue
    }
    children.push(child)
  }
  return changed ? ({ ...node, children } as T) : node
}

export function withGrowthIcons(tree: Root): Root {
  return swap(tree)
}

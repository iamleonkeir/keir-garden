import { QuartzPluginData } from "../../plugins/vfile"
import { FullSlug, resolveRelative } from "../../util/path"

/**
 * keir.be growth row: where a note sits on the garden's scale, drawn at the end of its
 * date line by KeirbeFrame (styles: quartz/styles/keirbe/_growth.scss).
 *
 *  - The stage comes from the note's tags: seed 🌰 → sprout 🌱 → sapling 🌿 → tree 🌳.
 *    The whole scale is shown, with the note's own stage lit.
 *  - Off the scale, a houseplant 🪴 or evergreen 🌲 note shows just its own icon.
 *  - Notes without a stage (Contact, folder lists) show nothing.
 *  - Each icon links to its tag page (every note at that stage) once some note has it.
 * The scale is explained on the garden's page "How this garden grows".
 *
 * Icons drawn for keir.be in the style of the header icons: a 24px grid, 1.5 stroke,
 * round ends, shown at 22px. The seed is an acorn (there's no acorn emoji, hence 🌰
 * in the text).
 */

const SCALE = ["seed", "sprout", "sapling", "tree"] as const
const OFF_SCALE = ["houseplant", "evergreen"] as const
export type Stage = (typeof SCALE)[number] | (typeof OFF_SCALE)[number]

export const SHAPES: Record<Stage, string[]> = {
  // An acorn: stalk, cap, nut
  seed: [
    "M12 4.75c0-1.25.75-2.25 2-2.75",
    "M5 11c0-3.45 3.13-6.25 7-6.25s7 2.8 7 6.25z",
    "M6.5 11c0 5.2 2.4 8.9 5.5 10.25c3.1-1.35 5.5-5.05 5.5-10.25",
  ],
  // Two leaves on a short stem
  sprout: [
    "M8 21h8",
    "M12 21v-9.5",
    "M12 13.5c-3.6 0-6-2.2-6-5.5c3.6 0 6 2.2 6 5.5z",
    "M12 11.5c0-3.6 2.4-6.5 6.5-6.5c0 3.6-2.4 6.5-6.5 6.5z",
  ],
  // A taller stem with leaves up both sides
  sapling: [
    "M8 21h8",
    "M12 21V4",
    "M12 17c-2.9 0-5-1.5-5-3.5c2.9 0 5 1.5 5 3.5z",
    "M12 13c0-2 2.1-3.5 5-3.5c0 2-2.1 3.5-5 3.5z",
    "M12 9c-2.6 0-4.5-1.3-4.5-3c2.6 0 4.5 1.3 4.5 3z",
  ],
  // A broad crown on a trunk
  tree: ["M8 21h8", "M12 21v-5", "M8 16a4 4 0 0 1-1.5-7.7a5.5 5.5 0 0 1 11 0a4 4 0 0 1-1.5 7.7z"],
  // Two leaves in a pot
  houseplant: [
    "M6.5 15h11",
    "M7.75 15l1.25 6h6l1.25-6",
    "M12 15c-3.6-.6-5.6-3.2-5.5-7c3.3.7 5.4 3.4 5.5 7z",
    "M12 15c.2-4.4 2.5-7.6 6-8.5c.5 4.2-1.7 7.6-6 8.5z",
  ],
  // A pine in three tiers
  evergreen: [
    "M9 21h6",
    "M12 19v2",
    "M12 2.5l-4.5 5.5h2.5l-4 5.5h3l-4 5.5h14l-4-5.5h3l-4-5.5h2.5z",
  ],
}

function Icon({ stage }: { stage: Stage }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {SHAPES[stage].map((d) => (
        <path d={d} />
      ))}
    </svg>
  )
}

const tagsOf = (file: QuartzPluginData): string[] => {
  const tags = file.frontmatter?.tags
  return Array.isArray(tags) ? tags.map(String) : []
}

export function KeirbeGrowth({
  fileData,
  allFiles,
}: {
  fileData: QuartzPluginData
  allFiles: QuartzPluginData[]
}) {
  const tags = tagsOf(fileData)
  const stage = ([...SCALE, ...OFF_SCALE] as Stage[]).find((s) => tags.includes(s))
  if (!stage) return null

  const slug = fileData.slug as FullSlug
  const hasPage = (s: Stage) => allFiles.some((file) => tagsOf(file).includes(s))
  const row: Stage[] = (OFF_SCALE as readonly Stage[]).includes(stage) ? [stage] : [...SCALE]

  return (
    <div class="kb-growth" role="group" aria-label={`Growth: ${stage}`}>
      {row.map((s) => {
        const lit = s === stage
        const cls = lit ? "kb-growth-icon lit" : "kb-growth-icon"
        return hasPage(s) ? (
          <a
            class={cls}
            href={resolveRelative(slug, `tags/${s}` as FullSlug)}
            title={s}
            aria-label={s}
            aria-current={lit ? "true" : undefined}
          >
            <Icon stage={s} />
          </a>
        ) : (
          <span class={cls} title={s} role="img" aria-label={s}>
            <Icon stage={s} />
          </span>
        )
      })}
    </div>
  )
}

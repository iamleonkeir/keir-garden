import { QuartzPluginData } from "../../plugins/vfile"
import { FullSlug, resolveRelative } from "../../util/path"

/**
 * keir.be growth row: where a note sits on the garden's scale, drawn at the end of its
 * date line by KeirbeFrame (styles: quartz/styles/keirbe/_growth.scss).
 *
 *  - The stage is the note's `growth` property: acorn 🌰 → seedling 🌱 → sapling 🌿 → oak 🌳.
 *    The whole scale is shown, with the note's own stage lit.
 *  - Off the scale, a houseplant 🪴 or evergreen 🌲 note shows just its own icon.
 *  - Notes without a stage (Contact, folder lists) show nothing.
 *  - Each icon links to its stage's page (every note at that stage) once some note has it:
 *    the hidden tag growth/<stage> that quartz.ts adds.
 * The scale is explained on the garden's page "How this garden grows".
 *
 * Icons drawn for keir.be in the style of the header icons: a 24px grid, 1.5 stroke,
 * round ends, shown at 22px. (There's no acorn emoji, hence the chestnut 🌰
 * in the text).
 */

const SCALE = ["acorn", "seedling", "sapling", "oak"] as const
const OFF_SCALE = ["houseplant", "evergreen"] as const
export type Stage = (typeof SCALE)[number] | (typeof OFF_SCALE)[number]

export const SHAPES: Record<Stage, string[]> = {
  // An acorn: stalk, cap, nut
  acorn: [
    "M12 4.75c0-1.25.75-2.25 2-2.75",
    "M5 11c0-3.45 3.13-6.25 7-6.25s7 2.8 7 6.25z",
    "M6.5 11c0 5.2 2.4 8.9 5.5 10.25c3.1-1.35 5.5-5.05 5.5-10.25",
  ],
  // Two leaves on a short stem
  seedling: [
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
  // An oak: a broad crown on a trunk
  oak: ["M8 21h8", "M12 21v-5", "M8 16a4 4 0 0 1-1.5-7.7a5.5 5.5 0 0 1 11 0a4 4 0 0 1-1.5 7.7z"],
  // Two leaves in a pot (drawn to the same height as the others)
  houseplant: [
    "M6 14h12",
    "M7.25 14l1.5 7h6.5l1.5-7",
    "M12 14c-4-.5-6.8-3.7-7-9c4.2.8 6.8 4.2 7 9z",
    "M12 14c.1-5.5 2.9-9.6 7.5-11c.8 5.5-2 10-7.5 11z",
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

const growthOf = (file: QuartzPluginData): string =>
  String(file.frontmatter?.growth ?? "").trim().toLowerCase()

export function KeirbeGrowth({
  fileData,
  allFiles,
}: {
  fileData: QuartzPluginData
  allFiles: QuartzPluginData[]
}) {
  const growth = growthOf(fileData)
  const stage = ([...SCALE, ...OFF_SCALE] as Stage[]).find((s) => s === growth)
  if (!stage) return null

  const slug = fileData.slug as FullSlug
  const hasPage = (s: Stage) => allFiles.some((file) => growthOf(file) === s)
  const row: Stage[] = (OFF_SCALE as readonly Stage[]).includes(stage) ? [stage] : [...SCALE]

  return (
    <div class="kb-growth" role="group" aria-label={`Growth: ${stage}`}>
      {row.map((s) => {
        const lit = s === stage
        const cls = lit ? "kb-growth-icon lit" : "kb-growth-icon"
        return hasPage(s) ? (
          <a
            class={cls}
            href={resolveRelative(slug, `tags/growth/${s}` as FullSlug)}
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

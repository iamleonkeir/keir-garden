import { QuartzPluginData } from "../../plugins/vfile"
import { FullSlug, resolveRelative } from "../../util/path"
import { SHAPES, Stage } from "./Growth"

/**
 * keir.be folder cards: on a folder's page (its index.md), what's inside is shown as
 * cards, in the manner of Sequoia's card grid, instead of Quartz's dated list (hidden by
 * CSS when cards follow it; styles: quartz/styles/keirbe/_cards.scss).
 *
 *  - One card per note in the folder, then one per subfolder: the same order as the menu
 *    (each group alphabetical by title).
 *  - A note's card: its growth icon (olive), title and opening sentences.
 *  - A subfolder's card: a folder icon, its title, its own opening sentences and how many
 *    notes it holds.
 *  - Drafts (only ever on the local preview) are marked as in the menu.
 */

interface Card {
  title: string
  slug: FullSlug
  text: string
  stage?: Stage
  folder?: number // a subfolder: how many notes it holds
  draft: boolean
}

const FOLDER_ICON = [
  "M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
]
const NOTE_ICON = ["M7 3h7l4 4v14H7z", "M14 3v4h4"]

const isDraft = (file: QuartzPluginData) =>
  file.frontmatter?.draft === true || file.frontmatter?.draft === "true"
const stageOf = (file: QuartzPluginData) => {
  const growth = String(file.frontmatter?.growth ?? "").trim().toLowerCase()
  return growth in SHAPES ? (growth as Stage) : undefined
}
const byTitle = (a: Card, b: Card) =>
  a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" })
const lastSegment = (path: string) => {
  const word = path.split("/").pop()!.replace(/-/g, " ")
  return word.charAt(0).toUpperCase() + word.slice(1)
}

function Icon({ paths }: { paths: string[] }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      {paths.map((d) => (
        <path d={d} />
      ))}
    </svg>
  )
}

export function KeirbeFolderCards({
  fileData,
  allFiles,
}: {
  fileData: QuartzPluginData
  allFiles: QuartzPluginData[]
}) {
  const slug = fileData.slug as FullSlug
  if (!slug?.endsWith("/index")) return null // folder pages only
  const folder = slug.slice(0, -"/index".length)
  const prefix = folder + "/"

  const notes: Card[] = []
  const subfolders = new Map<string, Card>()
  for (const file of allFiles) {
    const fileSlug = file.slug
    if (!fileSlug?.startsWith(prefix) || (file as { unlisted?: boolean }).unlisted) continue
    const rest = fileSlug.slice(prefix.length).split("/")
    if (rest.length === 1) {
      if (rest[0] === "index") continue
      notes.push({
        title: file.frontmatter?.title ?? lastSegment(fileSlug),
        slug: fileSlug as FullSlug,
        text: file.description ?? "",
        stage: stageOf(file),
        draft: isDraft(file),
      })
      continue
    }
    // Something inside a subfolder: count it, and use the subfolder's own page for the card
    const sub = prefix + rest[0]
    const card = subfolders.get(sub) ?? {
      title: lastSegment(sub),
      slug: `${sub}/index` as FullSlug,
      text: "",
      folder: 0,
      draft: false,
    }
    if (rest.length === 2 && rest[1] === "index") {
      card.title = file.frontmatter?.title ?? card.title
      card.text = file.description ?? ""
      card.draft = isDraft(file)
    } else {
      card.folder = (card.folder ?? 0) + 1
    }
    subfolders.set(sub, card)
  }

  const cards = [...notes.sort(byTitle), ...[...subfolders.values()].sort(byTitle)]
  if (cards.length === 0) return null

  return (
    <div class="popover-hint kb-cards">
      {cards.map((card) => (
        <a
          class={card.draft ? "kb-card kb-card-draft" : "kb-card"}
          href={resolveRelative(slug, card.slug)}
        >
          <span class="kb-card-icon">
            <Icon
              paths={card.folder !== undefined ? FOLDER_ICON : card.stage ? SHAPES[card.stage] : NOTE_ICON}
            />
          </span>
          <span class="kb-card-title">{card.title}</span>
          {card.text && <span class="kb-card-text">{card.text}</span>}
          {card.folder !== undefined && (
            <span class="kb-card-meta">
              {card.folder} {card.folder === 1 ? "note" : "notes"}
            </span>
          )}
        </a>
      ))}
    </div>
  )
}

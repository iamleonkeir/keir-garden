import type { ImageOptions, SocialImageOptions } from "@quartz-community/og-image"
import { SHAPES, Stage } from "./Growth"

/**
 * keir.be share card: the picture apps show when someone shares a link to the garden
 * (Open Graph image, 1200×630). Quartz's own layout, kept as it was (acorn icon, title,
 * opening text, date and reading time), with one change in the bottom-right corner:
 * the note's real topic tags, then its growth scale with its stage lit, as on the page.
 * The hidden growth/<stage> tags (quartz.ts) never show here.
 * Handed to the og-image plugin in quartz.ts as its `imageStructure`.
 */

const SCALE: Stage[] = ["acorn", "seedling", "sapling", "oak"]
const OFF_SCALE: Stage[] = ["plant", "evergreen"]
const FAINT = "#cfcfcb" // the page's faint icons (muted at 35%) on white

type CardProps = ImageOptions & { userOpts: Omit<SocialImageOptions, "imageStructure">; iconBase64?: string }

const fontName = (spec: unknown) =>
  typeof spec === "string" ? spec : ((spec as { name?: string })?.name ?? "")

function GrowthIcon({ stage, colour }: { stage: Stage; colour: string }) {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke={colour}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {SHAPES[stage].map((d) => (
        <path d={d} />
      ))}
    </svg>
  )
}

export function shareCard({ cfg, userOpts, title, description, fileData, iconBase64 }: CardProps) {
  const theme = cfg.theme as {
    colors: Record<string, Record<string, string>>
    typography: { body: unknown; header: unknown }
  }
  const colours = theme.colors[userOpts.colorScheme]
  const bodyFont = fontName(theme.typography.body)
  const headerFont = fontName(theme.typography.header)

  const dateType = (fileData as { defaultDateType?: string }).defaultDateType
  const rawDate = dateType ? fileData.dates?.[dateType] : undefined
  const date = rawDate
    ? rawDate.toLocaleDateString(cfg.locale, { year: "numeric", month: "short", day: "2-digit" })
    : null
  const words = (fileData.text ?? "").split(/\s+/).filter(Boolean).length
  const readingTime = `${Math.ceil(words / 200)} min read`

  const frontmatter = fileData.frontmatter ?? {}
  const tags = (frontmatter.tags ?? []).filter((tag) => !String(tag).startsWith("growth/"))
  const growth = String(frontmatter.growth ?? "").trim().toLowerCase() as Stage
  const row: Stage[] = OFF_SCALE.includes(growth)
    ? [growth]
    : SCALE.includes(growth)
      ? SCALE
      : []

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        backgroundColor: colours.light,
        padding: "2.5rem",
        fontFamily: bodyFont,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
        {iconBase64 && <img src={iconBase64} alt="" width={56} height={56} />}
        <div style={{ display: "flex", fontSize: 32, color: colours.gray }}>{cfg.baseUrl}</div>
      </div>

      <div style={{ display: "flex", marginTop: "1rem", marginBottom: "1.5rem" }}>
        <h1
          style={{
            margin: 0,
            fontSize: title.length > 32 ? 64 : 72,
            fontFamily: headerFont,
            fontWeight: 700,
            color: colours.dark,
            lineHeight: 1.2,
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </h1>
      </div>

      <div style={{ display: "flex", flex: 1, fontSize: 36, color: colours.darkgray, lineHeight: 1.4 }}>
        <p
          style={{
            margin: 0,
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 5,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {description}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "2rem",
          paddingTop: "2rem",
          borderTop: `1px solid ${colours.lightgray}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "2rem", color: colours.gray, fontSize: 28 }}>
          {date && (
            <div style={{ display: "flex", alignItems: "center" }}>
              <svg style={{ marginRight: "0.5rem" }} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {date}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center" }}>
            <svg style={{ marginRight: "0.5rem" }} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {readingTime}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", maxWidth: "60%" }}>
          {tags.slice(0, 3).map((tag) => (
            <div
              style={{
                display: "flex",
                padding: "0.5rem 1rem",
                backgroundColor: colours.highlight,
                color: colours.secondary,
                borderRadius: "10px",
                fontSize: 24,
              }}
            >
              #{tag}
            </div>
          ))}
          {row.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {row.map((stage) => (
                <GrowthIcon stage={stage} colour={stage === growth ? colours.secondary : FAINT} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

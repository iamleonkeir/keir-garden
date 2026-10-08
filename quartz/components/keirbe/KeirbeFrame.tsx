import { PageFrame, PageFrameProps } from "../frames/types"
import { QuartzPluginData } from "../../plugins/vfile"
import { FullSlug, resolveRelative } from "../../util/path"

/**
 * keir.be page frame, modelled on Mintlify "Sequoia".
 *
 * A full-bleed, sticky header in two bars sits above Quartz's usual three columns:
 *  - Top bar: the `header` layout slot from quartz.config.yaml. The first component
 *    sits on the left (site title), the second in the centre (search), the rest on
 *    the right (toggles), followed by the course sign-in button.
 *  - Tab bar: the vault's top-level folders as tabs on the left, its standalone
 *    root-level pages on the right. Worked out from the content, so a new folder
 *    becomes a tab by itself. The current section is marked.
 *
 * Registered in quartz.ts (no edits to Quartz's own files) and selected per page
 * type with `layout.byPageType.<type>.template: keirbe`.
 * Styles: quartz/styles/keirbe/_header.scss
 */

const COURSE_SIGN_IN = {
  label: "Course sign-in",
  href: "https://learn.keir.be/learn/",
}

interface Tab {
  key: string
  title: string
  slug: FullSlug
}

const byTitle = (a: Tab, b: Tab) =>
  a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" })

function fallbackTitle(segment: string): string {
  const words = segment.replace(/-/g, " ")
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function buildTabs(allFiles: QuartzPluginData[]): { sections: Tab[]; pages: Tab[] } {
  const sections = new Map<string, Tab>()
  const pages: Tab[] = []

  for (const file of allFiles) {
    const slug = file.slug
    if (!slug || (file as { unlisted?: boolean }).unlisted) continue

    const parts = slug.split("/")
    if (parts.length === 1) {
      if (slug === "index" || slug === "404") continue
      pages.push({ key: slug, title: file.frontmatter?.title ?? fallbackTitle(slug), slug })
      continue
    }

    const top = parts[0]
    if (top === "tags") continue
    const isFolderIndex = parts.length === 2 && parts[1] === "index"
    const known = sections.get(top)
    if (!known || isFolderIndex) {
      const title =
        isFolderIndex && file.frontmatter?.title
          ? file.frontmatter.title
          : (known?.title ?? fallbackTitle(top))
      sections.set(top, { key: top, title, slug: `${top}/index` as FullSlug })
    }
  }

  return { sections: [...sections.values()].sort(byTitle), pages: pages.sort(byTitle) }
}

export const KeirbeFrame: PageFrame = {
  name: "keirbe",
  render({
    componentData,
    header,
    beforeBody,
    pageBody: Content,
    afterBody,
    left,
    right,
    footer,
  }: PageFrameProps) {
    const slug = componentData.fileData.slug as FullSlug
    const current = slug.includes("/") ? slug.split("/")[0] : slug
    const { sections, pages } = buildTabs(componentData.allFiles)
    const [Brand, Centre, ...Actions] = header

    const renderTab = (tab: Tab) => {
      const active = tab.key === current
      return (
        <a
          href={resolveRelative(slug, tab.slug)}
          class={active ? "kb-tab active" : "kb-tab"}
          aria-current={active ? "page" : undefined}
        >
          {tab.title}
        </a>
      )
    }

    return (
      <>
        <header class="kb-topbar">
          <div class="kb-bar kb-bar-main">
            <div class="kb-bar-left">{Brand && <Brand {...componentData} />}</div>
            <div class="kb-bar-centre">{Centre && <Centre {...componentData} />}</div>
            <div class="kb-bar-right">
              <a class="kb-cta" href={COURSE_SIGN_IN.href}>
                {COURSE_SIGN_IN.label}
              </a>
              {Actions.map((Action) => (
                <Action {...componentData} />
              ))}
            </div>
          </div>
          <nav class="kb-bar kb-tabs" aria-label="Sections">
            <div class="kb-tabs-group">{sections.map(renderTab)}</div>
            <div class="kb-tabs-group">{pages.map(renderTab)}</div>
          </nav>
        </header>
        <div class="left sidebar">
          {left.map((BodyComponent) => (
            <BodyComponent {...componentData} />
          ))}
        </div>
        <div class="center">
          <div class="page-header">
            <div class="popover-hint">
              {beforeBody.map((BodyComponent) => (
                <BodyComponent {...componentData} />
              ))}
            </div>
          </div>
          <Content {...componentData} />
          <hr />
          <div class="page-footer">
            {afterBody.map((BodyComponent) => (
              <BodyComponent {...componentData} />
            ))}
          </div>
        </div>
        <div class="right sidebar">
          {right.map((BodyComponent) => (
            <BodyComponent {...componentData} />
          ))}
        </div>
        {footer.map((FooterComponent) => (
          <FooterComponent {...componentData} />
        ))}
      </>
    )
  },
}

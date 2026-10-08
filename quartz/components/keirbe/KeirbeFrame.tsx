import { PageFrame, PageFrameProps } from "../frames/types"
import type { Root } from "hast"
import { QuartzPluginData } from "../../plugins/vfile"
import { FullSlug, pathToRoot, resolveRelative } from "../../util/path"
import { CONTACT_FORM_SCRIPT, ContactForm } from "./ContactForm"
import { AcornMark } from "./Acorn"
import { KeirbeGrowth } from "./Growth"
import { withGrowthIcons } from "./growthEmoji"
import { KeirbeNav, NAV_SCRIPT } from "./Nav"
import { KeirbeToc, TOC_SCRIPT } from "./Toc"

/**
 * keir.be page frame, modelled on Mintlify "Sequoia".
 *
 * A full-bleed, sticky header in two bars sits above Quartz's usual three columns:
 *  - Top bar: the brand on the left ("keir.be" is the home link; "nson" follows in a
 *    lighter shade, so it reads keir.benson). Then the `header` layout slot from
 *    quartz.config.yaml: its first component sits in the centre (search), the rest on
 *    the right (mode toggles), followed by the sign-in button at the far right.
 *  - Tab bar: the pages whose `nav-bar` box is ticked (a checkbox property in
 *    Obsidian). A ticked folder page (the folder's index.md) is a section tab on the
 *    left, marked anywhere in that folder; other ticked pages sit on the right,
 *    marked on that page. Each group is in alphabetical order.
 *
 * Registered in quartz.ts (no edits to Quartz's own files) and selected per page
 * type with `layout.byPageType.<type>.template: keirbe`.
 * Styles: quartz/styles/keirbe/_header.scss
 */

// The brand: cfg.pageTitle ("keir.be") is the link; this tail completes the old name.
const BRAND_TAIL = "nson"

const SIGN_IN = {
  label: "Sign-in",
  href: "https://learn.keir.be/learn/",
}

// The frontmatter checkbox that puts a page in the tab bar
const TAB_PROPERTY = "nav-bar"

interface Tab {
  key: string // a folder path (section tabs) or a page slug
  title: string
  slug: FullSlug
  folder: boolean
}

const byTitle = (a: Tab, b: Tab) =>
  a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" })

function fallbackTitle(segment: string): string {
  const words = segment.replace(/-/g, " ")
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function buildTabs(allFiles: QuartzPluginData[]): { sections: Tab[]; pages: Tab[] } {
  const sections: Tab[] = []
  const pages: Tab[] = []

  for (const file of allFiles) {
    const slug = file.slug
    if (!slug || file.frontmatter?.[TAB_PROPERTY] !== true) continue
    if ((file as { unlisted?: boolean }).unlisted) continue
    if (slug === "index" || slug === "404" || slug.startsWith("tags/")) continue

    const parts = slug.split("/")
    const last = parts[parts.length - 1]
    if (last === "index") {
      sections.push({
        key: parts.slice(0, -1).join("/"),
        title: file.frontmatter?.title ?? fallbackTitle(parts[parts.length - 2]),
        slug: slug as FullSlug,
        folder: true,
      })
    } else {
      pages.push({
        key: slug,
        title: file.frontmatter?.title ?? fallbackTitle(last),
        slug: slug as FullSlug,
        folder: false,
      })
    }
  }

  return { sections: sections.sort(byTitle), pages: pages.sort(byTitle) }
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
    const { sections, pages } = buildTabs(componentData.allFiles)
    const [Centre, ...Actions] = header
    const showContactForm = componentData.fileData.frontmatter?.["contact-form"] === true

    const renderTab = (tab: Tab) => {
      const active = tab.folder ? slug.startsWith(tab.key + "/") : slug === tab.slug
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
            <div class="kb-bar-left">
              <h2 class="kb-brand">
                <a href={pathToRoot(slug)}>
                  <AcornMark />
                  {componentData.cfg.pageTitle}
                </a>
                <span class="kb-brand-tail">{BRAND_TAIL}</span>
              </h2>
            </div>
            <div class="kb-bar-centre">{Centre && <Centre {...componentData} />}</div>
            <div class="kb-bar-right">
              {Actions.map((Action) => (
                <Action {...componentData} />
              ))}
              <a class="kb-cta" href={SIGN_IN.href}>
                {SIGN_IN.label}
              </a>
            </div>
          </div>
          <nav class="kb-bar kb-tabs" aria-label="Sections">
            <button class="kb-nav-button" type="button" aria-label="Menu" aria-expanded="false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            </button>
            <div class="kb-tabs-group">{sections.map(renderTab)}</div>
            <div class="kb-tabs-group">{pages.map(renderTab)}</div>
          </nav>
        </header>
        <div class="left sidebar">
          <KeirbeNav allFiles={componentData.allFiles} slug={slug} />
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
              <KeirbeGrowth fileData={componentData.fileData} allFiles={componentData.allFiles} />
            </div>
          </div>
          <Content {...componentData} tree={withGrowthIcons(componentData.tree as Root)} />
          {showContactForm && <ContactForm />}
          <hr />
          <div class="page-footer">
            {afterBody.map((BodyComponent) => (
              <BodyComponent {...componentData} />
            ))}
          </div>
        </div>
        <div class="right sidebar">
          <KeirbeToc fileData={componentData.fileData} />
          {right.map((BodyComponent) => (
            <BodyComponent {...componentData} />
          ))}
        </div>
        {footer.map((FooterComponent) => (
          <FooterComponent {...componentData} />
        ))}
        <script dangerouslySetInnerHTML={{ __html: NAV_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: TOC_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: CONTACT_FORM_SCRIPT }} />
      </>
    )
  },
}

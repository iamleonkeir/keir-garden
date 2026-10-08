import { PageFrame, PageFrameProps } from "../frames/types"
import { QuartzPluginData } from "../../plugins/vfile"
import { FullSlug, pathToRoot, resolveRelative } from "../../util/path"
import { CONTACT_FORM_SCRIPT, ContactForm } from "./ContactForm"
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
 *  - Tab bar: the vault's top-level folders as tabs on the left, its standalone
 *    root-level pages on the right. Worked out from the content, so a new folder
 *    becomes a tab by itself. The current section is marked.
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
    const [Centre, ...Actions] = header
    const showContactForm = componentData.fileData.frontmatter?.["contact-form"] === true

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
            <div class="kb-bar-left">
              <h2 class="kb-brand">
                <a href={pathToRoot(slug)}>{componentData.cfg.pageTitle}</a>
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
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
            </div>
          </div>
          <Content {...componentData} />
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

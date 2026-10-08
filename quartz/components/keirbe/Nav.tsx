import { QuartzPluginData } from "../../plugins/vfile"
import { FullSlug, resolveRelative } from "../../util/path"

/**
 * keir.be left-hand menu (replaces Quartz's "Explorer"), Sequoia style.
 * Rendered by KeirbeFrame into the left sidebar, worked out from the vault:
 *  - inside a section (a top-level folder such as Topics): that section's notes,
 *    with subfolders as subheadings
 *  - anywhere else (home, About, Contact…): "The garden" (home + root pages) and
 *    "Sections" (the top-level folders)
 * The current page is marked. On phones the menu opens from the tab bar's menu button.
 */

interface NavNode {
  key: string
  title: string
  slug?: FullSlug // a page, or a folder's own index page
  children: NavNode[]
}

const byTitle = (a: { title: string }, b: { title: string }) =>
  a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" })

function fallbackTitle(segment: string): string {
  const words = segment.replace(/-/g, " ")
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function listed(file: QuartzPluginData): boolean {
  return !!file.slug && !(file as { unlisted?: boolean }).unlisted
}

/** All pages under a top-level folder, as a tree (folders become nodes with children). */
function sectionTree(allFiles: QuartzPluginData[], section: string): NavNode {
  const root: NavNode = { key: section, title: fallbackTitle(section), children: [] }
  const folders = new Map<string, NavNode>([[section, root]])

  const folderNode = (path: string[]): NavNode => {
    const id = path.join("/")
    let node = folders.get(id)
    if (!node) {
      node = { key: id, title: fallbackTitle(path[path.length - 1]), children: [] }
      folders.set(id, node)
      folderNode(path.slice(0, -1)).children.push(node)
    }
    return node
  }

  for (const file of allFiles) {
    if (!listed(file)) continue
    const parts = file.slug!.split("/")
    if (parts[0] !== section || parts.length < 2) continue
    const last = parts[parts.length - 1]
    const folder = folderNode(parts.slice(0, -1))
    if (last === "index") {
      folder.slug = file.slug as FullSlug
      if (file.frontmatter?.title) folder.title = file.frontmatter.title
    } else {
      folder.children.push({
        key: file.slug!,
        title: file.frontmatter?.title ?? fallbackTitle(last),
        slug: file.slug as FullSlug,
        children: [],
      })
    }
  }

  const sort = (node: NavNode) => {
    // pages first, then subfolders, each alphabetically
    const pages = node.children.filter((c) => c.children.length === 0 && !folders.has(c.key))
    const subs = node.children.filter((c) => folders.has(c.key))
    node.children = [...pages.sort(byTitle), ...subs.sort(byTitle)]
    subs.forEach(sort)
  }
  sort(root)
  return root
}

function gardenGroups(allFiles: QuartzPluginData[]): NavNode[] {
  const home: NavNode[] = []
  const pages: NavNode[] = []
  const sections = new Map<string, NavNode>()
  for (const file of allFiles) {
    if (!listed(file)) continue
    const slug = file.slug!
    const parts = slug.split("/")
    if (parts.length === 1) {
      if (slug === "404") continue
      const node: NavNode = {
        key: slug,
        title: file.frontmatter?.title ?? fallbackTitle(slug),
        slug: slug as FullSlug,
        children: [],
      }
      ;(slug === "index" ? home : pages).push(node)
    } else if (parts[0] !== "tags") {
      const top = parts[0]
      const isIndex = parts.length === 2 && parts[1] === "index"
      const known = sections.get(top)
      if (!known || isIndex) {
        sections.set(top, {
          key: top,
          title: isIndex && file.frontmatter?.title ? file.frontmatter.title : (known?.title ?? fallbackTitle(top)),
          slug: `${top}/index` as FullSlug,
          children: [],
        })
      }
    }
  }
  return [
    { key: "garden", title: "The garden", children: [...home, ...pages.sort(byTitle)] },
    { key: "sections", title: "Sections", children: [...sections.values()].sort(byTitle) },
  ]
}

export function KeirbeNav({ allFiles, slug }: { allFiles: QuartzPluginData[]; slug: FullSlug }) {
  const parts = slug.split("/")
  const section = parts.length > 1 && parts[0] !== "tags" ? parts[0] : null
  const groups = section ? [sectionTree(allFiles, section)] : gardenGroups(allFiles)

  const link = (node: NavNode, cls: string) => {
    const active = node.slug === slug
    return node.slug ? (
      <a
        class={active ? `${cls} active` : cls}
        href={resolveRelative(slug, node.slug)}
        aria-current={active ? "page" : undefined}
      >
        {node.title}
      </a>
    ) : (
      <span class={cls}>{node.title}</span>
    )
  }

  const renderList = (nodes: NavNode[]) => (
    <ul>
      {nodes.map((node) =>
        node.children.length > 0 ? (
          <li class="kb-nav-sub">
            {link(node, "kb-nav-subheading")}
            {renderList(node.children)}
          </li>
        ) : (
          <li>{link(node, "kb-nav-item")}</li>
        ),
      )}
    </ul>
  )

  return (
    <nav class="kb-nav" aria-label="Pages">
      {groups.map((group) => (
        <div class="kb-nav-group">
          {link(group, "kb-nav-heading")}
          {renderList(group.children)}
        </div>
      ))}
    </nav>
  )
}

/** Opens and closes the menu on phones; closes it after every page change. Runs once. */
export const NAV_SCRIPT = `(function () {
  if (window.__kbNav) return;
  window.__kbNav = true;
  var root = document.documentElement;
  function setOpen(open) {
    root.classList.toggle("kb-nav-open", open);
    var button = document.querySelector(".kb-nav-button");
    if (button) button.setAttribute("aria-expanded", open ? "true" : "false");
  }
  document.addEventListener("click", function (event) {
    var button = event.target.closest && event.target.closest(".kb-nav-button");
    if (button) setOpen(!root.classList.contains("kb-nav-open"));
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") setOpen(false);
  });
  document.addEventListener("nav", function () { setOpen(false); });
})();`

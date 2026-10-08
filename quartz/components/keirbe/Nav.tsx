import { QuartzPluginData } from "../../plugins/vfile"
import { FullSlug, resolveRelative } from "../../util/path"

/**
 * keir.be left-hand menu (replaces Quartz's "Explorer"): a plain file tree, close to
 * Obsidian's. Rendered by KeirbeFrame into the left sidebar, worked out from the vault.
 *
 *  - No headings: the vault's root pages, then its folders.
 *  - Folders fold out (native <details>), with subfolders nested the same way.
 *  - Order at every level: pages first, then folders; each alphabetical by title
 *    (case-insensitive, numbers in natural order).
 *  - A folder's name links to its own page (its index.md); its chevron folds it.
 *  - One branch open at a time: only the folders holding the current page are open,
 *    so following links through the garden, the menu always shows where you are.
 *    Opening another folder by hand closes the rest (NAV_SCRIPT).
 *  - Not listed: the home page (the brand links to it), folder index pages (they are
 *    the folder), tag pages, unlisted pages.
 * On phones the menu opens from the tab bar's menu button.
 */

interface NavNode {
  key: string // folder path, or page slug
  title: string
  slug?: FullSlug // a page, or a folder's own index page
  folder: boolean
  children: NavNode[]
}

const byTitle = (a: NavNode, b: NavNode) =>
  a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" })

function fallbackTitle(segment: string): string {
  const words = segment.replace(/-/g, " ")
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function buildTree(allFiles: QuartzPluginData[]): NavNode {
  const root: NavNode = { key: "", title: "", folder: true, children: [] }
  const folders = new Map<string, NavNode>([["", root]])

  const folderNode = (path: string[]): NavNode => {
    const key = path.join("/")
    let node = folders.get(key)
    if (!node) {
      node = { key, title: fallbackTitle(path[path.length - 1]), folder: true, children: [] }
      folders.set(key, node)
      folderNode(path.slice(0, -1)).children.push(node)
    }
    return node
  }

  for (const file of allFiles) {
    const slug = file.slug
    if (!slug || (file as { unlisted?: boolean }).unlisted) continue
    const parts = slug.split("/")
    if (parts[0] === "tags" || slug === "index" || slug === "404") continue
    const last = parts[parts.length - 1]
    const parent = folderNode(parts.slice(0, -1))
    if (last === "index") {
      parent.slug = slug as FullSlug
      if (file.frontmatter?.title) parent.title = file.frontmatter.title
    } else {
      parent.children.push({
        key: slug,
        title: file.frontmatter?.title ?? fallbackTitle(last),
        slug: slug as FullSlug,
        folder: false,
        children: [],
      })
    }
  }

  const sort = (node: NavNode) => {
    const pages = node.children.filter((c) => !c.folder).sort(byTitle)
    const subfolders = node.children.filter((c) => c.folder).sort(byTitle)
    node.children = [...pages, ...subfolders]
    subfolders.forEach(sort)
  }
  sort(root)
  return root
}

const Chevron = () => (
  <svg class="kb-tree-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polyline points="9 6 15 12 9 18" />
  </svg>
)

export function KeirbeNav({ allFiles, slug }: { allFiles: QuartzPluginData[]; slug: FullSlug }) {
  const tree = buildTree(allFiles)

  const renderNodes = (nodes: NavNode[]) => (
    <ul>
      {nodes.map((node) => {
        if (!node.folder) {
          const active = node.slug === slug
          return (
            <li>
              <a
                class={active ? "kb-tree-item active" : "kb-tree-item"}
                href={resolveRelative(slug, node.slug!)}
                aria-current={active ? "page" : undefined}
              >
                {node.title}
              </a>
            </li>
          )
        }
        const here = node.slug === slug
        const holdsCurrent = slug.startsWith(node.key + "/")
        return (
          <li class="kb-tree-folder">
            <details open={holdsCurrent} data-folder={node.key}>
              <summary class={here ? "kb-tree-summary active" : "kb-tree-summary"}>
                <Chevron />
                {node.slug ? (
                  <a
                    class="kb-tree-folder-link"
                    href={resolveRelative(slug, node.slug)}
                    aria-current={here ? "page" : undefined}
                  >
                    {node.title}
                  </a>
                ) : (
                  <span>{node.title}</span>
                )}
              </summary>
              {renderNodes(node.children)}
            </details>
          </li>
        )
      })}
    </ul>
  )

  return (
    <nav class="kb-nav" aria-label="Pages">
      {renderNodes(tree.children)}
    </nav>
  )
}

/**
 * Phones: opens and closes the menu, and closes it after every page change.
 * Everywhere: one branch open at a time. Opening a folder by hand closes every other
 * open folder that isn't one of its parents. (After a page change the page itself
 * arrives with only the current page's folders open.) Runs once.
 */
export const NAV_SCRIPT = `(function () {
  if (window.__kbNav) return;
  window.__kbNav = true;
  var root = document.documentElement;
  document.addEventListener("toggle", function (event) {
    var opened = event.target;
    if (!opened.matches || !opened.matches(".kb-nav details[data-folder]") || !opened.open) return;
    document.querySelectorAll(".kb-nav details[data-folder][open]").forEach(function (d) {
      if (d !== opened && !d.contains(opened)) d.open = false;
    });
  }, true);
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

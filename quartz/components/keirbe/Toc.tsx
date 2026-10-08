import { QuartzPluginData } from "../../plugins/vfile"

/**
 * keir.be "On this page" (Sequoia's name for it), drawn by KeirbeFrame in the right
 * column. Always open, never collapsible. The headings come from the
 * table-of-contents plugin's transformer (fileData.toc); its own component is
 * excluded per page type in quartz.config.yaml so it isn't drawn twice.
 * The section being read is highlighted (TOC_SCRIPT).
 */

interface TocEntry {
  depth: number
  text: string
  slug: string
}

export function KeirbeToc({ fileData }: { fileData: QuartzPluginData }) {
  const toc = (fileData as { toc?: TocEntry[] }).toc
  if (!toc || toc.length === 0) return null
  return (
    <nav class="kb-toc" aria-label="On this page">
      <h3 class="kb-toc-title">On this page</h3>
      <ul>
        {toc.map((entry) => (
          <li class={`depth-${entry.depth}`}>
            <a href={`#${entry.slug}`} data-for={entry.slug}>
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * Highlights the heading currently being read: the last one that has passed under the
 * header. Two cases that rule misses on short pages, where the last headings can never
 * scroll up that far:
 *  - at the very bottom of the page, the last heading on screen is marked;
 *  - a heading picked from the list stays marked while it's in view.
 * Runs once; re-reads the page on "nav".
 */
export const TOC_SCRIPT = `(function () {
  if (window.__kbToc) return;
  window.__kbToc = true;
  var OFFSET = 130; // the sticky header plus a little air
  var queued = false;
  var picked = null; // a link just clicked in the list
  var pickedAt = 0;
  function mark(current) {
    document.querySelectorAll(".kb-toc a[data-for]").forEach(function (link) {
      link.classList.toggle("active", link === current);
    });
  }
  function update() {
    queued = false;
    var links = document.querySelectorAll(".kb-toc a[data-for]");
    if (!links.length) return;
    if (picked && document.body.contains(picked)) {
      var target = document.getElementById(picked.dataset.for);
      var top = target ? target.getBoundingClientRect().top : -1;
      // Hold while the jump is still scrolling, then while its heading is in the top half
      if (Date.now() - pickedAt < 1000 || (top >= 0 && top < window.innerHeight / 2)) {
        mark(picked);
        return;
      }
    }
    picked = null;
    var atBottom =
      window.scrollY > 0 &&
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    var current = links[0];
    links.forEach(function (link) {
      var heading = document.getElementById(link.dataset.for);
      if (!heading) return;
      var top = heading.getBoundingClientRect().top;
      if (top <= OFFSET || (atBottom && top < window.innerHeight)) current = link;
    });
    mark(current);
  }
  window.addEventListener("scroll", function () {
    if (!queued) { queued = true; requestAnimationFrame(update); }
  }, { passive: true });
  document.addEventListener("click", function (event) {
    var link = event.target.closest && event.target.closest(".kb-toc a[data-for]");
    if (!link) return;
    picked = link;
    pickedAt = Date.now();
    mark(link);
  });
  document.addEventListener("nav", function () { picked = null; update(); });
  update();
})();`

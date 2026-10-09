import { readFileSync } from "fs"
import { join } from "path"

/**
 * keir.be footer, drawn by KeirbeFrame in place of Quartz's footer plugin (switched off
 * in quartz.config.yaml), so it can credit both tools the garden is made with:
 * "Created with Quartz v5.0.0 and Obsidian © 2026". Styles: footer in _components.scss.
 */

function quartzVersion(): string {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf-8")).version ?? ""
  } catch {
    return ""
  }
}

const VERSION = quartzVersion()

export function KeirbeFooter() {
  return (
    <footer>
      <p>
        Created with <a href="https://quartz.jzhao.xyz/">Quartz{VERSION ? ` v${VERSION}` : ""}</a>{" "}
        and <a href="https://obsidian.md/">Obsidian</a> © {new Date().getFullYear()}
      </p>
    </footer>
  )
}

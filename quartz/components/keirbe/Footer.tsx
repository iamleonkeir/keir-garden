import { readFileSync, writeFileSync } from "fs"
import { join } from "path"

/**
 * keir.be footer, drawn by KeirbeFrame in place of Quartz's footer plugin (switched off
 * in quartz.config.yaml), so it can credit both tools the garden is made with:
 * "Created with Quartz v5.0.0 and Obsidian v1.12.7 © 2026". Styles: footer in
 * _components.scss.
 */

const QUARTZ_PACKAGE = join(process.cwd(), "package.json")

// Cloudflare builds the live site without Obsidian, so its version is recorded in a file
// next to this one: every build on keirone (the preview included) reads the installed app
// and updates the file when it has changed. The file goes up with the next push, and the
// live build reads it from there.
const OBSIDIAN_APP = "/Applications/Obsidian.app/Contents/Info.plist"
const OBSIDIAN_RECORD = join(process.cwd(), "quartz/components/keirbe/obsidian-version.txt")

function quartzVersion(): string {
  try {
    return JSON.parse(readFileSync(QUARTZ_PACKAGE, "utf-8")).version ?? ""
  } catch {
    return ""
  }
}

function obsidianVersion(): string {
  let recorded = ""
  try {
    recorded = readFileSync(OBSIDIAN_RECORD, "utf-8").trim()
  } catch {}
  try {
    const plist = readFileSync(OBSIDIAN_APP, "utf-8")
    const installed = plist.match(
      /<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/,
    )?.[1]
    if (installed && installed !== recorded) {
      writeFileSync(OBSIDIAN_RECORD, installed + "\n")
      return installed
    }
  } catch {}
  return recorded
}

const QUARTZ = quartzVersion()
const OBSIDIAN = obsidianVersion()

export function KeirbeFooter() {
  return (
    <footer>
      <p>
        Created with <a href="https://quartz.jzhao.xyz/">Quartz{QUARTZ ? ` v${QUARTZ}` : ""}</a>{" "}
        and <a href="https://obsidian.md/">Obsidian{OBSIDIAN ? ` v${OBSIDIAN}` : ""}</a> ©{" "}
        {new Date().getFullYear()}
      </p>
    </footer>
  )
}

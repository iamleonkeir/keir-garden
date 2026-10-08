/**
 * keir.be's mark: a solid acorn, the garden's seed. It sits before the brand in the
 * header (KeirbeFrame) and is the site icon: quartz/static/acorn.svg is the same shape,
 * rendered to quartz/static/icon.png, from which Quartz makes favicon.ico.
 * Olive cap, lime nut: legible on light and dark browser tab bars alike.
 * The thin line acorn in the growth row (Growth.tsx) is its drawn counterpart.
 *
 * To redraw the icon after changing acorn.svg (from the repo root):
 *   node -e "require('sharp')('quartz/static/acorn.svg',{density:1200}).resize(256,256).png().toFile('quartz/static/icon.png')"
 * Colours: --kb-mark-cap / --kb-mark-nut in quartz/styles/keirbe/_tokens.scss
 */

export const ACORN = {
  stalk: "M12 5c0-1.3.8-2.3 2.2-2.8",
  cap: "M4.5 11.25c0-3.7 3.36-6.5 7.5-6.5s7.5 2.8 7.5 6.5z",
  nut: "M6.25 12.5c0 5 2.5 8.5 5.75 9.75c3.25-1.25 5.75-4.75 5.75-9.75z",
}

export function AcornMark() {
  return (
    <svg class="kb-brand-mark" viewBox="1.5 1.5 21 21" width="22" height="22" aria-hidden="true">
      <path class="kb-mark-stalk" d={ACORN.stalk} />
      <path class="kb-mark-cap" d={ACORN.cap} />
      <path class="kb-mark-nut" d={ACORN.nut} />
    </svg>
  )
}

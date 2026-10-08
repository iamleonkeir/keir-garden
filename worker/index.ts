/**
 * keir.be Worker: serves the Quartz site (static assets) and handles the contact form.
 *
 * Only /api/* reaches this code (wrangler.jsonc: assets.run_worker_first); every other
 * request is served straight from the built site in ./public.
 *
 * POST /api/contact
 *   form fields: name, reply, message, website (bot trap: must stay empty),
 *   cf-turnstile-response (added by the Turnstile widget)
 *   → checks Turnstile, then emails the message to Parzifal's inbox.
 *
 * Secrets (Cloudflare dashboard → keir-be → Settings → Variables and Secrets).
 * They are deliberately NOT in this public repo, and no response ever echoes them:
 *   CONTACT_TO        destination inbox (must be verified in Email Routing)
 *   CONTACT_FROM      sender address on keir.be (Email Routing domain)
 *   TURNSTILE_SECRET  Turnstile secret key
 */

interface EmailAddress {
  email: string
  name?: string
}

interface SendEmailBinding {
  send(message: {
    from: string | EmailAddress
    to: string | EmailAddress
    subject: string
    text?: string
    html?: string
    replyTo?: string | EmailAddress
  }): Promise<{ messageId: string }>
}

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> }
  CONTACT_EMAIL: SendEmailBinding
  CONTACT_TO: string
  CONTACT_FROM: string
  TURNSTILE_SECRET: string
}

const LIMITS = { name: 100, reply: 200, message: 5000 }
const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

type Outcome = { ok: true } | { ok: false; error: "invalid" | "verification" | "send" | "method" }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === "/api/contact") {
      const outcome = await handleContact(request, env)
      return respond(request, outcome)
    }
    if (url.pathname.startsWith("/api/")) {
      return new Response("Not found", { status: 404 })
    }
    // Anything else belongs to the site: let the static assets (and their 404 page) answer
    return env.ASSETS.fetch(request)
  },
}

async function handleContact(request: Request, env: Env): Promise<Outcome> {
  if (request.method !== "POST") return { ok: false, error: "method" }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return { ok: false, error: "invalid" }
  }

  const field = (key: string) => String(form.get(key) ?? "").trim()
  const name = field("name")
  const reply = field("reply")
  const message = field("message")

  // Bot trap: people never see this field, so anything in it is a bot. Pretend success.
  if (field("website") !== "") return { ok: true }

  if (
    message.length < 2 ||
    message.length > LIMITS.message ||
    name.length > LIMITS.name ||
    reply.length > LIMITS.reply
  ) {
    return { ok: false, error: "invalid" }
  }

  const verified = await verifyTurnstile(
    field("cf-turnstile-response"),
    request.headers.get("CF-Connecting-IP"),
    env.TURNSTILE_SECRET,
  )
  if (!verified) return { ok: false, error: "verification" }

  const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").slice(0, 80)
  const sender = name ? oneLine(name) : "someone"
  const text = [
    "A message from the keir.be contact form.",
    "",
    `Name: ${name || "(not given)"}`,
    `How to reply: ${reply || "(not given)"}`,
    `Sent: ${new Date().toISOString()}`,
    "",
    "----------------------------------------",
    "",
    message,
    "",
    "----------------------------------------",
    EMAIL_PATTERN.test(reply)
      ? "Pressing Reply answers them directly (it goes to the address they gave)."
      : "They didn't leave an email address, so Reply won't reach them.",
  ].join("\n")

  try {
    await env.CONTACT_EMAIL.send({
      from: { email: env.CONTACT_FROM, name: "keir.be garden" },
      to: env.CONTACT_TO,
      subject: `keir.be: a message from ${sender}`,
      text,
      replyTo: EMAIL_PATTERN.test(reply) ? reply : undefined,
    })
  } catch (err) {
    // Logged privately in the Cloudflare account only; the visitor gets a generic error.
    console.error("contact form: sending failed", err instanceof Error ? err.message : err)
    return { ok: false, error: "send" }
  }

  return { ok: true }
}

async function verifyTurnstile(token: string, ip: string | null, secret: string): Promise<boolean> {
  if (!token || !secret) return false
  const body = new URLSearchParams({ secret, response: token })
  if (ip) body.set("remoteip", ip)
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    })
    const outcome = (await res.json()) as { success?: boolean }
    return outcome.success === true
  } catch {
    return false
  }
}

// JSON for the page's script; a plain redirect if the form was posted without JavaScript.
function respond(request: Request, outcome: Outcome): Response {
  const status = outcome.ok ? 200 : outcome.error === "method" ? 405 : outcome.error === "send" ? 502 : 400
  const wantsJson = (request.headers.get("Accept") ?? "").includes("application/json")
  if (wantsJson) {
    return new Response(JSON.stringify(outcome), {
      status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    })
  }
  const back = new URL("/contact", request.url)
  back.searchParams.set(outcome.ok ? "sent" : "error", outcome.ok ? "1" : outcome.error)
  return Response.redirect(back.toString(), 303)
}

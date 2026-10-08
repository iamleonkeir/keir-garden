/**
 * keir.be contact form. Rendered by KeirbeFrame on any page whose frontmatter has
 * `contact-form: true`. Posts to /api/contact (worker/index.ts), which checks
 * Turnstile and emails the message on. No email address appears anywhere on the page.
 *
 * Turnstile site key: public by design. KB_TURNSTILE_SITE_KEY overrides it at build
 * time (e.g. Cloudflare's always-pass test key for local testing).
 */

// The "keir.be contact" Turnstile widget (Managed mode, hostname keir.be). Local testing:
// KB_TURNSTILE_SITE_KEY=1x00000000000000000000AA (Cloudflare's always-pass test key).
const TURNSTILE_SITE_KEY = process.env.KB_TURNSTILE_SITE_KEY ?? "0x4AAAAAAFRXjfT4Ypr33uKa"

export function ContactForm() {
  return (
    <form class="kb-contact-form" action="/api/contact" method="post">
      <div class="kb-field">
        <label for="kb-contact-name">Your name</label>
        <input id="kb-contact-name" name="name" type="text" maxLength={100} autocomplete="name" />
      </div>
      <div class="kb-field">
        <label for="kb-contact-reply">
          How can I reply? <span class="kb-optional">Optional</span>
        </label>
        <input
          id="kb-contact-reply"
          name="reply"
          type="text"
          maxLength={200}
          placeholder="An email address, or anything else that reaches you"
        />
      </div>
      <div class="kb-field">
        <label for="kb-contact-message">Message</label>
        <textarea id="kb-contact-message" name="message" required minLength={2} maxLength={5000} rows={7} />
      </div>
      <div class="kb-trap" aria-hidden="true">
        <label for="kb-contact-website">Leave this empty</label>
        <input id="kb-contact-website" name="website" type="text" tabIndex={-1} autocomplete="off" />
      </div>
      <div class="kb-turnstile" data-sitekey={TURNSTILE_SITE_KEY}></div>
      <div class="kb-form-actions">
        <button type="submit" class="kb-button">
          Send
        </button>
        <p class="kb-form-status" role="status" aria-live="polite"></p>
      </div>
    </form>
  )
}

/**
 * Sets the form up wherever and however the page is reached. Quartz swaps pages without
 * full reloads and doesn't re-run scripts in the new page body, so this runs once (on the
 * first page loaded) and listens for Quartz's "nav" event from then on.
 */
export const CONTACT_FORM_SCRIPT = `(function () {
  if (window.__kbContact) return;
  window.__kbContact = true;
  var SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  var MESSAGES = {
    sending: "Sending…",
    sent: "Thank you. Your message is on its way.",
    verification: "The spam check didn't go through. Please try again.",
    invalid: "Please write a message (up to 5,000 characters).",
    other: "Sorry, something went wrong. Please try again later."
  };
  function loadTurnstile(done) {
    if (window.turnstile) return done();
    var s = document.getElementById("kb-turnstile-js");
    if (!s) {
      s = document.createElement("script");
      s.id = "kb-turnstile-js";
      s.src = SRC;
      s.async = true;
      s.setAttribute("data-persist", "");
      document.head.appendChild(s);
    }
    s.addEventListener("load", done, { once: true });
  }
  function setup() {
    var form = document.querySelector("form.kb-contact-form");
    if (!form || form.dataset.ready) return;
    form.dataset.ready = "1";
    var box = form.querySelector(".kb-turnstile");
    var status = form.querySelector(".kb-form-status");
    var button = form.querySelector("button[type=submit]");
    var widget = null;
    loadTurnstile(function () {
      if (!document.body.contains(box)) return;
      var dark = document.documentElement.getAttribute("saved-theme") === "dark";
      widget = window.turnstile.render(box, {
        sitekey: box.dataset.sitekey,
        theme: dark ? "dark" : "light",
        appearance: "interaction-only"
      });
    });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      button.disabled = true;
      status.textContent = MESSAGES.sending;
      form.classList.remove("kb-error");
      fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
        .then(function (res) { return res.json().catch(function () { return { ok: false }; }); })
        .then(function (result) {
          if (result.ok) {
            form.reset();
            status.textContent = MESSAGES.sent;
          } else {
            form.classList.add("kb-error");
            status.textContent = MESSAGES[result.error] || MESSAGES.other;
          }
        })
        .catch(function () {
          form.classList.add("kb-error");
          status.textContent = MESSAGES.other;
        })
        .finally(function () {
          button.disabled = false;
          if (window.turnstile && widget !== null) window.turnstile.reset(widget);
        });
    });
  }
  document.addEventListener("nav", setup);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup);
  else setup();
})();`

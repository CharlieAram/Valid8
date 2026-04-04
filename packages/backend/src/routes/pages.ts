import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";

const app = new Hono();

function injectTracking(html: string, variantId: string): string {
  const trackingScript = `
<script>
(function() {
  var vid = "${variantId}";
  var endpoint = "/api/webhooks/page-events";
  function track(type, meta) {
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId: vid, eventType: type, metadata: meta || {} })
    }).catch(function() {});
  }
  track("visit", { referrer: document.referrer, ua: navigator.userAgent });
  document.addEventListener("click", function(e) {
    var a = e.target.closest("a");
    if (a) track("click", { href: a.href, text: a.textContent.trim().slice(0, 100) });
  });
  document.addEventListener("submit", function(e) {
    var form = e.target;
    var data = {};
    new FormData(form).forEach(function(v, k) { if (k !== "password") data[k] = v; });
    track("signup", data);
  });
})();
</script>`;

  if (html.includes("</body>")) {
    return html.replace("</body>", trackingScript + "\n</body>");
  }
  return html + trackingScript;
}

// Serve a landing page (base or variant) by ID
app.get("/:id", async (c) => {
  const id = c.req.param("id");

  // Try variant first
  const [variant] = await db
    .select()
    .from(schema.landingPageVariants)
    .where(eq(schema.landingPageVariants.id, id));

  if (variant) {
    return c.html(injectTracking(variant.html, variant.id));
  }

  // Try base page
  const [basePage] = await db
    .select()
    .from(schema.landingPages)
    .where(eq(schema.landingPages.id, id));

  if (basePage) {
    return c.html(injectTracking(basePage.html, basePage.id));
  }

  return c.text("Page not found", 404);
});

export default app;

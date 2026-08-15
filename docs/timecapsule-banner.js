// Prominent site-wide banner identifying this as a time capsule / archival
// mirror, so visitors landing on any page (not just the homepage) know
// what they're looking at. Inserted as the very first element in <body>,
// via JS so it doesn't require touching every page's own HTML.
(function () {
  function init() {
    if (document.getElementById("ktown-timecapsule-banner")) return;
    var bar = document.createElement("div");
    bar.id = "ktown-timecapsule-banner";
    bar.style.cssText =
      "background:#111;color:#fff;font-family:Verdana,Arial,sans-serif;" +
      "font-size:12px;text-align:center;padding:8px 10px;line-height:1.4;" +
      "border-bottom:3px solid #ffcc33;position:relative;z-index:999998;";
    bar.innerHTML =
      '\u{1F570}\u{FE0F} <strong>Time Capsule:</strong> this is Ktown213.com as it appeared circa 2003–2005, ' +
      'rebuilt from Wayback Machine archives. It is not a live or current site. ' +
      '<a href="https://instagram.com/ktown213com" target="_blank" rel="noopener" ' +
      'style="color:#ffcc33;text-decoration:underline">Follow us on IG →</a>' +
      ' &middot; <a href="/new/index.html" ' +
      'style="color:#ffcc33;text-decoration:underline">View Modern Site →</a>';
    document.body.insertBefore(bar, document.body.firstChild);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

// This is a "time capsule" mirror rebuilt from Wayback Machine captures -
// many images (user avatars, banners, theme icons) were never crawled and
// no longer exist anywhere. Rather than showing the browser's native
// broken-image icon with no explanation, swap failed images for a sized
// placeholder that tells visitors why it's missing.
(function () {
  function intAttr(el, name) {
    var v = parseInt(el.getAttribute(name), 10);
    return isNaN(v) ? null : v;
  }

  document.addEventListener(
    "error",
    function (e) {
      var img = e.target;
      if (!img || img.tagName !== "IMG" || img.dataset.phFixed) return;
      img.dataset.phFixed = "1";

      var w = intAttr(img, "width") || img.width || 60;
      var h = intAttr(img, "height") || img.height || 60;
      var small = w < 40 || h < 40;
      var label = (img.alt ? img.alt + " — " : "") + "not archived by the Wayback Machine";

      var box = document.createElement("span");
      box.setAttribute("role", "img");
      box.setAttribute("aria-label", label);
      box.title = label;
      box.style.cssText =
        "box-sizing:border-box;width:" + w + "px;height:" + h + "px;" +
        "background:#e8e8e8;border:1px dashed #aaa;vertical-align:middle;" +
        "overflow:hidden;";

      if (small) {
        box.style.display = "inline-block";
      } else {
        box.style.cssText +=
          "display:inline-flex;flex-direction:column;align-items:center;" +
          "justify-content:center;font-family:Verdana,Arial,sans-serif;" +
          "color:#888;text-align:center;padding:2px;";
        var icon = document.createElement("div");
        icon.textContent = "📷"; // camera emoji, no external asset needed
        icon.style.cssText =
          "font-size:" + Math.max(10, Math.min(24, Math.floor(Math.min(w, h) / 3))) + "px;" +
          "line-height:1;opacity:0.6;";
        box.appendChild(icon);
        if (h >= 50) {
          var text = document.createElement("div");
          text.textContent = "Not archived";
          text.style.cssText = "font-size:9px;line-height:1.2;margin-top:2px;";
          box.appendChild(text);
        }
      }

      img.replaceWith(box);
    },
    true // capture phase - "error" doesn't bubble, so this is required
  );
})();

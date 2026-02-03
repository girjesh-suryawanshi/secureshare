(function initAnalytics() {
  if (typeof window === "undefined") {
    return;
  }

  window.dataLayer = window.dataLayer || [];

  // Google Analytics gtag configuration
  window.gtag = function gtag() {
    window.dataLayer?.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", "G-QEJZXF3K2D");

  // Google Tag Manager bootstrapper
  (function (w, d, s, l, i) {
    w[l] = w[l] || [];
    w[l].push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    const firstScript = d.getElementsByTagName(s)[0];
    const newScript = d.createElement(s);
    const dataLayerSuffix = l !== "dataLayer" ? `&l=${l}` : "";
    newScript.async = true;
    newScript.src = `https://www.googletagmanager.com/gtm.js?id=${i}${dataLayerSuffix}`;
    firstScript.parentNode?.insertBefore(newScript, firstScript);
  })(window, document, "script", "dataLayer", "GTM-TTXBHFXF");
})();

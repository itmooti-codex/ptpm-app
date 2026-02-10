// PTPM — Service Provider Portal SDK Wrapper
// VitalSync SDK initialization using credentials from the config bridge.
// Depends on: bridge.js (sets window.SDK_CONFIG)
(() => {
  if (typeof window === "undefined") return;
  if (typeof window.getVitalStatsPlugin === "function") return;

  const SDK_CONFIG = window.SDK_CONFIG || {
    slug: "peterpm",
    apiKey: "",
  };

  window.SDK_CONFIG = SDK_CONFIG;

  const loadVitalStatsSdk = () => {
    if (window.initVitalStats || window.initVitalStatsSDK) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://static-au03.vitalstats.app/static/sdk/v1/latest.js";
      script.async = true;
      script.crossOrigin = "anonymous";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const getVitalStatsPlugin = async () => {
    if (window.vitalStatsPlugin) return window.vitalStatsPlugin;
    if (!window.vitalStatsPluginPromise) {
      window.vitalStatsPluginPromise = (async () => {
        await loadVitalStatsSdk();
        const initFn = window.initVitalStats || window.initVitalStatsSDK;
        if (!initFn) throw new Error("VitalStats SDK init function missing");
        const { plugin } = await initFn({
          slug: SDK_CONFIG.slug,
          apiKey: SDK_CONFIG.apiKey,
          isDefault: true,
        }).toPromise();
        window.vitalStatsPlugin = plugin;
        return plugin;
      })();
    }
    return window.vitalStatsPluginPromise;
  };

  window.loadVitalStatsSdk = loadVitalStatsSdk;
  window.getVitalStatsPlugin = getVitalStatsPlugin;
})();

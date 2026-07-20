export async function registerStudySharePwa() {
  const inIframe = window.self !== window.top;
  const host = window.location.hostname;
  const params = new URLSearchParams(window.location.search);
  const shouldDisable =
    !import.meta.env.PROD ||
    inIframe ||
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev") ||
    params.get("sw") === "off";

  const registrations = await navigator.serviceWorker.getRegistrations();
  const appRegistrations = registrations.filter((registration) => registration.active?.scriptURL?.endsWith("/sw.js"));

  if (shouldDisable) {
    await Promise.all(appRegistrations.map((registration) => registration.unregister()));
    return;
  }

  await navigator.serviceWorker.register("/sw.js");
}

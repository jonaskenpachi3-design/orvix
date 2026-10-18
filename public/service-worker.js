const CACHE_NAME = "orvix-shell-v2";
const APP_SHELL = [
    "/",
    "/login.html",
    "/register.html",
    "/dashboard.html",
    "/transactions.html",
    "/categories.html",
    "/goals.html",
    "/budgets.html",
    "/reports.html",
    "/insights.html",
    "/offline.html",
    "/manifest.webmanifest",
    "/images/orvix-favicon.svg",
    "/images/orvix-logo.svg",
    "/images/logo-orvix.png",
    "/css/orvix-design-system.css",
    "/css/app-shell.css",
    "/css/auth.css",
    "/css/budgets.css",
    "/css/categories.css",
    "/css/dashboard.css",
    "/css/goals.css",
    "/css/insights.css",
    "/css/reports.css",
    "/css/transactions.css",
    "/js/pwa.js",
    "/js/auth.js",
    "/js/budgets.js",
    "/js/categories.js",
    "/js/dashboard.js",
    "/js/goals.js",
    "/js/insights.js",
    "/js/page-transitions.js",
    "/js/register.js",
    "/js/reports.js",
    "/js/transactions.js"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((names) => Promise.all(
                names
                    .filter((name) => name.startsWith("orvix-shell-") && name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const request = event.request;
    const url = new URL(request.url);

    if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
        return;
    }

    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(async () => {
                    const cachedPage = await caches.match(request);
                    return cachedPage || caches.match("/offline.html");
                })
        );
        return;
    }

    event.respondWith(
        caches.match(request).then((cached) => cached || fetch(request))
    );
});

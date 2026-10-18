if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/service-worker.js")
            .catch((error) => {
                console.error("Não foi possível ativar o modo PWA:", error);
            });
    });
}

let installPrompt;

window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    showInstallButton();
});

function showInstallButton() {
    if (document.getElementById("pwa-install-button")) {
        return;
    }

    const button = document.createElement("button");
    button.id = "pwa-install-button";
    button.type = "button";
    button.textContent = "Instalar Orvix";
    button.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:10000;padding:12px 16px;border:0;border-radius:10px;background:#22D3EE;color:#0F172A;font:600 14px sans-serif;cursor:pointer;box-shadow:0 4px 16px #0004";
    button.addEventListener("click", async () => {
        if (!installPrompt) {
            return;
        }

        installPrompt.prompt();
        await installPrompt.userChoice;
        installPrompt = null;
        button.remove();
    });
    document.body.append(button);
}

function showOfflineNotice() {
    if (document.getElementById("pwa-offline-notice")) {
        return;
    }

    const notice = document.createElement("div");
    notice.id = "pwa-offline-notice";
    notice.setAttribute("role", "status");
    notice.textContent = "Você está offline. Os dados financeiros precisam de conexão.";
    notice.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:10001;padding:12px 16px;background:#7f1d1d;color:#fff;text-align:center;font:500 14px sans-serif";
    document.body.append(notice);
}

function hideOfflineNotice() {
    document.getElementById("pwa-offline-notice")?.remove();
}

window.addEventListener("offline", showOfflineNotice);
window.addEventListener("online", hideOfflineNotice);

if (!navigator.onLine) {
    showOfflineNotice();
}

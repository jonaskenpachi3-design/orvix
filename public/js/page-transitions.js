document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.createElement('div');
    overlay.id = 'page-transition-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);

    const navLinks = document.querySelectorAll('.nav-item[href]');

    navLinks.forEach((link) => {
        link.addEventListener('click', (event) => {
            if (event.defaultPrevented) {
                return;
            }

            const href = link.getAttribute('href');
            if (!href || href.startsWith('#')) {
                return;
            }

            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                return;
            }

            const currentPath = window.location.pathname;
            if (currentPath === href) {
                return;
            }

            event.preventDefault();
            document.body.classList.add('transitioning');
            overlay.classList.add('visible');

            setTimeout(() => {
                window.location.href = href;
            }, 180);
        });
    });
});

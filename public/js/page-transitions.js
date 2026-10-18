document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.createElement('div');
    overlay.id = 'page-transition-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);

    const sidebar = document.querySelector('.sidebar');
    const navigation = sidebar?.querySelector('.navigation, .sidebar-nav');

    if (sidebar && navigation) {
        const toggle = document.createElement('button');
        const navigationId = navigation.id || 'app-navigation';
        navigation.id = navigationId;
        toggle.className = 'mobile-menu-toggle';
        toggle.type = 'button';
        toggle.setAttribute('aria-controls', navigationId);
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = 'Menu';
        sidebar.insertBefore(toggle, navigation);

        const closeMobileMenu = () => {
            sidebar.classList.remove('mobile-menu-open');
            toggle.setAttribute('aria-expanded', 'false');
        };

        toggle.addEventListener('click', () => {
            const isOpen = sidebar.classList.toggle('mobile-menu-open');
            toggle.setAttribute('aria-expanded', String(isOpen));
        });

        navigation.addEventListener('click', (event) => {
            if (event.target.closest('a[href]')) {
                closeMobileMenu();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeMobileMenu();
            }
        });

        window.matchMedia('(min-width: 701px)').addEventListener('change', closeMobileMenu);
    }

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

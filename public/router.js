export default class Router {
  constructor({ isAuthenticated, afterRender }) {
    this.routes = new Map();
    this.isAuthenticated = isAuthenticated;
    this.afterRender = afterRender;
    this.renderVersion = 0;
  }

  addRoute(path, view, { protected: requiresAuth = false } = {}) {
    this.routes.set(path, { view, requiresAuth });
    return this;
  }

  async render(pathname, { replace = false } = {}) {
    const path = pathname === "/" ? "/" : pathname.replace(/\/$/, "") || "/";
    const route = this.routes.get(path) || this.routes.get("/");

    if (route.requiresAuth && !this.isAuthenticated()) {
      return this.render("/auth", { replace: true });
    }

    if (window.location.pathname !== path) {
      history[replace ? "replaceState" : "pushState"]({}, "", path);
    }

    const version = ++this.renderVersion;
    const content = document.querySelector("#content");
    content.innerHTML = '<section class="page-message"><p>Loading…</p></section>';

    try {
      const response = await fetch(route.view);
      console.log("Fetched view:", route.view, "Response status:", response.status);
      if (!response.ok) throw new Error("Unable to load this page.");
      const markup = await response.text();
      if (version !== this.renderVersion) return;

      content.innerHTML = markup;
      content.focus();
      await this.afterRender({ path, content });
    } catch (_error) {
      if (version !== this.renderVersion) return;
      console.error("Error loading view:", _error);
      content.innerHTML = '<section class="page-message"><h1>Page unavailable</h1><p>Please try again.</p></section>';
    }
  }

  navigate(path, options) {
    if (path === window.location.pathname) {
      return;
    }
    return this.render(path, options);
  }

  init() {
    window.addEventListener("popstate", () => this.render(window.location.pathname, { replace: true }));
    document.addEventListener("click", (event) => {
      const link = event.target.closest("a[data-route]");
      if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      event.preventDefault();
      console.log("router runs");
      this.navigate(link.getAttribute("href"));
    });
    return this.render(window.location.pathname, { replace: true });
  }
}

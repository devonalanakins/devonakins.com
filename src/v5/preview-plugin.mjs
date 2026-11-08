import { renderV5Preview, previewPages, PREVIEW_ROOT } from "./shell.mjs";

/** Development-only: never register routes or emit preview assets in a build. */
export function v5PreviewPlugin({ enabled = process.env.V5_PREVIEW } = {}) {
  return {
    name: "living-mind-v5-local-preview",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url || "/", "http://localhost");
        if (!url.pathname.startsWith(PREVIEW_ROOT.slice(0, -1))) return next();
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
        const page = previewPages.find((entry) => entry.path === url.pathname);
        if (enabled !== "1" || !page) {
          response.statusCode = 404;
          return response.end("Not found");
        }
        if (!["GET", "HEAD"].includes(request.method || "")) {
          response.statusCode = 405;
          response.setHeader("Allow", "GET, HEAD");
          return response.end();
        }
        try {
          const html = await server.transformIndexHtml(
            url.pathname,
            renderV5Preview(page.key, {
              asOf: page.key === "field" ? url.searchParams.get("asOf") : null,
              now: Date.now(),
            }),
          );
          response.setHeader("Content-Type", "text/html; charset=utf-8");
          response.end(request.method === "HEAD" ? undefined : html);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

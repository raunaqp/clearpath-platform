import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // clearpath-platform is a fully-mocked demo — no server data layer, no rewrites,
  // no external hosts. Everything runs off local fixtures through
  // `lib/mock/api.ts` (see BUILD_SPEC §2, §11).

  /**
   * /hospitals and /vendors were the old "doors". When the home entry cards
   * became sub-pages, /for-hospitals ended up carrying the same headline as
   * /hospitals word for word, and /for-innovators the same headline AND
   * sub-line as /vendors — two pages each, one audience each.
   *
   * The sub-pages survive because they are the ones home links to and the ones
   * that explain the four steps. They absorbed everything the doors had that
   * the sub-pages did not: the value props and the entry actions. What was
   * dropped is the doors' silent setRole() on mount — reading about hospitals
   * is not the same as being one, so the role is now set by clicking an entry
   * action.
   *
   * Redirects rather than deletions: /vendors in particular has been the
   * innovator landing page for the whole build and is linked from outside it.
   */
  async redirects() {
    return [
      { source: "/hospitals", destination: "/for-hospitals", permanent: true },
      { source: "/vendors", destination: "/for-innovators", permanent: true },
    ];
  },
};

export default nextConfig;

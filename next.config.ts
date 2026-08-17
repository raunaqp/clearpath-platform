import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // clearpath-platform is a fully-mocked demo — no server data layer, no rewrites,
  // no external hosts. Everything runs off local fixtures through
  // `lib/mock/api.ts` (see BUILD_SPEC §2, §11).
};

export default nextConfig;

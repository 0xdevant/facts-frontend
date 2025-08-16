import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  webpack: (config, { isServer }) => {
    // Ignore pino-pretty in production builds
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "pino-pretty": false,
      };
    }

    // Ignore pino-pretty module
    config.externals = config.externals || [];
    if (typeof config.externals === "function") {
      const originalExternals = config.externals;
      config.externals = (context: any, request: any, callback: any) => {
        if (request === "pino-pretty") {
          return callback(null, "commonjs pino-pretty");
        }
        return originalExternals(context, request, callback);
      };
    } else if (Array.isArray(config.externals)) {
      config.externals.push("pino-pretty");
    }

    return config;
  },
};

export default nextConfig;

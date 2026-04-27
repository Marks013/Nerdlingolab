const defaultRemoteImageHosts = [
  "cdn.shopify.com",
  "cdn.shopifycdn.net",
  "nerdlingolab.com",
  "www.nerdlingolab.com"
];

function splitHostList(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeRemoteImageHost(value) {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.includes("://")) {
    try {
      return new URL(trimmed).hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  return trimmed.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
}

export function getConfiguredRemoteImageHosts(env = process.env) {
  const hosts = [
    ...defaultRemoteImageHosts,
    ...splitHostList(env.NEXT_IMAGE_REMOTE_HOSTS),
    ...splitHostList(env.NEXT_PUBLIC_IMAGE_REMOTE_HOSTS)
  ]
    .map(normalizeRemoteImageHost)
    .filter(Boolean);

  return Array.from(new Set(hosts)).sort();
}

export function getRemoteImagePatterns(env = process.env) {
  return getConfiguredRemoteImageHosts(env).map((hostname) => ({
    protocol: "https",
    hostname,
    pathname: "/**"
  }));
}

export function getMinioImagePattern(env = process.env) {
  return {
    protocol: env.MINIO_USE_SSL === "true" ? "https" : "http",
    hostname: env.MINIO_ENDPOINT ?? "localhost",
    port: env.MINIO_PORT ?? "9000",
    pathname: `/${env.MINIO_BUCKET ?? "product-images"}/**`
  };
}

export function getNextImageRemotePatterns(env = process.env) {
  return [
    ...getRemoteImagePatterns(env),
    getMinioImagePattern(env)
  ];
}

export function isRemoteImageHostAllowed(hostname, env = process.env) {
  const normalizedHostname = normalizeRemoteImageHost(hostname);

  if (!normalizedHostname) {
    return false;
  }

  return getConfiguredRemoteImageHosts(env).some((allowedHost) => {
    if (allowedHost === normalizedHostname) {
      return true;
    }

    if (allowedHost.startsWith("**.")) {
      const baseHost = allowedHost.slice(3);
      return normalizedHostname === baseHost || normalizedHostname.endsWith(`.${baseHost}`);
    }

    if (allowedHost.startsWith("*.")) {
      const baseHost = allowedHost.slice(2);
      return normalizedHostname.endsWith(`.${baseHost}`);
    }

    return false;
  });
}

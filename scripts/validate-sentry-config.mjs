import fs from "node:fs";
import process from "node:process";

const envPath = new URL("../.env", import.meta.url);

function loadEnv() {
  if (!fs.existsSync(envPath)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/))
      .filter(Boolean)
      .map((match) => {
        const value = match[2].trim().replace(/^"(.*)"$/, "$1");
        return [match[1], value];
      })
  );
}

function requireKey(env, key) {
  if (!env[key]) {
    throw new Error(`Missing ${key}`);
  }

  return env[key];
}

function getDsnProjectId(dsn) {
  const url = new URL(dsn);
  const projectId = url.pathname.replace(/^\/+/, "").split("/")[0];

  if (!projectId) {
    throw new Error("SENTRY_DSN does not include a project id.");
  }

  return projectId;
}

async function sentryFetch(baseUrl, token, pathname) {
  const response = await fetch(new URL(pathname, baseUrl), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Sentry API returned ${response.status}: ${body.slice(0, 240)}`);
  }

  return response.json();
}

async function main() {
  const env = { ...loadEnv(), ...process.env };
  const dsn = requireKey(env, "SENTRY_DSN");
  const publicDsn = requireKey(env, "NEXT_PUBLIC_SENTRY_DSN");
  const org = requireKey(env, "SENTRY_ORG");
  const token = env.SENTRY_PERSONAL_AUTH_TOKEN || env.SENTRY_AUTH_TOKEN;
  const baseUrl = env.SENTRY_REGION_URL || "https://sentry.io";
  const projectId = getDsnProjectId(dsn);

  if (dsn !== publicDsn) {
    throw new Error("SENTRY_DSN and NEXT_PUBLIC_SENTRY_DSN are different.");
  }

  if (!token) {
    throw new Error("Missing SENTRY_PERSONAL_AUTH_TOKEN or SENTRY_AUTH_TOKEN.");
  }

  const projects = await sentryFetch(baseUrl, token, `/api/0/organizations/${org}/projects/`);
  const project = projects.find((item) => String(item.id) === projectId || item.slug === env.SENTRY_PROJECT);

  if (!project) {
    throw new Error(`No Sentry project was found for DSN project id ${projectId}.`);
  }

  const configuredProject = env.SENTRY_PROJECT || "(empty)";
  console.log(
    [
      "Sentry API validation passed.",
      `Organization: ${org}`,
      `Project slug: ${project.slug}`,
      `Configured SENTRY_PROJECT: ${configuredProject}`,
      `DSN project id: ${projectId}`,
      `Region base URL: ${baseUrl}`
    ].join("\n")
  );
}

main().catch((error) => {
  console.error(`Sentry validation failed: ${error.message}`);
  process.exit(1);
});

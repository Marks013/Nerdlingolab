const baseUrl = process.env.AUDIT_BASE_URL?.trim() || "http://127.0.0.1:3001";
const bypassToken =
  process.env.AUDIT_MAINTENANCE_BYPASS_TOKEN?.trim() ||
  process.env.MAINTENANCE_BYPASS_TOKEN?.trim();
const expectMaintenance = process.env.EXPECT_MAINTENANCE?.trim() === "true";

async function request(path, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers,
    redirect: "manual"
  });
  const text = await response.text();
  return {
    maintenanceHeader: response.headers.get("x-nerdlingolab-maintenance"),
    status: response.status,
    text
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const maintenancePage = await request("/manutencao");
assert(maintenancePage.status === 200, `/manutencao deveria responder 200, recebeu ${maintenancePage.status}`);
assert(
  maintenancePage.text.includes("Laboratorio em ajustes") &&
    maintenancePage.text.includes("NerdLingoLab"),
  "/manutencao nao contem marcadores visuais esperados"
);

const health = await request("/api/health/ready");
assert(health.status === 200, `/api/health/ready deveria continuar livre, recebeu ${health.status}`);

if (expectMaintenance) {
  const home = await request("/");
  assert(home.status === 503, `/ deveria responder 503 em manutencao, recebeu ${home.status}`);
  assert(home.maintenanceHeader === "1", "Header x-nerdlingolab-maintenance ausente");

  if (bypassToken) {
    const bypassed = await request("/", {
      "X-NerdLingoLab-Maintenance-Bypass": bypassToken
    });
    assert(
      bypassed.status >= 200 && bypassed.status < 400,
      `Bypass deveria liberar a home, recebeu ${bypassed.status}`
    );
  }
}

console.log(
  JSON.stringify(
    {
      baseUrl,
      bypassChecked: Boolean(expectMaintenance && bypassToken),
      expectMaintenance,
      ok: true
    },
    null,
    2
  )
);

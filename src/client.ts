import type { Endpoint } from "./types.js";

export type PaymentFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function callSubnet(
  fetchWithPayment: PaymentFetch,
  nodeUrl: string,
  subnetId: string,
  endpoint: Endpoint,
  params: Record<string, unknown>
): Promise<unknown> {
  const basePath = "/miner-dispatcher/v1";
  const url = `${nodeUrl}${basePath}/${subnetId}${endpoint.path}`;
  const upperMethod = endpoint.method.toUpperCase();

  const paramMap = endpoint.param_map || {};
  const mappedParams: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    const mapped = paramMap[k] || k;
    mappedParams[mapped] = v;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    if (upperMethod === "GET") {
      const filtered = Object.fromEntries(
        Object.entries(mappedParams).filter(([, v]) => v !== undefined && v !== null)
      );
      const qs = new URLSearchParams(
        Object.entries(filtered).map(([k, v]) => [k, String(v)])
      ).toString();
      const fullUrl = qs ? `${url}?${qs}` : url;

      const res = await fetchWithPayment(fullUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Subnet call failed: ${res.status} ${body}`);
      }
      return res.json();
    }

    const contentType = endpoint.content_type || "application/json";
    let body: BodyInit;

    if (endpoint.multipart_fields && endpoint.multipart_fields.length > 0) {
      const form = new FormData();
      for (const [k, v] of Object.entries(mappedParams)) {
        if (v !== undefined && v !== null) {
          form.append(k, String(v));
        }
      }
      body = form;
    } else {
      body = JSON.stringify(mappedParams);
    }

    const res = await fetchWithPayment(url, {
      method: upperMethod,
      headers: {
        "Content-Type": contentType,
        Accept: "application/json",
      },
      body,
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Subnet call failed: ${res.status} ${body}`);
    }
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function callEngine(
  fetchWithPayment: PaymentFetch,
  engineUrl: string,
  path: string,
  method: string,
  body?: unknown
): Promise<unknown> {
  const url = `${engineUrl}${path}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const init: RequestInit = {
      method: method.toUpperCase(),
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      signal: controller.signal,
    };

    if (method.toUpperCase() !== "GET" && body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const res = await fetchWithPayment(url, init);

    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      let detail = bodyText;
      try {
        const parsed = JSON.parse(bodyText);
        detail = parsed.error || parsed.message || bodyText;
      } catch {}
      throw new Error(`Engine call failed: ${res.status} ${detail}`);
    }
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function callDaemon(
  daemonUrl: string,
  path: string,
  queryParams?: Record<string, string>
): Promise<unknown> {
  let url = `${daemonUrl}${path}`;
  if (queryParams) {
    const qs = new URLSearchParams(queryParams).toString();
    if (qs) url += `?${qs}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Daemon call failed: ${res.status} ${await res.text().catch(() => "")}`);
    }
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

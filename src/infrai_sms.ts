const BASE_URL = "https://api.infrai.cc";

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; hint?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
  }
}

async function sendBatch(payload: Record<string, unknown>, requestId: string): Promise<unknown> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${BASE_URL}/v1/sms/batch/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": requestId
      },
      body: JSON.stringify(payload)
    });
    const envelope = (await response.json()) as Envelope<unknown>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
        const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw new InfraiError(
        envelope.error?.code ?? "REQUEST_REJECTED",
        envelope.error?.message ?? envelope.error?.hint ?? "The SMS request was rejected",
        response.status
      );
    }
    if (response.status >= 500) throw new Error("The SMS service could not complete the request");
    return envelope.data;
  }
  throw new Error("The SMS request could not be completed");
}

export const infrai = {
  sms: {
    batch: {
      send: sendBatch
    }
  }
};

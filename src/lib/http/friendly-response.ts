export interface FriendlyResponse<TPayload> {
  ok: boolean;
  message: string | null;
  payload: TPayload | null;
}

interface MessagePayload {
  message?: unknown;
}

export async function parseFriendlyResponse<TPayload>(
  response: Response,
  fallbackMessage: string
): Promise<FriendlyResponse<TPayload>> {
  try {
    const payload = (await response.json()) as TPayload & MessagePayload;
    const message = typeof payload.message === "string" ? payload.message : null;

    return {
      ok: response.ok,
      message: response.ok ? null : message ?? fallbackMessage,
      payload
    };
  } catch {
    return {
      ok: false,
      message: fallbackMessage,
      payload: null
    };
  }
}

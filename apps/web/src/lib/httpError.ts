export class HttpError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.data = data;
  }
}

export function toUserMessage(err: unknown): string {
  if (err instanceof HttpError) {
    // Verwacht backend shape: { message: string } of Nest default
    const anyData = err.data as any;
    const msg =
      anyData?.message && typeof anyData.message === "string"
        ? anyData.message
        : Array.isArray(anyData?.message)
          ? anyData.message.join(", ")
          : err.message;

    // status-specifieke hints
    if (err.status === 409) return msg || "Conflict (409)";
    if (err.status === 400) return msg || "Ongeldige invoer (400)";
    if (err.status === 401) return "Je sessie is verlopen. Log opnieuw in.";
    if (err.status === 403) return "Geen rechten voor deze actie.";
    return msg || `Fout (${err.status})`;
  }

  if (err instanceof Error) return err.message;
  return "Onbekende fout";
}
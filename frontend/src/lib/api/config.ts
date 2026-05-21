const configuredApiBaseUrl = import.meta.env.VITE_API_URL?.trim();
export const API_BASE_URL =
  configuredApiBaseUrl && configuredApiBaseUrl !== "/"
    ? configuredApiBaseUrl.replace(/\/$/, "")
    : "";

const configuredAiBaseUrl = import.meta.env.VITE_AI_SERVICE_URL?.trim();
export const AI_BASE_URL =
  configuredAiBaseUrl && configuredAiBaseUrl !== "/"
    ? configuredAiBaseUrl.replace(/\/$/, "")
    : API_BASE_URL;

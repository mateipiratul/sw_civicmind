/**
 * Custom Error class to carry HTTP status and structured messages
 */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export class BaseApiClient {
  protected baseUrl: string;
  protected aiBaseUrl: string;

  constructor(baseUrl: string, aiBaseUrl: string) {
    this.baseUrl = baseUrl;
    this.aiBaseUrl = aiBaseUrl;
  }

  protected getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem("auth_token");
    if (!token) return {};
    return { Authorization: `Token ${token}` };
  };

  protected getCsrfToken = (): string | null => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^|; )' + 'csrftoken' + '=([^;]*)'));
    return match ? decodeURIComponent(match[2]) : null;
  };

  /**
   * Generic request handler with CSRF and Auth injection
   */
  protected requestTo = async <T>(baseUrl: string, endpoint: string, options: RequestInit = {}): Promise<T> => {
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
    const csrfToken = this.getCsrfToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
      ...this.getAuthHeader(),
      ...(options.headers as Record<string, string> | undefined),
    };

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get("content-type") || "";
    let data: any;
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        if (!response.ok) {
          throw new ApiError(`Server error (${response.status}).`, response.status);
        }
        return {} as T;
      }
    }

    if (!response.ok) {
      // Handle Django REST Framework validation errors (field-specific)
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const errorObj = data as Record<string, any>;
        if (!errorObj.detail && !errorObj.error) {
          const errors: string[] = [];
          for (const [field, messages] of Object.entries(errorObj)) {
            const fieldPrefix = field === "non_field_errors" || field === "detail" ? "" : `${field}: `;
            if (Array.isArray(messages)) {
              errors.push(...messages.map(m => `${fieldPrefix}${m}`));
            } else if (typeof messages === 'string') {
              errors.push(`${fieldPrefix}${messages}`);
            }
          }
          if (errors.length > 0) {
            throw new ApiError(errors.join(", "), response.status);
          }
        }
      }
      
      const errorObj = data as Record<string, any> | null;
      const detailMsg = errorObj?.detail || errorObj?.error || `API Error: ${response.status}`;
      throw new ApiError(String(detailMsg), response.status);
    }

    return data as T;
  };

  protected request = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    return this.requestTo<T>(this.baseUrl, endpoint, options);
  };
}

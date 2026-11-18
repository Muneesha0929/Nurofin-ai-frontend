// Details of an issue that was raised from Build-Track ("Report a problem").
const BASE = '/api/v1/issues';

const authHeaders = (): Record<string, string> => {
  let token = '';
  if (typeof window !== 'undefined') token = localStorage.getItem('auth_token') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface IssueExternalDetail {
  source: string;
  external_id: string;
  reporter: { id?: string; name?: string; email?: string; phone?: string; role?: string; company?: string };
  screen: { route?: string; name?: string };
  breadcrumbs: { at?: string; kind?: string; label?: string; detail?: string | null }[];
  device: { platform?: string; osVersion?: string; model?: string; appVersion?: string; buildNumber?: string; locale?: string; userAgent?: string; viewport?: string };
  project: { id?: string; name?: string } | null;
  occurred_at: string | null;
  received_at: string | null;
  has_screenshot: boolean;
}

export const issueExternalService = {
  get: async (issueId: number): Promise<IssueExternalDetail> => {
    const res = await fetch(`${BASE}/${issueId}/external`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Could not load the Build-Track report');
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Could not load the Build-Track report');
    return json.data as IssueExternalDetail;
  },

  // The screenshot is private: fetch it with the sign-in token and show it from a local blob URL.
  // The caller must URL.revokeObjectURL() the result when done.
  screenshotUrl: async (issueId: number): Promise<string> => {
    const res = await fetch(`${BASE}/${issueId}/external/screenshot`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Could not load the screenshot');
    return URL.createObjectURL(await res.blob());
  },
};

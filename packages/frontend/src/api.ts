import type {
  WorkflowView,
  CreateWorkflowRequest,
  ConfirmIdeaRequest,
  IdeaConfirmationOutput,
} from "@valid8/shared";

const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function listWorkflows(): Promise<WorkflowView[]> {
  return request("/workflows");
}

export function getWorkflow(id: string): Promise<WorkflowView> {
  return request(`/workflows/${id}`);
}

export function createWorkflow(
  ideaText: string
): Promise<{ id: string; confirmation: IdeaConfirmationOutput }> {
  return request("/workflows", {
    method: "POST",
    body: JSON.stringify({ ideaText } satisfies CreateWorkflowRequest),
  });
}

export function confirmIdea(
  workflowId: string,
  confirmed: boolean,
  revisedIdea?: string
): Promise<{ status: string; confirmation?: IdeaConfirmationOutput }> {
  return request(`/workflows/${workflowId}/confirm`, {
    method: "POST",
    body: JSON.stringify({ confirmed, revisedIdea } satisfies ConfirmIdeaRequest),
  });
}

export function deleteWorkflow(id: string): Promise<{ ok: boolean }> {
  return request(`/workflows/${id}`, { method: "DELETE" });
}

export function addContacts(
  workflowId: string,
  contacts: Array<{ name: string; email: string; company: string; role: string }>
): Promise<{ contacts: Array<{ id: string; name: string; email: string; company: string; role: string }> }> {
  return request(`/workflows/${workflowId}/contacts`, {
    method: "POST",
    body: JSON.stringify({ contacts }),
  });
}

export function getContacts(
  workflowId: string
): Promise<Array<{ id: string; name: string; email: string; company: string; role: string }>> {
  return request(`/workflows/${workflowId}/contacts`);
}

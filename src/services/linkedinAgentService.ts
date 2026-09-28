import type {
  LinkedInAction,
  ActionStatus,
  ActionType,
  AgentContentContext,
} from '../types/linkedin';

class LinkedInAgentService {
  private baseUri = '/api/agent';

  /**
   * Fetches MYCES content context (unposted concepts, projects, learning tracks)
   */
  async fetchContentContext(): Promise<AgentContentContext> {
    const res = await fetch(`${this.baseUri}/context?purpose=content`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Failed to fetch context (${res.status})`);
    }

    const json = await res.json();
    return json.context as AgentContentContext;
  }

  /**
   * Fetches actions from the approval queue (defaults to all or filtered by status)
   */
  async fetchActions(status?: ActionStatus): Promise<LinkedInAction[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await fetch(`${this.baseUri}/actions${query}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Failed to fetch actions (${res.status})`);
    }

    const json = await res.json();
    return json.actions as LinkedInAction[];
  }

  /**
   * Proposes a new action (e.g. AI-generated post draft)
   */
  async createProposedAction(data: {
    content: string;
    topic?: string;
    reasoning?: string;
    concept_id?: string;
    action_type?: ActionType;
    tags?: string[];
  }): Promise<LinkedInAction> {
    const res = await fetch(`${this.baseUri}/actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action_type: data.action_type || 'PUBLISH_POST',
        content: data.content,
        topic: data.topic,
        reasoning: data.reasoning,
        concept_id: data.concept_id,
        payload: {
          topic: data.topic,
          content: data.content,
          concept_id: data.concept_id,
          tags: data.tags || [],
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Failed to create action (${res.status})`);
    }

    const json = await res.json();
    return json.action as LinkedInAction;
  }

  /**
   * Edits the content of a proposed action (remains in PENDING_APPROVAL)
   */
  async updateActionContent(id: string, content: string): Promise<LinkedInAction> {
    const res = await fetch(`${this.baseUri}/actions`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id,
        content,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Failed to update action (${res.status})`);
    }

    const json = await res.json();
    return json.action as LinkedInAction;
  }

  /**
   * Approves a proposed action (Strictly human action)
   */
  async approveAction(id: string): Promise<LinkedInAction> {
    const res = await fetch(`${this.baseUri}/actions`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id,
        status: 'APPROVED',
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Failed to approve action (${res.status})`);
    }

    const json = await res.json();
    return json.action as LinkedInAction;
  }

  /**
   * Rejects a proposed action
   */
  async rejectAction(id: string): Promise<LinkedInAction> {
    const res = await fetch(`${this.baseUri}/actions`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id,
        status: 'REJECTED',
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Failed to reject action (${res.status})`);
    }

    const json = await res.json();
    return json.action as LinkedInAction;
  }
}

export const linkedinAgentService = new LinkedInAgentService();

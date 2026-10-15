import type {
  LinkedInAction,
  LinkedInActionPayload,
  ActionStatus,
  ActionType,
  AgentContentContext,
  AgentNetworkingContext,
  LinkedInPerson,
  LinkedInOpportunity,
  LinkedInAnalyticsSnapshot,
  LinkedInAgentMemory,
  AnalyticsDashboardSummary,
  AgentMemoryType,
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
   * Proposes a new action (e.g. AI-generated post draft, connection request, comment)
   */
  async createProposedAction(data: {
    content?: string;
    topic?: string;
    reasoning?: string;
    concept_id?: string | null;
    action_type?: ActionType;
    tags?: string[];
    target_id?: string | null;
    payload?: LinkedInActionPayload;
  }): Promise<LinkedInAction> {
    const actionPayload = data.payload || {
      topic: data.topic,
      content: data.content || '',
      concept_id: data.concept_id,
      tags: data.tags || [],
    };
    if (data.content && !actionPayload.content) {
      actionPayload.content = data.content;
    }

    const res = await fetch(`${this.baseUri}/actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action_type: data.action_type || 'PUBLISH_POST',
        content: actionPayload.content,
        topic: actionPayload.topic || data.topic,
        reasoning: data.reasoning,
        concept_id: actionPayload.concept_id || data.concept_id,
        target_id: data.target_id,
        payload: actionPayload,
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
   * Rejects a proposed action (Strictly human action)
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

  /**
   * Transitions an approved action to READY_FOR_MANUAL
   */
  async prepareManualExecution(id: string): Promise<LinkedInAction> {
    const res = await fetch(`${this.baseUri}/actions`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id,
        status: 'READY_FOR_MANUAL',
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Failed to set ready for manual (${res.status})`);
    }

    const json = await res.json();
    return json.action as LinkedInAction;
  }

  /**
   * Confirms manual execution on LinkedIn, records published post, and syncs concept link
   */
  async confirmPublished(data: {
    action_id: string;
    linkedin_url?: string;
    concept_id?: string | null;
  }): Promise<{ ok: boolean; action_id: string; status: string; linkedin_url?: string; concept_updated?: boolean }> {
    const res = await fetch(`${this.baseUri}/publish-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Failed to confirm execution (${res.status})`);
    }

    return await res.json();
  }

  /**
   * Fetches networking context from MYCES
   */
  async fetchNetworkingContext(): Promise<AgentNetworkingContext> {
    const res = await fetch(`${this.baseUri}/context?purpose=networking`);
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Failed to fetch networking context (${res.status})`);
    }
    const json = await res.json();
    return json.context as AgentNetworkingContext;
  }

  /**
   * Fetches tracked people
   */
  async fetchPeople(filters?: { q?: string; status?: string }): Promise<LinkedInPerson[]> {
    const params = new URLSearchParams();
    if (filters?.q) params.set('q', filters.q);
    if (filters?.status && filters.status !== 'ALL') params.set('status', filters.status);

    const res = await fetch(`${this.baseUri}/people?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Failed to fetch people (${res.status})`);
    }
    const json = await res.json();
    return json.people as LinkedInPerson[];
  }

  /**
   * Creates a tracked person
   */
  async createPerson(person: Partial<LinkedInPerson>): Promise<LinkedInPerson> {
    const res = await fetch(`${this.baseUri}/people`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(person),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Failed to create contact (${res.status})`);
    }
    const json = await res.json();
    return json.person as LinkedInPerson;
  }

  /**
   * Updates a tracked person
   */
  async updatePerson(id: string, updates: Partial<LinkedInPerson>): Promise<LinkedInPerson> {
    const res = await fetch(`${this.baseUri}/people`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Failed to update contact (${res.status})`);
    }
    const json = await res.json();
    return json.person as LinkedInPerson;
  }

  /**
   * Deletes a tracked person
   */
  async deletePerson(id: string): Promise<void> {
    const res = await fetch(`${this.baseUri}/people?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Failed to delete contact (${res.status})`);
    }
  }

  /**
   * Fetches opportunities
   */
  async fetchOpportunities(filters?: { type?: string; status?: string }): Promise<LinkedInOpportunity[]> {
    const params = new URLSearchParams();
    if (filters?.type && filters.type !== 'ALL') params.set('type', filters.type);
    if (filters?.status && filters.status !== 'ALL') params.set('status', filters.status);

    const res = await fetch(`${this.baseUri}/opportunities?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Failed to fetch opportunities (${res.status})`);
    }
    const json = await res.json();
    return json.opportunities as LinkedInOpportunity[];
  }

  /**
   * Creates an opportunity
   */
  async createOpportunity(opp: Partial<LinkedInOpportunity>): Promise<LinkedInOpportunity> {
    const res = await fetch(`${this.baseUri}/opportunities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opp),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Failed to create opportunity (${res.status})`);
    }
    const json = await res.json();
    return json.opportunity as LinkedInOpportunity;
  }

  /**
   * Updates an opportunity
   */
  async updateOpportunity(id: string, updates: Partial<LinkedInOpportunity>): Promise<LinkedInOpportunity> {
    const res = await fetch(`${this.baseUri}/opportunities`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Failed to update opportunity (${res.status})`);
    }
    const json = await res.json();
    return json.opportunity as LinkedInOpportunity;
  }

  /**
   * Deletes an opportunity
   */
  async deleteOpportunity(id: string): Promise<void> {
    const res = await fetch(`${this.baseUri}/opportunities?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Failed to delete opportunity (${res.status})`);
    }
  }

  /**
   * Fetches analytics dashboard summary and durable snapshots
   */
  async fetchAnalyticsSummary(days: number = 90): Promise<AnalyticsDashboardSummary> {
    const res = await fetch(`${this.baseUri}/analytics?days=${days}`);
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Failed to fetch analytics (${res.status})`);
    }
    const json = await res.json();
    return json.summary as AnalyticsDashboardSummary;
  }

  /**
   * Records or updates a daily metric snapshot
   */
  async recordAnalyticsSnapshot(snapshot: Partial<LinkedInAnalyticsSnapshot>): Promise<LinkedInAnalyticsSnapshot> {
    const res = await fetch(`${this.baseUri}/analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Failed to record analytics snapshot (${res.status})`);
    }
    const json = await res.json();
    return json.snapshot as LinkedInAnalyticsSnapshot;
  }

  /**
   * Fetches strategic agent memories
   */
  async fetchMemories(type?: string): Promise<LinkedInAgentMemory[]> {
    const params = new URLSearchParams();
    if (type && type !== 'ALL') params.set('type', type);
    const res = await fetch(`${this.baseUri}/memory?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Failed to fetch agent memories (${res.status})`);
    }
    const json = await res.json();
    return json.memories as LinkedInAgentMemory[];
  }

  /**
   * Saves or updates a strategic agent memory
   */
  async saveMemory(memory: {
    memory_type: AgentMemoryType;
    key: string;
    value: Record<string, unknown> | string;
    confidence?: number;
  }): Promise<LinkedInAgentMemory> {
    const res = await fetch(`${this.baseUri}/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memory),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Failed to save strategic memory (${res.status})`);
    }
    const json = await res.json();
    return json.memory as LinkedInAgentMemory;
  }

  /**
   * Deletes a strategic agent memory
   */
  async deleteMemory(id: string): Promise<void> {
    const res = await fetch(`${this.baseUri}/memory?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Failed to delete strategic memory (${res.status})`);
    }
  }

  /**
   * Runs the 30-day operational retention cleanup
   */
  async runRetentionCleanup(): Promise<{
    ok: boolean;
    message: string;
    cleaned_counts: { actions: number; engagements: number };
  }> {
    const res = await fetch(`${this.baseUri}/maintenance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Failed to run retention cleanup (${res.status})`);
    }
    return await res.json();
  }
}

export const linkedinAgentService = new LinkedInAgentService();

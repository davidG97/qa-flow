// Servicio API para comunicarse con el backend

const API_URL = 'http://localhost:3001/api';
const WS_URL = 'ws://localhost:3001';

export interface ExecutionResult {
  success: boolean;
  nodeId: string;
  nodeType: string;
  message: string;
  duration: number;
  screenshot?: string;
  error?: string;
}

export interface ExecutionStatus {
  flowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentNode?: string;
  results: ExecutionResult[];
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface FlowNode {
  id: string;
  type: string;
  data: {
    label: string;
    nodeType: string;
    category: string;
    config: Record<string, unknown>;
  };
  position: { x: number; y: number };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface ProjectConfig {
  executionMode: 'default' | 'parallel' | 'serial';
  workers: number;
  maxFailures: number;
  retries: number;
  timeout: number;
}

export interface TestFlow {
  id: string;
  name: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  config?: ProjectConfig;
}

export interface RunResponse {
  executionId: string;
  message: string;
  wsUrl: string;
}

class ApiService {
  private ws: WebSocket | null = null;
  private readonly statusCallbacks: Map<string, (status: ExecutionStatus) => void> = new Map();
  private readonly screencastCallbacks: Map<string, (frameBase64: string) => void> = new Map();

  /**
   * Obtiene el token JWT del localStorage.
   */
  private getToken(): string | null {
    return localStorage.getItem('qa-flow-token');
  }

  /**
   * Headers base para peticiones autenticadas.
   */
  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) {
      h['Authorization'] = `Bearer ${token}`;
    }
    return h;
  }

  /**
   * Wrapper sobre fetch que inyecta headers de auth y maneja 401.
   */
  private async request(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const isFormData = options.body instanceof FormData;
    const headers: Record<string, string> = isFormData ? {} : this.headers();

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers as Record<string, string>),
      },
    });

    if (response.status === 401) {
      localStorage.removeItem('qa-flow-token');
      globalThis.location.href = '/login';
      throw new Error('Session expired');
    }

    return response;
  }

  // ==========================================
  // AUTENTICACIÓN
  // ==========================================

  async login(email: string, password: string): Promise<{ user: { id: string; email: string; name: string | null; role: string }; token: string }> {
    const response = await this.request(`${API_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login error');
    }
    return response.json();
  }

  async register(email: string, password: string, name?: string): Promise<{ user: { id: string; email: string; name: string | null; role: string }; token: string }> {
    const response = await this.request(`${API_URL}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration error');
    }
    return response.json();
  }

  async getCurrentUser(): Promise<{ id: string; email: string; name: string | null; role: string } | null> {
    const token = this.getToken();
    if (!token) return null;
    try {
      const response = await this.request(`${API_URL}/auth/me`);
      if (!response.ok) return null;
      return response.json();
    } catch {
      return null;
    }
  }

  // ==========================================
  // ADMIN - USERS
  // ==========================================

  async getUsers(): Promise<Array<{ id: string; email: string; name: string | null; role: string; createdAt: string }>> {
    const response = await this.request(`${API_URL}/users`);
    if (!response.ok) {
      throw new Error('Error fetching users');
    }
    return response.json();
  }

  async createUser(data: { email: string; password: string; name?: string; role?: string }): Promise<{ id: string; email: string; name: string | null; role: string; createdAt: string }> {
    const response = await this.request(`${API_URL}/users`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error creating user');
    }
    return response.json();
  }

  async updateUser(id: string, data: Partial<{ email: string; name: string; password: string; role: string }>): Promise<{ id: string; email: string; name: string | null; role: string; createdAt: string }> {
    const response = await this.request(`${API_URL}/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error updating user');
    }
    return response.json();
  }

  async deleteUser(id: string): Promise<void> {
    const response = await this.request(`${API_URL}/users/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Error deleting user');
    }
  }

  // ==========================================
  // HEALTH & WEBSOCKET
  // ==========================================

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log('✅ WebSocket conectado');
        resolve();
      };

      this.ws.onerror = (error) => {
        console.error('❌ Error WebSocket:', error);
        reject(error);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'status' && data.executionId) {
            const callback = this.statusCallbacks.get(data.executionId);
            if (callback) {
              callback(data.status);
            }
          }

          if (data.type === 'screencast-frame' && data.executionId) {
            const callback = this.screencastCallbacks.get(data.executionId);
            if (callback) {
              callback(data.frame);
            }
          }

          if (data.type === 'picker:result' && data.sessionId) {
            const callback = this.pickerCallbacks.get(data.sessionId);
            if (callback) {
              callback(data.cancelled ? null : data.result);
              this.pickerCallbacks.delete(data.sessionId);
              this.pickerProgressCallbacks.delete(data.sessionId);
              this.pickerFrameCallbacks.delete(data.sessionId);
            }
          }

          if (data.type === 'picker:progress' && data.message) {
            this.pickerProgressCallbacks.forEach(callback => callback(data.message));
          }

          if (data.type === 'picker:frame' && data.sessionId && data.frame) {
            const callback = this.pickerFrameCallbacks.get(data.sessionId);
            if (callback) {
              callback(data.frame);
            } else {
              // Buffer frame until subscriber connects
              this.pickerFrameBuffer.set(data.sessionId, data.frame);
            }
          }
        } catch (error) {
          console.error('Error procesando mensaje WS:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket desconectado');
        this.ws = null;
      };
    });
  }

  subscribeToExecution(executionId: string, callback: (status: ExecutionStatus) => void): void {
    this.statusCallbacks.set(executionId, callback);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        executionId,
      }));
    }
  }

  unsubscribeFromExecution(executionId: string): void {
    this.statusCallbacks.delete(executionId);
  }

  subscribeToScreencast(executionId: string, callback: (frameBase64: string) => void): void {
    this.screencastCallbacks.set(executionId, callback);
  }

  unsubscribeFromScreencast(executionId: string): void {
    this.screencastCallbacks.delete(executionId);
  }

  // ==========================================
  // EJECUCIÓN & CÓDIGO
  // ==========================================

  async runFlow(
    flow: TestFlow,
    options?: { slowMo?: number }  // ponytail: headless removed - always true
  ): Promise<RunResponse> {
    const response = await this.request(`${API_URL}/run`, {
      method: 'POST',
      body: JSON.stringify({ flow, options }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error executing flow');
    }

    return response.json();
  }

  async generateCode(flow: TestFlow): Promise<string> {
    const response = await this.request(`${API_URL}/generate-code`, {
      method: 'POST',
      body: JSON.stringify({ flow }),
    });

    if (!response.ok) {
      throw new Error('Error generating code');
    }

    const data = await response.json();
    return data.code;
  }

  // ========================
  // Recording
  // ========================

  async startRecording(url?: string): Promise<{ sessionId: string; message: string }> {
    const response = await this.request(`${API_URL}/record/start`, {
      method: 'POST',
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error starting recording');
    }

    return response.json();
  }

  async getRecordingStatus(sessionId: string): Promise<{
    id: string;
    status: 'recording' | 'completed' | 'error';
    startedAt: string;
    completedAt?: string;
    hasCode: boolean;
    error?: string;
  }> {
    const response = await this.request(`${API_URL}/record/status/${sessionId}`);

    if (!response.ok) {
      throw new Error('Session not found');
    }

    return response.json();
  }

  async stopRecording(sessionId: string): Promise<void> {
    const response = await this.request(`${API_URL}/record/stop/${sessionId}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Error stopping recording');
    }
  }

  async getRecordingNodes(sessionId: string): Promise<{
    nodes: FlowNode[];
    edges: FlowEdge[];
    code: string;
  }> {
    const response = await this.request(`${API_URL}/record/nodes/${sessionId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error getting recorded nodes');
    }

    return response.json();
  }

  async parsePlaywrightCode(code: string): Promise<{
    nodes: FlowNode[];
    edges: FlowEdge[];
  }> {
    const response = await this.request(`${API_URL}/parse-code`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error('Error parsing code');
    }

    return response.json();
  }

  // ========================
  // Report Methods
  // ========================

  async getReports(): Promise<{
    reports: Array<{
      id: string;
      executionId: string;
      flowName: string;
      status: 'passed' | 'failed' | 'flaky';
      summary: { total: number; passed: number; failed: number; skipped: number };
      duration: number;
      generatedAt: string;
    }>;
  }> {
    const response = await this.request(`${API_URL}/reports`);
    if (!response.ok) {
      throw new Error('Error obteniendo reportes');
    }
    return response.json();
  }

  async getReport(id: string): Promise<TestReport> {
    const response = await this.request(`${API_URL}/reports/${id}`);
    if (!response.ok) {
      throw new Error('Report not found');
    }
    return response.json();
  }

  openReportHtml(id: string): void {
    window.open(`${API_URL}/reports/${id}/html`, '_blank');
  }

  downloadReport(id: string): void {
    const link = document.createElement('a');
    link.href = `${API_URL}/reports/${id}/download`;
    link.download = `qa-flow-report-${id.substring(0, 8)}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async deleteReport(id: string): Promise<void> {
    const response = await this.request(`${API_URL}/reports/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Error eliminando reporte');
    }
  }

  // ==========================================
  // PROYECTOS
  // ==========================================

  async getProjects(): Promise<ProjectDTO[]> {
    const response = await this.request(`${API_URL}/projects`);
    if (!response.ok) {
      throw new Error('Error getting projects');
    }
    return response.json();
  }

  async getProject(id: string): Promise<ProjectDTO> {
    const response = await this.request(`${API_URL}/projects/${id}`);
    if (!response.ok) {
      throw new Error('Error getting project');
    }
    return response.json();
  }

  async createProject(project: CreateProjectInput): Promise<ProjectDTO> {
    const response = await this.request(`${API_URL}/projects`, {
      method: 'POST',
      body: JSON.stringify(project),
    });
    if (!response.ok) {
      throw new Error('Error creating project');
    }
    return response.json();
  }

  async updateProject(id: string, project: UpdateProjectInput): Promise<ProjectDTO> {
    const response = await this.request(`${API_URL}/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(project),
    });
    if (!response.ok) {
      throw new Error('Error updating project');
    }
    return response.json();
  }

  async deleteProject(id: string): Promise<void> {
    const response = await this.request(`${API_URL}/projects/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Error deleting project');
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.statusCallbacks.clear();
    this.pickerCallbacks.clear();
  }

  // ========================
  // Picker
  // ========================

  private readonly pickerCallbacks: Map<string, (result: PickerResult | null) => void> = new Map();
  private readonly pickerProgressCallbacks: Map<string, (message: string) => void> = new Map();

  async startPickerWithFlow(
    targetNodeId: string,
    nodes: Array<{ id: string; data: { nodeType: string; label: string; config: Record<string, unknown> } }>,
    edges: Array<{ id: string; source: string; target: string }>,
    cdpUrl?: string
  ): Promise<{ sessionId: string }> {
    const response = await this.request(`${API_URL}/picker/start`, {
      method: 'POST',
      body: JSON.stringify({ targetNodeId, nodes, edges, cdpUrl }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error starting visual picker');
    }

    return response.json();
  }

  async cancelPicker(sessionId: string): Promise<void> {
    await this.request(`${API_URL}/picker/cancel/${sessionId}`, {
      method: 'POST',
    });
  }

  subscribeToPickerResult(sessionId: string, callback: (result: PickerResult | null) => void): void {
    this.pickerCallbacks.set(sessionId, callback);
  }

  subscribeToPickerProgress(sessionId: string, callback: (message: string) => void): void {
    this.pickerProgressCallbacks.set(sessionId, callback);
  }

  unsubscribeFromPicker(sessionId: string): void {
    this.pickerCallbacks.delete(sessionId);
    this.pickerProgressCallbacks.delete(sessionId);
    this.pickerFrameCallbacks.delete(sessionId);
    this.pickerFrameBuffer.delete(sessionId);
  }

  // === Interactive Picker (works in Docker) ===
  
  private pickerFrameCallbacks: Map<string, (frameBase64: string) => void> = new Map();
  private pickerFrameBuffer: Map<string, string> = new Map();  // Buffer frames until subscriber connects

  async startInteractivePicker(
    targetNodeId: string,
    nodes: Array<{ id: string; data: { nodeType: string; label: string; config: Record<string, unknown> } }>,
    edges: Array<{ id: string; source: string; target: string }>
  ): Promise<{ sessionId: string; interactive: boolean }> {
    const response = await this.request(`${API_URL}/picker/interactive/start`, {
      method: 'POST',
      body: JSON.stringify({ targetNodeId, nodes, edges }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error starting interactive picker');
    }

    return response.json();
  }

  async selectAtCoordinates(sessionId: string, x: number, y: number): Promise<{ result: PickerResult }> {
    const response = await this.request(`${API_URL}/picker/interactive/select`, {
      method: 'POST',
      body: JSON.stringify({ sessionId, x, y }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error selecting element at coordinates');
    }

    return response.json();
  }

  async hoverAtCoordinates(sessionId: string, x: number, y: number): Promise<{ 
    result: { selector: string; tagName: string; rect: { x: number; y: number; width: number; height: number }; inShadowDOM?: boolean } | null 
  }> {
    const response = await this.request(`${API_URL}/picker/interactive/hover`, {
      method: 'POST',
      body: JSON.stringify({ sessionId, x, y }),
    });
    return response.json();
  }

  async scrollPicker(sessionId: string, x: number, y: number, deltaY: number): Promise<void> {
    await this.request(`${API_URL}/picker/interactive/scroll`, {
      method: 'POST',
      body: JSON.stringify({ sessionId, x, y, deltaY }),
    });
  }

  subscribeToPickerFrame(sessionId: string, callback: (frameBase64: string) => void): void {
    this.pickerFrameCallbacks.set(sessionId, callback);
    
    // Deliver buffered frame if any
    const bufferedFrame = this.pickerFrameBuffer.get(sessionId);
    if (bufferedFrame) {
      this.pickerFrameBuffer.delete(sessionId);
      // Deliver on next tick to ensure component is ready
      setTimeout(() => callback(bufferedFrame), 0);
    }
  }
}

export interface PickerResult {
  selector: string;
  selectorType: 'css' | 'xpath' | 'text' | 'role' | 'testId';
  element: {
    tagName: string;
    id?: string;
    className?: string;
    text?: string;
    rect: { x: number; y: number; width: number; height: number };
  };
  alternatives: Array<{
    selector: string;
    type: string;
    confidence: number;
  }>;
}

export interface TestReport {
  id: string;
  executionId: string;
  flowName: string;
  generatedAt: string;
  duration: number;
  status: 'passed' | 'failed' | 'flaky';
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  tests: Array<{
    name: string;
    nodeId: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    error?: string;
    steps: Array<{
      title: string;
      nodeId: string;
      nodeType: string;
      status: 'passed' | 'failed';
      duration: number;
      error?: string;
    }>;
  }>;
  config?: {
    executionMode: string;
    workers: number;
    retries: number;
  };
}

export interface ProjectDTO {
  id: string;
  name: string;
  description?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  config?: ProjectConfig;
  members?: Array<{
    id: string;
    userId: string;
    role: string;
    user: { id: string; email: string; name: string | null };
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  config?: ProjectConfig;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  nodes?: FlowNode[];
  edges?: FlowEdge[];
  config?: ProjectConfig;
  newOwnerId?: string;
}

export const apiService = new ApiService();

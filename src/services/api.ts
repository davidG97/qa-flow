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
      throw new Error('Sesión expirada');
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
      throw new Error(error.error || 'Error de inicio de sesión');
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
      throw new Error(error.error || 'Error de registro');
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
  // ADMIN - USUARIOS
  // ==========================================

  async getUsers(): Promise<Array<{ id: string; email: string; name: string | null; role: string; createdAt: string }>> {
    const response = await this.request(`${API_URL}/users`);
    if (!response.ok) {
      throw new Error('Error obteniendo usuarios');
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
      throw new Error(error.error || 'Error creando usuario');
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
      throw new Error(error.error || 'Error actualizando usuario');
    }
    return response.json();
  }

  async deleteUser(id: string): Promise<void> {
    const response = await this.request(`${API_URL}/users/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Error eliminando usuario');
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

          if (data.type === 'picker:result' && data.sessionId) {
            const callback = this.pickerCallbacks.get(data.sessionId);
            if (callback) {
              callback(data.cancelled ? null : data.result);
              this.pickerCallbacks.delete(data.sessionId);
              this.pickerProgressCallbacks.delete(data.sessionId);
            }
          }

          if (data.type === 'picker:progress' && data.message) {
            this.pickerProgressCallbacks.forEach(callback => callback(data.message));
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

  // ==========================================
  // EJECUCIÓN & CÓDIGO
  // ==========================================

  async runFlow(
    flow: TestFlow,
    options?: { headless?: boolean; slowMo?: number }
  ): Promise<RunResponse> {
    const response = await this.request(`${API_URL}/run`, {
      method: 'POST',
      body: JSON.stringify({ flow, options }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error ejecutando flujo');
    }

    return response.json();
  }

  async generateCode(flow: TestFlow): Promise<string> {
    const response = await this.request(`${API_URL}/generate-code`, {
      method: 'POST',
      body: JSON.stringify({ flow }),
    });

    if (!response.ok) {
      throw new Error('Error generando código');
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
      throw new Error(error.error || 'Error iniciando grabación');
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
      throw new Error('Sesión no encontrada');
    }

    return response.json();
  }

  async stopRecording(sessionId: string): Promise<void> {
    const response = await this.request(`${API_URL}/record/stop/${sessionId}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Error deteniendo grabación');
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
      throw new Error(error.error || 'Error obteniendo nodos');
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
      throw new Error('Error parseando código');
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
      throw new Error('Reporte no encontrado');
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
      throw new Error('Error obteniendo proyectos');
    }
    return response.json();
  }

  async getProject(id: string): Promise<ProjectDTO> {
    const response = await this.request(`${API_URL}/projects/${id}`);
    if (!response.ok) {
      throw new Error('Error obteniendo proyecto');
    }
    return response.json();
  }

  async createProject(project: CreateProjectInput): Promise<ProjectDTO> {
    const response = await this.request(`${API_URL}/projects`, {
      method: 'POST',
      body: JSON.stringify(project),
    });
    if (!response.ok) {
      throw new Error('Error creando proyecto');
    }
    return response.json();
  }

  async updateProject(id: string, project: Partial<CreateProjectInput>): Promise<ProjectDTO> {
    const response = await this.request(`${API_URL}/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(project),
    });
    if (!response.ok) {
      throw new Error('Error actualizando proyecto');
    }
    return response.json();
  }

  async deleteProject(id: string): Promise<void> {
    const response = await this.request(`${API_URL}/projects/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Error eliminando proyecto');
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
    edges: Array<{ id: string; source: string; target: string }>
  ): Promise<{ sessionId: string }> {
    const response = await this.request(`${API_URL}/picker/start`, {
      method: 'POST',
      body: JSON.stringify({ targetNodeId, nodes, edges }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error iniciando selector visual');
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

export const apiService = new ApiService();

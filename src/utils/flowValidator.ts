import { Node, Edge } from '@xyflow/react';
import { nodeTypes, NodeTypeDefinition } from '../types/nodes';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  severity: ValidationSeverity;
  code: string;
  message: string;
  suggestion?: string;
  field?: string;
}

export interface ValidationResult {
  isValid: boolean;
  canExecute: boolean; // true si solo hay warnings, false si hay errores
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

// Tipo para config de nodos
type NodeConfig = Record<string, unknown>;

// Obtener definición de un tipo de nodo
const getNodeDefinition = (nodeTypeId: string): NodeTypeDefinition | undefined => {
  return nodeTypes.find(nt => nt.id === nodeTypeId);
};

// Validar campos requeridos de un nodo
const validateRequiredFields = (node: Node, definition: NodeTypeDefinition): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const config = (node.data?.config || {}) as NodeConfig;
  const nodeLabel = String(node.data?.label || definition.label);

  for (const field of definition.fields) {
    if (field.required) {
      const value = config[field.name];
      const isEmpty = value === undefined || value === null || value === '';

      if (isEmpty) {
        issues.push({
          nodeId: node.id,
          nodeLabel,
          nodeType: definition.id,
          severity: 'error',
          code: 'REQUIRED_FIELD_MISSING',
          message: `El campo "${field.label}" es obligatorio`,
          suggestion: getSuggestionForField(field.name, definition.id),
          field: field.name,
        });
      }
    }
  }

  return issues;
};

// Sugerencias específicas por campo y tipo de nodo
const getSuggestionForField = (fieldName: string, nodeType: string): string => {
  const suggestions: Record<string, Record<string, string>> = {
    selector: {
      click: 'Usa un selector CSS como "#mi-boton" o "button[type=submit]". También puedes usar texto visible: "text=Enviar"',
      type: 'Ejemplo: "input[name=email]" o "#campo-email"',
      fill: 'Ejemplo: "input[name=usuario]" o ".campo-password"',
      check: 'Ejemplo: "input[type=checkbox]#acepto-terminos"',
      select: 'Ejemplo: "select#pais" o "select[name=ciudad]"',
      hover: 'Ejemplo: ".menu-item" o "#dropdown-trigger"',
      screenshot: 'Deja vacío para capturar toda la página, o especifica un elemento',
      default: 'Usa selectores CSS, XPath (//div), texto ("text=Click aquí") o role ("role=button")',
    },
    text: {
      type: 'El texto que quieres escribir en el campo',
      default: 'Ingresa el texto que deseas usar',
    },
    value: {
      fill: 'El valor que quieres insertar en el campo',
      select: 'El valor de la opción a seleccionar',
      default: 'Ingresa el valor correspondiente',
    },
    url: {
      navigate: 'Ejemplo: "https://ejemplo.com/login" o solo "/login" si ya tienes URL base',
      default: 'Una URL completa como "https://ejemplo.com"',
    },
    baseUrl: {
      start: 'La URL donde comenzará tu prueba. Ejemplo: "https://mi-app.com"',
      default: 'URL base de la aplicación',
    },
    expectedText: {
      verifyText: 'El texto que esperas encontrar en la página',
      default: 'Texto esperado en el elemento',
    },
    milliseconds: {
      wait: 'Tiempo en milisegundos (1000 = 1 segundo)',
      default: 'Tiempo de espera en ms',
    },
  };

  const fieldSuggestions = suggestions[fieldName];
  if (fieldSuggestions) {
    return fieldSuggestions[nodeType] || fieldSuggestions.default || '';
  }
  return '';
};

// Validar conexiones del nodo
const validateConnections = (
  node: Node,
  edges: Edge[],
  definition: NodeTypeDefinition
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const nodeLabel = String(node.data?.label || definition.label);
  
  const hasIncoming = edges.some(e => e.target === node.id);
  const hasOutgoing = edges.some(e => e.source === node.id);

  // Los nodos de inicio no necesitan conexiones entrantes
  if (definition.category !== 'trigger' && !hasIncoming) {
    issues.push({
      nodeId: node.id,
      nodeLabel,
      nodeType: definition.id,
      severity: 'warning',
      code: 'NO_INCOMING_CONNECTION',
      message: 'Este nodo no tiene conexiones entrantes',
      suggestion: 'Conecta este nodo desde otro nodo para que se ejecute',
    });
  }

  // Solo warning si no tiene conexiones salientes (excepto nodos finales lógicos)
  if (!hasOutgoing && definition.category !== 'assertion') {
    issues.push({
      nodeId: node.id,
      nodeLabel,
      nodeType: definition.id,
      severity: 'info',
      code: 'NO_OUTGOING_CONNECTION',
      message: 'Este nodo no tiene conexiones salientes',
      suggestion: 'Si este no es el final del flujo, conecta a otro nodo',
    });
  }

  return issues;
};

// Validaciones específicas por tipo de nodo
const validateNodeSpecific = (node: Node, definition: NodeTypeDefinition): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const config = (node.data?.config || {}) as NodeConfig;
  const nodeLabel = String(node.data?.label || definition.label);

  switch (definition.id) {
    case 'start': {
      // Validar que el nombre del test sea obligatorio
      const testName = (config.testName as string | undefined) || '';
      if (!testName.trim()) {
        issues.push({
          nodeId: node.id,
          nodeLabel,
          nodeType: 'start',
          severity: 'error',
          code: 'START_NAME_REQUIRED',
          message: 'El nombre del test es obligatorio',
          suggestion: 'Ingresa un nombre descriptivo para identificar este caso de prueba',
          field: 'testName',
        });
      }

      // Validar que baseUrl tenga formato válido
      const baseUrl = config.baseUrl as string | undefined;
      if (baseUrl && !isValidUrl(baseUrl)) {
        issues.push({
          nodeId: node.id,
          nodeLabel,
          nodeType: 'start',
          severity: 'warning',
          code: 'INVALID_URL_FORMAT',
          message: 'La URL base no parece tener un formato válido',
          suggestion: 'Asegúrate de incluir el protocolo (https:// o http://)',
          field: 'baseUrl',
        });
      }
      break;
    }

    case 'navigate': {
      const url = config.url as string | undefined;
      if (url && !url.startsWith('/') && !isValidUrl(url)) {
        issues.push({
          nodeId: node.id,
          nodeLabel,
          nodeType: 'navigate',
          severity: 'warning',
          code: 'INVALID_URL_FORMAT',
          message: 'La URL no parece válida',
          suggestion: 'Usa una URL completa (https://...) o una ruta relativa (/ruta)',
          field: 'url',
        });
      }
      break;
    }

    case 'wait': {
      const msValue = config.milliseconds;
      let ms = 0;
      if (typeof msValue === 'number') {
        ms = msValue;
      } else if (typeof msValue === 'string') {
        ms = Number.parseInt(msValue, 10) || 0;
      }
      if (ms > 30000) {
        issues.push({
          nodeId: node.id,
          nodeLabel,
          nodeType: 'wait',
          severity: 'warning',
          code: 'LONG_WAIT_TIME',
          message: `Esperar ${ms / 1000} segundos puede hacer las pruebas lentas`,
          suggestion: 'Considera usar "Esperar Elemento" en lugar de esperas fijas',
          field: 'milliseconds',
        });
      }
      break;
    }

    case 'screenshot': {
      // Info si captura página completa sin nombre
      if (!config.selector && !config.name) {
        issues.push({
          nodeId: node.id,
          nodeLabel,
          nodeType: 'screenshot',
          severity: 'info',
          code: 'SCREENSHOT_NO_NAME',
          message: 'Se generará un nombre automático para el screenshot',
          suggestion: 'Agrega un nombre descriptivo para identificar fácilmente el screenshot',
          field: 'name',
        });
      }
      break;
    }
  }

  return issues;
};

// Validar formato de URL
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Validación principal del flujo
export const validateFlow = (nodes: Node[], edges: Edge[]): ValidationResult => {
  const issues: ValidationIssue[] = [];

  // Verificar que hay al menos un nodo de inicio
  const startNodes = nodes.filter(n => n.type === 'testNode' && n.data?.nodeType === 'start');
  
  if (startNodes.length === 0) {
    issues.push({
      nodeId: 'flow',
      nodeLabel: 'Flujo',
      nodeType: 'flow',
      severity: 'error',
      code: 'NO_START_NODE',
      message: 'El flujo necesita al menos un nodo de Inicio',
      suggestion: 'Arrastra un nodo "Inicio" desde el panel izquierdo al canvas',
    });
  }

  // Validar nombres duplicados en nodos de inicio
  if (startNodes.length > 1) {
    const startNodeNames = new Map<string, string[]>(); // nombre -> [nodeIds]
    
    for (const node of startNodes) {
      const config = (node.data?.config || {}) as NodeConfig;
      const testName = ((config.testName as string | undefined) || '').trim().toLowerCase();
      
      if (testName) {
        const existing = startNodeNames.get(testName) || [];
        existing.push(node.id);
        startNodeNames.set(testName, existing);
      }
    }

    // Reportar nombres duplicados
    for (const [name, nodeIds] of startNodeNames) {
      if (nodeIds.length > 1) {
        for (const nodeId of nodeIds) {
          const node = startNodes.find(n => n.id === nodeId);
          const nodeLabel = String(node?.data?.label || 'Inicio');
          issues.push({
            nodeId,
            nodeLabel,
            nodeType: 'start',
            severity: 'error',
            code: 'DUPLICATE_START_NAME',
            message: `El nombre "${name}" está duplicado en ${nodeIds.length} nodos de inicio`,
            suggestion: 'Cada nodo de inicio debe tener un nombre único para identificar el caso de prueba',
            field: 'testName',
          });
        }
      }
    }
  }

  // Validar cada nodo
  for (const node of nodes) {
    if (node.type !== 'testNode') continue;

    const nodeTypeId = node.data?.nodeType as string | undefined;
    if (!nodeTypeId) continue;

    const definition = getNodeDefinition(nodeTypeId);
    if (!definition) continue;

    // Validar campos requeridos, conexiones y específicos
    const requiredIssues = validateRequiredFields(node, definition);
    const connectionIssues = validateConnections(node, edges, definition);
    const specificIssues = validateNodeSpecific(node, definition);
    
    issues.push(...requiredIssues, ...connectionIssues, ...specificIssues);
  }

  // Calcular resumen
  const summary = {
    errors: issues.filter(i => i.severity === 'error').length,
    warnings: issues.filter(i => i.severity === 'warning').length,
    info: issues.filter(i => i.severity === 'info').length,
  };

  return {
    isValid: summary.errors === 0 && summary.warnings === 0,
    canExecute: summary.errors === 0,
    issues,
    summary,
  };
};

// Función para obtener issues de un nodo específico
export const getNodeIssues = (
  nodeId: string,
  validationResult: ValidationResult
): ValidationIssue[] => {
  return validationResult.issues.filter(i => i.nodeId === nodeId);
};

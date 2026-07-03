// Tipos para los nodos de automatización de pruebas
export type NodeCategory = 'trigger' | 'action' | 'assertion' | 'control' | 'hook';

// Configuración global del proyecto
export interface ProjectConfig {
  executionMode: 'default' | 'parallel' | 'serial';
  workers: number;
  maxFailures: number;
  retries: number;
  timeout: number;
  cdpUrl?: string; // URL para conectar via CDP y ver ejecución
}

export const defaultProjectConfig: ProjectConfig = {
  executionMode: 'default',
  workers: 4,
  maxFailures: 0,
  retries: 0,
  timeout: 30000,
  cdpUrl: '',
};

export interface NodeTypeDefinition {
  id: string;
  label: string;
  category: NodeCategory;
  description: string;
  fields: NodeField[];
}

export interface NodeField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'textarea' | 'boolean' | 'tags';
  options?: { value: string; label: string }[];
  defaultValue?: string | number | boolean;
  placeholder?: string;
  required?: boolean;
  group?: string; // Grupo colapsable al que pertenece el campo
  dependsOn?: { field: string; value: unknown }; // Campo del que depende para mostrarse
}

// Definición de todos los tipos de nodos disponibles
export const nodeTypes: NodeTypeDefinition[] = [
  // Triggers
  {
    id: 'start',
    label: 'Inicio',
    category: 'trigger',
    description: 'Punto de inicio del flujo de pruebas',
    fields: [
      // Campos básicos
      {
        name: 'testName',
        label: 'Nombre del Test',
        type: 'text',
        placeholder: 'Mi test de login',
      },
      {
        name: 'tags',
        label: 'Tags',
        type: 'tags',
        placeholder: '@smoke, @critical, @regression',
      },
      {
        name: 'baseUrl',
        label: 'URL Base',
        type: 'text',
        placeholder: 'https://ejemplo.com',
        required: true,
      },
      // ponytail: headless removed - always headless, user sees via screencast/CDP
      // Opciones avanzadas - Emulación de dispositivo
      {
        name: 'device',
        label: 'Emular Dispositivo',
        type: 'select',
        group: 'emulation',
        options: [
          { value: '', label: 'Ninguno (Desktop)' },
          { value: 'Pixel 5', label: 'Pixel 5' },
          { value: 'Pixel 7', label: 'Pixel 7' },
          { value: 'iPhone 12', label: 'iPhone 12' },
          { value: 'iPhone 13', label: 'iPhone 13' },
          { value: 'iPhone 14', label: 'iPhone 14' },
          { value: 'iPhone 14 Pro Max', label: 'iPhone 14 Pro Max' },
          { value: 'iPad Mini', label: 'iPad Mini' },
          { value: 'iPad Pro 11', label: 'iPad Pro 11' },
          { value: 'Galaxy S9+', label: 'Galaxy S9+' },
          { value: 'Galaxy Tab S4', label: 'Galaxy Tab S4' },
        ],
        defaultValue: '',
      },
      // Opciones avanzadas - Viewport
      {
        name: 'viewportWidth',
        label: 'Ancho Viewport',
        type: 'number',
        group: 'emulation',
        placeholder: '1280',
        defaultValue: 1280,
      },
      {
        name: 'viewportHeight',
        label: 'Alto Viewport',
        type: 'number',
        group: 'emulation',
        placeholder: '720',
        defaultValue: 720,
      },
      {
        name: 'deviceScaleFactor',
        label: 'Factor de Escala',
        type: 'number',
        group: 'emulation',
        placeholder: '1',
        defaultValue: 1,
      },
      {
        name: 'isMobile',
        label: 'Es Móvil',
        type: 'boolean',
        group: 'emulation',
        defaultValue: false,
      },
      {
        name: 'hasTouch',
        label: 'Pantalla Táctil',
        type: 'boolean',
        group: 'emulation',
        defaultValue: false,
      },
      // Opciones avanzadas - Localización
      {
        name: 'locale',
        label: 'Idioma/Región',
        type: 'select',
        group: 'emulation',
        options: [
          { value: '', label: 'Por defecto' },
          { value: 'en-US', label: 'English (US)' },
          { value: 'en-GB', label: 'English (UK)' },
          { value: 'es-ES', label: 'Español (España)' },
          { value: 'es-MX', label: 'Español (México)' },
          { value: 'es-CO', label: 'Español (Colombia)' },
          { value: 'pt-BR', label: 'Português (Brasil)' },
          { value: 'fr-FR', label: 'Français' },
          { value: 'de-DE', label: 'Deutsch' },
          { value: 'it-IT', label: 'Italiano' },
          { value: 'ja-JP', label: '日本語' },
          { value: 'ko-KR', label: '한국어' },
          { value: 'zh-CN', label: '中文 (简体)' },
        ],
        defaultValue: '',
      },
      {
        name: 'timezoneId',
        label: 'Zona Horaria',
        type: 'select',
        group: 'emulation',
        options: [
          { value: '', label: 'Por defecto' },
          { value: 'America/New_York', label: 'New York (EST)' },
          { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
          { value: 'America/Chicago', label: 'Chicago (CST)' },
          { value: 'America/Bogota', label: 'Bogotá (COT)' },
          { value: 'America/Mexico_City', label: 'Ciudad de México' },
          { value: 'America/Sao_Paulo', label: 'São Paulo' },
          { value: 'Europe/London', label: 'London (GMT)' },
          { value: 'Europe/Paris', label: 'Paris (CET)' },
          { value: 'Europe/Madrid', label: 'Madrid (CET)' },
          { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
          { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
          { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
        ],
        defaultValue: '',
      },
      // Opciones avanzadas - Geolocalización
      {
        name: 'geoLatitude',
        label: 'Latitud',
        type: 'text',
        group: 'emulation',
        placeholder: '4.6097',
      },
      {
        name: 'geoLongitude',
        label: 'Longitud',
        type: 'text',
        group: 'emulation',
        placeholder: '-74.0817',
      },
      {
        name: 'geoAccuracy',
        label: 'Precisión Geo (metros)',
        type: 'number',
        group: 'emulation',
        placeholder: '100',
      },
      // Opciones avanzadas - Apariencia y comportamiento
      {
        name: 'colorScheme',
        label: 'Esquema de Color',
        type: 'select',
        group: 'emulation',
        options: [
          { value: '', label: 'Por defecto' },
          { value: 'light', label: 'Claro (Light)' },
          { value: 'dark', label: 'Oscuro (Dark)' },
          { value: 'no-preference', label: 'Sin preferencia' },
        ],
        defaultValue: '',
      },
      {
        name: 'reducedMotion',
        label: 'Reducir Movimiento',
        type: 'select',
        group: 'emulation',
        options: [
          { value: '', label: 'Por defecto' },
          { value: 'reduce', label: 'Reducir' },
          { value: 'no-preference', label: 'Sin preferencia' },
        ],
        defaultValue: '',
      },
      {
        name: 'forcedColors',
        label: 'Colores Forzados',
        type: 'select',
        group: 'emulation',
        options: [
          { value: '', label: 'Por defecto' },
          { value: 'active', label: 'Activo' },
          { value: 'none', label: 'Ninguno' },
        ],
        defaultValue: '',
      },
      // Opciones avanzadas - Red y JS
      {
        name: 'offline',
        label: 'Modo Offline',
        type: 'boolean',
        group: 'emulation',
        defaultValue: false,
      },
      {
        name: 'javaScriptEnabled',
        label: 'JavaScript Habilitado',
        type: 'boolean',
        group: 'emulation',
        defaultValue: true,
      },
      // Opciones avanzadas - User Agent
      {
        name: 'userAgent',
        label: 'User Agent Personalizado',
        type: 'textarea',
        group: 'emulation',
        placeholder: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
      },
      // Opciones avanzadas - Permisos
      {
        name: 'permissions',
        label: 'Permisos del Navegador',
        type: 'tags',
        group: 'emulation',
        placeholder: 'geolocation, notifications, camera',
      },
    ],
  },

  // Actions - Navegación
  {
    id: 'navigate',
    label: 'Navegar',
    category: 'action',
    description: 'Navega a una URL específica',
    fields: [
      {
        name: 'url',
        label: 'URL',
        type: 'text',
        placeholder: '/ruta o https://...',
        required: true,
      },
      {
        name: 'waitUntil',
        label: 'Esperar hasta',
        type: 'select',
        options: [
          { value: 'load', label: 'Carga completa' },
          { value: 'domcontentloaded', label: 'DOM cargado' },
          { value: 'networkidle', label: 'Red inactiva' },
        ],
        defaultValue: 'load',
      },
    ],
  },

  // Actions - Clicks
  {
    id: 'click',
    label: 'Hacer Click',
    category: 'action',
    description: 'Hace click en un elemento',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '#id, .clase, button[type="submit"]',
        required: true,
      },
      {
        name: 'button',
        label: 'Botón del mouse',
        type: 'select',
        options: [
          { value: 'left', label: 'Izquierdo' },
          { value: 'right', label: 'Derecho' },
          { value: 'middle', label: 'Central' },
        ],
        defaultValue: 'left',
      },
      {
        name: 'clickCount',
        label: 'Número de clicks',
        type: 'number',
        defaultValue: 1,
      },
      {
        name: 'delay',
        label: 'Delay entre mousedown/mouseup (ms)',
        type: 'number',
        defaultValue: 0,
      },
      {
        name: 'force',
        label: 'Forzar (ignorar chequeos)',
        type: 'boolean',
        defaultValue: false,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Checkbox
  {
    id: 'check',
    label: 'Marcar/Desmarcar Checkbox',
    category: 'action',
    description: 'Marca o desmarca un checkbox',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input[type="checkbox"]',
        required: true,
      },
      {
        name: 'action',
        label: 'Acción',
        type: 'select',
        options: [
          { value: 'check', label: 'Marcar' },
          { value: 'uncheck', label: 'Desmarcar' },
        ],
        defaultValue: 'check',
      },
      {
        name: 'force',
        label: 'Forzar (ignorar chequeos)',
        type: 'boolean',
        defaultValue: false,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Typing
  {
    id: 'type',
    label: 'Escribir Texto',
    category: 'action',
    description: 'Escribe texto en un campo',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input[name="email"]',
        required: true,
      },
      {
        name: 'text',
        label: 'Texto',
        type: 'text',
        placeholder: 'Texto a escribir...',
        required: true,
      },
      {
        name: 'clearFirst',
        label: 'Limpiar primero',
        type: 'boolean',
        defaultValue: true,
      },
      {
        name: 'delay',
        label: 'Delay entre teclas (ms)',
        type: 'number',
        defaultValue: 0,
      },
    ],
  },

  // Actions - Fill (más rápido que type)
  {
    id: 'fill',
    label: 'Rellenar Campo',
    category: 'action',
    description: 'Rellena un campo de forma instantánea',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input[name="email"]',
        required: true,
      },
      {
        name: 'value',
        label: 'Valor',
        type: 'text',
        placeholder: 'valor a insertar',
        required: true,
      },
    ],
  },

  // Actions - Select
  {
    id: 'select',
    label: 'Seleccionar Opción',
    category: 'action',
    description: 'Selecciona una opción de un dropdown',
    fields: [
      {
        name: 'selector',
        label: 'Selector del select',
        type: 'text',
        placeholder: 'select#pais',
        required: true,
      },
      {
        name: 'value',
        label: 'Valor',
        type: 'text',
        placeholder: 'valor de la opción',
        required: true,
      },
      {
        name: 'selectBy',
        label: 'Seleccionar por',
        type: 'select',
        options: [
          { value: 'value', label: 'Valor' },
          { value: 'label', label: 'Etiqueta visible' },
          { value: 'index', label: 'Índice' },
        ],
        defaultValue: 'value',
      },
    ],
  },

  // Actions - Hover
  {
    id: 'hover',
    label: 'Hover',
    category: 'action',
    description: 'Pasa el mouse sobre un elemento',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '.menu-item',
        required: true,
      },
    ],
  },

  // Actions - Wait
  {
    id: 'wait',
    label: 'Esperar',
    category: 'action',
    description: 'Espera un tiempo o condición',
    fields: [
      {
        name: 'waitType',
        label: 'Tipo de espera',
        type: 'select',
        options: [
          { value: 'time', label: 'Tiempo fijo' },
          { value: 'selector', label: 'Elemento visible' },
          { value: 'hidden', label: 'Elemento oculto' },
          { value: 'networkidle', label: 'Red inactiva' },
        ],
        defaultValue: 'time',
      },
      {
        name: 'value',
        label: 'Valor (ms o selector)',
        type: 'text',
        placeholder: '1000 o #elemento',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Screenshot
  {
    id: 'screenshot',
    label: 'Captura de Pantalla',
    category: 'action',
    description: 'Toma una captura de pantalla',
    fields: [
      {
        name: 'name',
        label: 'Nombre del archivo',
        type: 'text',
        placeholder: 'captura-login',
        required: true,
      },
      {
        name: 'fullPage',
        label: 'Página completa',
        type: 'boolean',
        defaultValue: false,
      },
      {
        name: 'selector',
        label: 'Selector (opcional)',
        type: 'text',
        placeholder: 'Solo capturar este elemento',
        dependsOn: { field: 'fullPage', value: false },
      },
    ],
  },

  // Actions - Double Click
  {
    id: 'dblclick',
    label: 'Doble Click',
    category: 'action',
    description: 'Hace doble click en un elemento',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '#id, .clase, button',
        required: true,
      },
      {
        name: 'button',
        label: 'Botón del mouse',
        type: 'select',
        options: [
          { value: 'left', label: 'Izquierdo' },
          { value: 'right', label: 'Derecho' },
          { value: 'middle', label: 'Central' },
        ],
        defaultValue: 'left',
      },
      {
        name: 'delay',
        label: 'Delay entre clicks (ms)',
        type: 'number',
        defaultValue: 0,
      },
      {
        name: 'force',
        label: 'Forzar (ignorar chequeos)',
        type: 'boolean',
        defaultValue: false,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Clear
  {
    id: 'clear',
    label: 'Limpiar Campo',
    category: 'action',
    description: 'Limpia el contenido de un campo de entrada',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input#email',
        required: true,
      },
      {
        name: 'force',
        label: 'Forzar (ignorar chequeos)',
        type: 'boolean',
        defaultValue: false,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Blur
  {
    id: 'blur',
    label: 'Quitar Foco',
    category: 'action',
    description: 'Quita el foco de un elemento (blur)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input#campo',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Focus
  {
    id: 'focus',
    label: 'Dar Foco',
    category: 'action',
    description: 'Da foco a un elemento',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input#campo',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Press Key
  {
    id: 'press',
    label: 'Presionar Tecla',
    category: 'action',
    description: 'Presiona una tecla o combinación de teclas',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input#busqueda',
        required: true,
      },
      {
        name: 'key',
        label: 'Tecla',
        type: 'select',
        options: [
          { value: 'Enter', label: 'Enter' },
          { value: 'Tab', label: 'Tab' },
          { value: 'Escape', label: 'Escape' },
          { value: 'Backspace', label: 'Backspace' },
          { value: 'Delete', label: 'Delete' },
          { value: 'ArrowUp', label: 'Flecha Arriba' },
          { value: 'ArrowDown', label: 'Flecha Abajo' },
          { value: 'ArrowLeft', label: 'Flecha Izquierda' },
          { value: 'ArrowRight', label: 'Flecha Derecha' },
          { value: 'Home', label: 'Inicio' },
          { value: 'End', label: 'Fin' },
          { value: 'PageUp', label: 'Page Up' },
          { value: 'PageDown', label: 'Page Down' },
          { value: 'Control+a', label: 'Ctrl+A (Seleccionar todo)' },
          { value: 'Control+c', label: 'Ctrl+C (Copiar)' },
          { value: 'Control+v', label: 'Ctrl+V (Pegar)' },
          { value: 'Control+z', label: 'Ctrl+Z (Deshacer)' },
          { value: 'Control+s', label: 'Ctrl+S (Guardar)' },
          { value: 'F1', label: 'F1' },
          { value: 'F5', label: 'F5' },
          { value: 'F12', label: 'F12' },
        ],
        defaultValue: 'Enter',
      },
      {
        name: 'customKey',
        label: 'Tecla personalizada (opcional)',
        type: 'text',
        placeholder: 'Shift+Control+a',
      },
      {
        name: 'delay',
        label: 'Delay (ms)',
        type: 'number',
        defaultValue: 0,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Press Sequentially (Type character by character)
  {
    id: 'pressSequentially',
    label: 'Escribir Secuencialmente',
    category: 'action',
    description: 'Escribe texto carácter por carácter (simula escritura real)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input#usuario',
        required: true,
      },
      {
        name: 'text',
        label: 'Texto',
        type: 'text',
        placeholder: 'Texto a escribir...',
        required: true,
      },
      {
        name: 'delay',
        label: 'Delay entre teclas (ms)',
        type: 'number',
        defaultValue: 50,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Select Text
  {
    id: 'selectText',
    label: 'Seleccionar Texto',
    category: 'action',
    description: 'Selecciona todo el texto de un elemento',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input#campo, textarea',
        required: true,
      },
      {
        name: 'force',
        label: 'Forzar (ignorar chequeos)',
        type: 'boolean',
        defaultValue: false,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Set Input Files (Upload)
  {
    id: 'setInputFiles',
    label: 'Subir Archivo',
    category: 'action',
    description: 'Sube uno o más archivos a un input de tipo file',
    fields: [
      {
        name: 'selector',
        label: 'Selector del input file',
        type: 'text',
        placeholder: 'input[type="file"]',
        required: true,
      },
      {
        name: 'filePath',
        label: 'Ruta del archivo',
        type: 'text',
        placeholder: '/ruta/al/archivo.pdf',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Tap (Mobile)
  {
    id: 'tap',
    label: 'Tap (Móvil)',
    category: 'action',
    description: 'Realiza un tap en un elemento (para dispositivos táctiles)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'button.submit',
        required: true,
      },
      {
        name: 'force',
        label: 'Forzar (ignorar chequeos)',
        type: 'boolean',
        defaultValue: false,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Drag and Drop
  {
    id: 'dragTo',
    label: 'Arrastrar y Soltar',
    category: 'action',
    description: 'Arrastra un elemento hacia otro',
    fields: [
      {
        name: 'sourceSelector',
        label: 'Selector origen',
        type: 'text',
        placeholder: '#elemento-arrastrar',
        required: true,
      },
      {
        name: 'targetSelector',
        label: 'Selector destino',
        type: 'text',
        placeholder: '#zona-soltar',
        required: true,
      },
      {
        name: 'force',
        label: 'Forzar (ignorar chequeos)',
        type: 'boolean',
        defaultValue: false,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Scroll Into View
  {
    id: 'scrollIntoView',
    label: 'Hacer Scroll',
    category: 'action',
    description: 'Hace scroll hasta que el elemento sea visible',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '#elemento-abajo',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Dispatch Event
  {
    id: 'dispatchEvent',
    label: 'Disparar Evento',
    category: 'action',
    description: 'Dispara un evento DOM programáticamente',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '#elemento',
        required: true,
      },
      {
        name: 'eventType',
        label: 'Tipo de evento',
        type: 'select',
        options: [
          { value: 'click', label: 'click' },
          { value: 'dblclick', label: 'dblclick' },
          { value: 'mousedown', label: 'mousedown' },
          { value: 'mouseup', label: 'mouseup' },
          { value: 'mouseover', label: 'mouseover' },
          { value: 'mouseout', label: 'mouseout' },
          { value: 'focus', label: 'focus' },
          { value: 'blur', label: 'blur' },
          { value: 'input', label: 'input' },
          { value: 'change', label: 'change' },
          { value: 'submit', label: 'submit' },
          { value: 'keydown', label: 'keydown' },
          { value: 'keyup', label: 'keyup' },
          { value: 'keypress', label: 'keypress' },
          { value: 'dragstart', label: 'dragstart' },
          { value: 'dragend', label: 'dragend' },
          { value: 'drop', label: 'drop' },
        ],
        defaultValue: 'click',
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Wait For Element
  {
    id: 'waitFor',
    label: 'Esperar Elemento',
    category: 'action',
    description: 'Espera hasta que el elemento cumpla una condición',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '#elemento',
        required: true,
      },
      {
        name: 'state',
        label: 'Estado esperado',
        type: 'select',
        options: [
          { value: 'visible', label: 'Visible' },
          { value: 'hidden', label: 'Oculto' },
          { value: 'attached', label: 'En el DOM' },
          { value: 'detached', label: 'Fuera del DOM' },
        ],
        defaultValue: 'visible',
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Get Attribute (para usar en variables)
  {
    id: 'getAttribute',
    label: 'Obtener Atributo',
    category: 'action',
    description: 'Obtiene el valor de un atributo de un elemento',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'a#link',
        required: true,
      },
      {
        name: 'attribute',
        label: 'Nombre del atributo',
        type: 'text',
        placeholder: 'href, class, data-id',
        required: true,
      },
      {
        name: 'variableName',
        label: 'Guardar en variable',
        type: 'text',
        placeholder: 'miVariable',
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Get Input Value
  {
    id: 'inputValue',
    label: 'Obtener Valor de Input',
    category: 'action',
    description: 'Obtiene el valor actual de un campo de entrada',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input#email',
        required: true,
      },
      {
        name: 'variableName',
        label: 'Guardar en variable',
        type: 'text',
        placeholder: 'valorEmail',
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Get Text Content
  {
    id: 'textContent',
    label: 'Obtener Texto',
    category: 'action',
    description: 'Obtiene el contenido de texto de un elemento',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'span.mensaje',
        required: true,
      },
      {
        name: 'variableName',
        label: 'Guardar en variable',
        type: 'text',
        placeholder: 'textoMensaje',
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Assertions
  {
    id: 'assertVisible',
    label: 'Verificar Visible',
    category: 'assertion',
    description: 'Verifica que un elemento sea visible (toBeVisible)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '.mensaje-exito',
        required: true,
      },
      {
        name: 'negate',
        label: 'Negar (NOT visible)',
        type: 'boolean',
        defaultValue: false,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertHidden',
    label: 'Verificar Oculto',
    category: 'assertion',
    description: 'Verifica que un elemento esté oculto (toBeHidden)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '.modal-cerrado',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertAttached',
    label: 'Verificar En DOM',
    category: 'assertion',
    description: 'Verifica que un elemento esté en el DOM (toBeAttached)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '#componente',
        required: true,
      },
      {
        name: 'attached',
        label: 'Estado',
        type: 'select',
        options: [
          { value: 'true', label: 'En el DOM' },
          { value: 'false', label: 'Fuera del DOM' },
        ],
        defaultValue: 'true',
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertChecked',
    label: 'Verificar Marcado',
    category: 'assertion',
    description: 'Verifica si un checkbox/radio está marcado (toBeChecked)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input[type="checkbox"]',
        required: true,
      },
      {
        name: 'checked',
        label: 'Estado esperado',
        type: 'select',
        options: [
          { value: 'true', label: 'Marcado' },
          { value: 'false', label: 'No marcado' },
        ],
        defaultValue: 'true',
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertEnabled',
    label: 'Verificar Habilitado',
    category: 'assertion',
    description: 'Verifica si un elemento está habilitado (toBeEnabled)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'button#submit',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertDisabled',
    label: 'Verificar Deshabilitado',
    category: 'assertion',
    description: 'Verifica si un elemento está deshabilitado (toBeDisabled)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'button#submit',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertEditable',
    label: 'Verificar Editable',
    category: 'assertion',
    description: 'Verifica si un campo es editable (toBeEditable)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input#nombre',
        required: true,
      },
      {
        name: 'editable',
        label: 'Estado esperado',
        type: 'select',
        options: [
          { value: 'true', label: 'Editable' },
          { value: 'false', label: 'No editable' },
        ],
        defaultValue: 'true',
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertEmpty',
    label: 'Verificar Vacío',
    category: 'assertion',
    description: 'Verifica si un contenedor está vacío (toBeEmpty)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '.lista-items',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertFocused',
    label: 'Verificar Enfocado',
    category: 'assertion',
    description: 'Verifica si un elemento tiene el foco (toBeFocused)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input#email',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertInViewport',
    label: 'Verificar En Viewport',
    category: 'assertion',
    description: 'Verifica si un elemento está visible en el viewport (toBeInViewport)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '.seccion-visible',
        required: true,
      },
      {
        name: 'ratio',
        label: 'Ratio mínimo visible (0-1)',
        type: 'number',
        defaultValue: 0,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertText',
    label: 'Verificar Texto',
    category: 'assertion',
    description: 'Verifica el texto de un elemento (toHaveText/toContainText)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'h1.titulo',
        required: true,
      },
      {
        name: 'expectedText',
        label: 'Texto esperado',
        type: 'text',
        placeholder: 'Bienvenido',
        required: true,
      },
      {
        name: 'matchType',
        label: 'Tipo de coincidencia',
        type: 'select',
        options: [
          { value: 'exact', label: 'Exacto (toHaveText)' },
          { value: 'contains', label: 'Contiene (toContainText)' },
          { value: 'regex', label: 'Expresión regular' },
        ],
        defaultValue: 'contains',
      },
      {
        name: 'ignoreCase',
        label: 'Ignorar mayúsculas/minúsculas',
        type: 'boolean',
        defaultValue: false,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertAttribute',
    label: 'Verificar Atributo',
    category: 'assertion',
    description: 'Verifica el valor de un atributo DOM (toHaveAttribute)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'a#link',
        required: true,
      },
      {
        name: 'attribute',
        label: 'Nombre del atributo',
        type: 'text',
        placeholder: 'href, class, data-id',
        required: true,
      },
      {
        name: 'expectedValue',
        label: 'Valor esperado (vacío = solo existencia)',
        type: 'text',
        placeholder: 'valor del atributo',
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertClass',
    label: 'Verificar Clase CSS',
    category: 'assertion',
    description: 'Verifica las clases CSS de un elemento (toHaveClass/toContainClass)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'div#card',
        required: true,
      },
      {
        name: 'expectedClass',
        label: 'Clase(s) esperada(s)',
        type: 'text',
        placeholder: 'active highlighted',
        required: true,
      },
      {
        name: 'matchType',
        label: 'Tipo de verificación',
        type: 'select',
        options: [
          { value: 'exact', label: 'Exacto (toHaveClass)' },
          { value: 'contains', label: 'Contiene (toContainClass)' },
        ],
        defaultValue: 'contains',
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertCSS',
    label: 'Verificar Estilo CSS',
    category: 'assertion',
    description: 'Verifica una propiedad CSS del elemento (toHaveCSS)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '.boton',
        required: true,
      },
      {
        name: 'cssProperty',
        label: 'Propiedad CSS',
        type: 'text',
        placeholder: 'background-color, display, opacity',
        required: true,
      },
      {
        name: 'expectedValue',
        label: 'Valor esperado',
        type: 'text',
        placeholder: 'rgb(255, 0, 0), block, 1',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertId',
    label: 'Verificar ID',
    category: 'assertion',
    description: 'Verifica el ID de un elemento (toHaveId)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '.mi-componente',
        required: true,
      },
      {
        name: 'expectedId',
        label: 'ID esperado',
        type: 'text',
        placeholder: 'user-profile',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertRole',
    label: 'Verificar Rol ARIA',
    category: 'assertion',
    description: 'Verifica el rol ARIA de un elemento (toHaveRole)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '.mi-boton',
        required: true,
      },
      {
        name: 'expectedRole',
        label: 'Rol esperado',
        type: 'select',
        options: [
          { value: 'button', label: 'button' },
          { value: 'checkbox', label: 'checkbox' },
          { value: 'dialog', label: 'dialog' },
          { value: 'link', label: 'link' },
          { value: 'menu', label: 'menu' },
          { value: 'menuitem', label: 'menuitem' },
          { value: 'navigation', label: 'navigation' },
          { value: 'progressbar', label: 'progressbar' },
          { value: 'radio', label: 'radio' },
          { value: 'tab', label: 'tab' },
          { value: 'tablist', label: 'tablist' },
          { value: 'tabpanel', label: 'tabpanel' },
          { value: 'textbox', label: 'textbox' },
          { value: 'listbox', label: 'listbox' },
          { value: 'option', label: 'option' },
          { value: 'combobox', label: 'combobox' },
          { value: 'slider', label: 'slider' },
          { value: 'spinbutton', label: 'spinbutton' },
          { value: 'switch', label: 'switch' },
          { value: 'alert', label: 'alert' },
          { value: 'alertdialog', label: 'alertdialog' },
          { value: 'grid', label: 'grid' },
          { value: 'row', label: 'row' },
          { value: 'cell', label: 'cell' },
          { value: 'tree', label: 'tree' },
          { value: 'treeitem', label: 'treeitem' },
          { value: 'heading', label: 'heading' },
          { value: 'img', label: 'img' },
          { value: 'list', label: 'list' },
          { value: 'listitem', label: 'listitem' },
          { value: 'main', label: 'main' },
          { value: 'region', label: 'region' },
          { value: 'search', label: 'search' },
          { value: 'form', label: 'form' },
        ],
        defaultValue: 'button',
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertAccessibleName',
    label: 'Verificar Nombre Accesible',
    category: 'assertion',
    description: 'Verifica el nombre accesible de un elemento (toHaveAccessibleName)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'button.submit',
        required: true,
      },
      {
        name: 'expectedName',
        label: 'Nombre accesible esperado',
        type: 'text',
        placeholder: 'Enviar formulario',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertAccessibleDescription',
    label: 'Verificar Descripción Accesible',
    category: 'assertion',
    description: 'Verifica la descripción accesible de un elemento (toHaveAccessibleDescription)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input#email',
        required: true,
      },
      {
        name: 'expectedDescription',
        label: 'Descripción esperada',
        type: 'text',
        placeholder: 'Ingrese su email corporativo',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertUrl',
    label: 'Verificar URL',
    category: 'assertion',
    description: 'Verifica la URL actual de la página (toHaveURL)',
    fields: [
      {
        name: 'expectedUrl',
        label: 'URL esperada',
        type: 'text',
        placeholder: '/dashboard o https://...',
        required: true,
      },
      {
        name: 'matchType',
        label: 'Tipo de coincidencia',
        type: 'select',
        options: [
          { value: 'exact', label: 'Exacta' },
          { value: 'contains', label: 'Contiene' },
          { value: 'regex', label: 'Expresión regular' },
        ],
        defaultValue: 'contains',
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertTitle',
    label: 'Verificar Título',
    category: 'assertion',
    description: 'Verifica el título de la página (toHaveTitle)',
    fields: [
      {
        name: 'expectedTitle',
        label: 'Título esperado',
        type: 'text',
        placeholder: 'Mi Aplicación - Dashboard',
        required: true,
      },
      {
        name: 'matchType',
        label: 'Tipo de coincidencia',
        type: 'select',
        options: [
          { value: 'exact', label: 'Exacto' },
          { value: 'contains', label: 'Contiene' },
          { value: 'regex', label: 'Expresión regular' },
        ],
        defaultValue: 'contains',
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertValue',
    label: 'Verificar Valor',
    category: 'assertion',
    description: 'Verifica el valor de un input (toHaveValue)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input#email',
        required: true,
      },
      {
        name: 'expectedValue',
        label: 'Valor esperado',
        type: 'text',
        placeholder: 'user@email.com',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertValues',
    label: 'Verificar Valores Select',
    category: 'assertion',
    description: 'Verifica los valores seleccionados de un select múltiple (toHaveValues)',
    fields: [
      {
        name: 'selector',
        label: 'Selector del select',
        type: 'text',
        placeholder: 'select#colores',
        required: true,
      },
      {
        name: 'expectedValues',
        label: 'Valores esperados (separados por coma)',
        type: 'text',
        placeholder: 'rojo,azul,verde',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertCount',
    label: 'Verificar Cantidad',
    category: 'assertion',
    description: 'Verifica la cantidad de elementos (toHaveCount)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '.item-lista',
        required: true,
      },
      {
        name: 'expectedCount',
        label: 'Cantidad esperada',
        type: 'number',
        required: true,
      },
      {
        name: 'comparison',
        label: 'Comparación',
        type: 'select',
        options: [
          { value: 'equal', label: 'Igual a' },
          { value: 'greaterThan', label: 'Mayor que' },
          { value: 'lessThan', label: 'Menor que' },
          { value: 'greaterOrEqual', label: 'Mayor o igual' },
          { value: 'lessOrEqual', label: 'Menor o igual' },
        ],
        defaultValue: 'equal',
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertScreenshot',
    label: 'Verificar Screenshot',
    category: 'assertion',
    description: 'Compara visualmente el elemento con una imagen de referencia (toHaveScreenshot)',
    fields: [
      {
        name: 'selector',
        label: 'Selector (vacío = página completa)',
        type: 'text',
        placeholder: '.componente-visual',
      },
      {
        name: 'screenshotName',
        label: 'Nombre del screenshot',
        type: 'text',
        placeholder: 'login-form',
        required: true,
      },
      {
        name: 'maxDiffPixels',
        label: 'Máximo píxeles diferentes',
        type: 'number',
        defaultValue: 0,
      },
      {
        name: 'maxDiffPixelRatio',
        label: 'Ratio máximo diferencia (0-1)',
        type: 'number',
        defaultValue: 0,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  // Control Flow
  {
    id: 'if',
    label: 'Condición (If)',
    category: 'control',
    description: 'Ejecuta ramas según una condición',
    fields: [
      {
        name: 'conditionType',
        label: 'Tipo de condición',
        type: 'select',
        options: [
          { value: 'elementExists', label: 'Elemento existe' },
          { value: 'elementVisible', label: 'Elemento visible' },
          { value: 'textContains', label: 'Texto contiene' },
          { value: 'urlContains', label: 'URL contiene' },
        ],
        defaultValue: 'elementExists',
      },
      {
        name: 'selector',
        label: 'Selector/Valor',
        type: 'text',
        placeholder: '#elemento o texto',
        required: true,
      },
    ],
  },

  {
    id: 'loop',
    label: 'Bucle (Loop)',
    category: 'control',
    description: 'Repite una secuencia de acciones',
    fields: [
      {
        name: 'loopType',
        label: 'Tipo de bucle',
        type: 'select',
        options: [
          { value: 'count', label: 'Número fijo' },
          { value: 'elements', label: 'Por cada elemento' },
          { value: 'data', label: 'Por cada dato' },
        ],
        defaultValue: 'count',
      },
      {
        name: 'value',
        label: 'Valor (cantidad o selector)',
        type: 'text',
        placeholder: '5 o .item',
        required: true,
      },
    ],
  },

  {
    id: 'code',
    label: 'Código JavaScript',
    category: 'control',
    description: 'Ejecuta código JavaScript personalizado',
    fields: [
      {
        name: 'code',
        label: 'Código',
        type: 'textarea',
        placeholder: '// Escribe tu código JavaScript aquí\n// Puedes usar: page, context, browser\n// Ejemplo:\nconst title = await page.title();\nconsole.log(title);',
        required: true,
      },
      {
        name: 'description',
        label: 'Descripción',
        type: 'text',
        placeholder: 'Qué hace este código...',
      },
      {
        name: 'awaitResult',
        label: 'Esperar resultado',
        type: 'boolean',
        defaultValue: true,
      },
    ],
  },

  // Hooks - Lifecycle
  {
    id: 'beforeAll',
    label: 'Before All',
    category: 'hook',
    description: 'Se ejecuta una vez antes de todos los tests del grupo',
    fields: [
      {
        name: 'hookName',
        label: 'Nombre del hook',
        type: 'text',
        placeholder: 'Setup inicial',
      },
      {
        name: 'description',
        label: 'Descripción',
        type: 'textarea',
        placeholder: 'Qué hace este hook...',
      },
    ],
  },

  {
    id: 'beforeEach',
    label: 'Before Each',
    category: 'hook',
    description: 'Se ejecuta antes de cada test',
    fields: [
      {
        name: 'hookName',
        label: 'Nombre del hook',
        type: 'text',
        placeholder: 'Setup por test',
      },
      {
        name: 'description',
        label: 'Descripción',
        type: 'textarea',
        placeholder: 'Qué hace este hook...',
      },
    ],
  },

  {
    id: 'afterEach',
    label: 'After Each',
    category: 'hook',
    description: 'Se ejecuta después de cada test',
    fields: [
      {
        name: 'hookName',
        label: 'Nombre del hook',
        type: 'text',
        placeholder: 'Cleanup por test',
      },
      {
        name: 'description',
        label: 'Descripción',
        type: 'textarea',
        placeholder: 'Qué hace este hook...',
      },
    ],
  },

  {
    id: 'afterAll',
    label: 'After All',
    category: 'hook',
    description: 'Se ejecuta una vez después de todos los tests del grupo',
    fields: [
      {
        name: 'hookName',
        label: 'Nombre del hook',
        type: 'text',
        placeholder: 'Cleanup final',
      },
      {
        name: 'description',
        label: 'Descripción',
        type: 'textarea',
        placeholder: 'Qué hace este hook...',
      },
    ],
  },
];

// Agrupar nodos por categoría
export const nodesByCategory = nodeTypes.reduce((acc, node) => {
  if (!acc[node.category]) {
    acc[node.category] = [];
  }
  acc[node.category].push(node);
  return acc;
}, {} as Record<NodeCategory, NodeTypeDefinition[]>);

export const categoryLabels: Record<NodeCategory, string> = {
  trigger: 'Triggers',
  action: 'Acciones',
  assertion: 'Verificaciones',
  control: 'Control de Flujo',
  hook: 'Hooks (Ciclo de Vida)',
};

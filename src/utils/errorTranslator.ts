/**
 * Traductor de errores técnicos de Playwright a mensajes amigables para QA
 */

export interface FriendlyError {
  title: string;
  description: string;
  suggestions: string[];
  category: 'selector' | 'timeout' | 'navigation' | 'assertion' | 'network' | 'browser' | 'unknown';
  originalError?: string;
}

// Patrones de errores conocidos
const errorPatterns: Array<{
  pattern: RegExp;
  handler: (match: RegExpMatchArray, original: string) => FriendlyError;
}> = [
  // Timeout esperando elemento
  {
    pattern: /Timeout (\d+)ms exceeded.*waiting for (locator|selector)\s*["']?([^"'\n]+)["']?/i,
    handler: (match, original) => ({
      title: 'No se encontró el elemento',
      description: `El elemento "${truncate(match[3], 50)}" no apareció en la página después de ${Number.parseInt(match[1], 10) / 1000} segundos.`,
      suggestions: [
        'Verifica que el selector sea correcto',
        'Revisa si el elemento aparece después de alguna acción (como scroll o clic)',
        'Aumenta el tiempo de espera si la página carga lento',
        'Usa las herramientas de desarrollo del navegador (F12) para verificar el selector',
      ],
      category: 'selector',
      originalError: original,
    }),
  },

  // Error de click - elemento no visible o interactable
  {
    pattern: /locator\.click:.*element is not visible|element is outside of the viewport/i,
    handler: (_, original) => ({
      title: 'El elemento no es visible',
      description: 'El elemento existe pero no se puede hacer clic porque no está visible en la pantalla.',
      suggestions: [
        'Agrega un scroll antes del clic',
        'Verifica que el elemento no esté oculto (display: none o visibility: hidden)',
        'Espera a que termine alguna animación',
        'Activa la opción "Forzar" en el nodo si es necesario',
      ],
      category: 'selector',
      originalError: original,
    }),
  },

  // Error de click - elemento interceptado
  {
    pattern: /locator\.click:.*element is (covered|intercepted|obscured) by|pointer-events/i,
    handler: (_, original) => ({
      title: 'Otro elemento bloquea el clic',
      description: 'Hay un elemento (como un modal, overlay o popup) que está encima del elemento que quieres clickear.',
      suggestions: [
        'Cierra cualquier modal o popup que esté abierto',
        'Espera a que desaparezca algún loader o overlay',
        'Verifica si hay un banner de cookies bloqueando',
        'Usa la opción "Forzar" para ignorar este chequeo',
      ],
      category: 'selector',
      originalError: original,
    }),
  },

  // Error de navegación
  {
    pattern: /net::ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_REFUSED|ERR_INTERNET_DISCONNECTED/i,
    handler: (_, original) => ({
      title: 'No se puede acceder a la página',
      description: 'No se pudo conectar al servidor. La URL puede estar mal escrita o el servidor no está disponible.',
      suggestions: [
        'Verifica que la URL esté bien escrita',
        'Comprueba tu conexión a internet',
        'Verifica que el servidor esté funcionando',
        'Si es una URL interna, verifica que estés en la VPN correcta',
      ],
      category: 'navigation',
      originalError: original,
    }),
  },

  // Timeout de navegación
  {
    pattern: /Timeout (\d+)ms exceeded.*page\.goto|Navigation timeout|Waiting for page to load/i,
    handler: (match, original) => ({
      title: 'La página tardó mucho en cargar',
      description: `La página no terminó de cargar en ${Number.parseInt(match[1] || '30000', 10) / 1000} segundos.`,
      suggestions: [
        'Verifica que la URL sea correcta',
        'Aumenta el timeout de navegación',
        'La página puede estar sobrecargada o muy lenta',
        'Verifica la conexión a internet',
      ],
      category: 'timeout',
      originalError: original,
    }),
  },

  // Error de assertion - texto no encontrado
  {
    pattern: /expect.*toHaveText|toContainText.*Received:?\s*["']([^"']*)["']/i,
    handler: (match, original) => ({
      title: 'El texto esperado no coincide',
      description: `El elemento tiene un texto diferente al esperado. Se encontró: "${truncate(match[1], 100)}"`,
      suggestions: [
        'Verifica que el texto esperado sea exactamente igual (mayúsculas, espacios)',
        'El contenido puede ser dinámico o cambiar según el usuario',
        'Usa "Contiene texto" en lugar de comparación exacta',
        'Revisa si el texto cambia según el idioma o configuración',
      ],
      category: 'assertion',
      originalError: original,
    }),
  },

  // Error de assertion - elemento no visible
  {
    pattern: /expect.*toBeVisible.*Received:?\s*false|Expected:?\s*visible/i,
    handler: (_, original) => ({
      title: 'El elemento no está visible',
      description: 'El elemento existe en el HTML pero no se muestra en pantalla.',
      suggestions: [
        'Puede estar oculto con CSS (display: none)',
        'Puede aparecer después de alguna acción',
        'Verifica si necesitas scroll para verlo',
        'Revisa condiciones que muestran/ocultan el elemento',
      ],
      category: 'assertion',
      originalError: original,
    }),
  },

  // Strict mode - múltiples elementos
  {
    pattern: /strict mode violation.*resolved to (\d+) elements/i,
    handler: (match, original) => ({
      title: 'El selector coincide con varios elementos',
      description: `Se encontraron ${match[1]} elementos que coinciden con el selector. Playwright no sabe cuál usar.`,
      suggestions: [
        'Haz el selector más específico (ej: añade una clase o ID)',
        'Usa nth() para seleccionar uno específico: selector >> nth=0',
        'Añade más contexto: ".contenedor .boton" en lugar de ".boton"',
        'Usa texto único: "text=Mi Botón Único"',
      ],
      category: 'selector',
      originalError: original,
    }),
  },

  // Error de fill en elemento no editable
  {
    pattern: /locator\.fill:.*Element is not an <input>|not editable|cannot fill/i,
    handler: (_, original) => ({
      title: 'No se puede escribir en este elemento',
      description: 'El elemento seleccionado no es un campo de texto donde se pueda escribir.',
      suggestions: [
        'Verifica que el selector apunte a un input o textarea',
        'El campo puede estar deshabilitado (disabled)',
        'Puede ser un elemento de solo lectura (readonly)',
        'Usa "Escribir Texto" en lugar de "Rellenar" si necesitas simular teclas',
      ],
      category: 'selector',
      originalError: original,
    }),
  },

  // Error de select
  {
    pattern: /locator\.selectOption:.*not a <select> element|option.*not found/i,
    handler: (_, original) => ({
      title: 'Error al seleccionar opción',
      description: 'No se pudo seleccionar la opción. El elemento no es un dropdown válido o la opción no existe.',
      suggestions: [
        'Verifica que el selector apunte a un elemento <select>',
        'Comprueba que el valor de la opción sea correcto',
        'Si es un dropdown personalizado (no nativo), usa Clic en lugar de Seleccionar',
        'Revisa las opciones disponibles en las herramientas de desarrollo',
      ],
      category: 'selector',
      originalError: original,
    }),
  },

  // Browser cerrado
  {
    pattern: /Target (page|browser|context).*closed|Browser has been closed/i,
    handler: (_, original) => ({
      title: 'El navegador se cerró inesperadamente',
      description: 'La ventana del navegador se cerró antes de completar las acciones.',
      suggestions: [
        'Verifica que no haya un error previo que cierre el navegador',
        'Revisa si hay algún popup o alerta que esté causando el cierre',
        'Aumenta los tiempos de espera',
        'Revisa los logs anteriores para ver qué causó el cierre',
      ],
      category: 'browser',
      originalError: original,
    }),
  },

  // Frame/iframe no encontrado
  {
    pattern: /frame|iframe.*not found|cannot access|cross-origin/i,
    handler: (_, original) => ({
      title: 'Problema con iframe o frame',
      description: 'El elemento está dentro de un iframe y no se puede acceder directamente.',
      suggestions: [
        'Usa el nodo "Cambiar Frame" antes de interactuar con elementos dentro del iframe',
        'Verifica que el iframe haya cargado completamente',
        'Si el iframe es de otro dominio, puede haber restricciones de seguridad',
      ],
      category: 'selector',
      originalError: original,
    }),
  },

  // Error de red genérico
  {
    pattern: /network|fetch|request failed|CORS|Failed to fetch/i,
    handler: (_, original) => ({
      title: 'Error de conexión de red',
      description: 'Hubo un problema al comunicarse con el servidor.',
      suggestions: [
        'Verifica tu conexión a internet',
        'El servidor puede estar caído o sobrecargado',
        'Puede haber un problema de CORS si accedes desde un origen diferente',
        'Intenta ejecutar de nuevo en unos minutos',
      ],
      category: 'network',
      originalError: original,
    }),
  },
];

// Función auxiliar para truncar texto largo
const truncate = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
};

/**
 * Traduce un error técnico a un mensaje amigable
 */
export const translateError = (error: string | Error): FriendlyError => {
  const errorMessage = typeof error === 'string' ? error : error.message;

  // Intentar encontrar un patrón conocido
  for (const { pattern, handler } of errorPatterns) {
    const match = pattern.exec(errorMessage);
    if (match) {
      return handler(match, errorMessage);
    }
  }

  // Error genérico si no coincide con ningún patrón
  return {
    title: 'Error durante la ejecución',
    description: extractReadableMessage(errorMessage),
    suggestions: [
      'Revisa la configuración del nodo',
      'Verifica que los selectores sean correctos',
      'Consulta el mensaje de error original para más detalles',
    ],
    category: 'unknown',
    originalError: errorMessage,
  };
};

/**
 * Extrae una parte legible del mensaje de error
 */
const extractReadableMessage = (error: string): string => {
  // Quitar stack traces y rutas de archivo
  let cleaned = error
    .replace(/at\s+[\w.]+\s+\([^)]+\)/g, '') // Remove stack trace lines
    .replace(/\s+at\s+[^\n]+/g, '') // Remove more stack traces
    .replace(/Error:\s*/g, '') // Remove "Error:" prefix
    .replace(/\n{2,}/g, '\n') // Remove multiple newlines
    .trim();

  // Tomar solo la primera línea significativa
  const firstLine = cleaned.split('\n')[0];
  
  return truncate(firstLine || 'Error desconocido', 200);
};

/**
 * Obtiene el ícono sugerido para la categoría de error
 */
export const getErrorCategoryIcon = (category: FriendlyError['category']): string => {
  const icons: Record<FriendlyError['category'], string> = {
    selector: '🎯',
    timeout: '⏱️',
    navigation: '🌐',
    assertion: '✓',
    network: '📡',
    browser: '🖥️',
    unknown: '❓',
  };
  return icons[category];
};

/**
 * Obtiene el color sugerido para la categoría
 */
export const getErrorCategoryColor = (category: FriendlyError['category']): string => {
  const colors: Record<FriendlyError['category'], string> = {
    selector: '#f59e0b', // amber
    timeout: '#ef4444', // red
    navigation: '#3b82f6', // blue
    assertion: '#8b5cf6', // violet
    network: '#ec4899', // pink
    browser: '#6366f1', // indigo
    unknown: '#6b7280', // gray
  };
  return colors[category];
};

// Configuración del servidor

export const config = {
  port: process.env.PORT || 3001,
  cors: {
    origin: '*',
  },
  jsonLimit: '10mb',
  execution: {
    defaultSlowMo: 100,
    defaultTimeout: 30000,
    cleanupDelay: 60000, // 1 minuto para limpiar suscripciones
  },
  recording: {
    cleanupInterval: 60 * 60 * 1000, // 1 hora
  },
};

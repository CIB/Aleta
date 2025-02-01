const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_NAMESPACE = process.env.LOG_NAMESPACE || 'all';

const LOG_LEVELS = {
  debug: 3,
  info: 2,
  warn: 1,
  error: 0,
};

export function createLogger(namespace: string) {
  function logMeta(logLevel: string, namespace: string) {
    return function (...args: any[]) {
      const isNamespace = LOG_NAMESPACE === namespace || LOG_NAMESPACE === 'all';
      const isLogLevel = LOG_LEVELS[LOG_LEVEL] >= LOG_LEVELS[logLevel];
      if (isNamespace && isLogLevel) {
        console[logLevel](...args);
      }
    };
  }

  return {
    debug: logMeta('debug', namespace),
    info: logMeta('info', namespace),
    warn: logMeta('warn', namespace),
    error: logMeta('error', namespace),
  };
}

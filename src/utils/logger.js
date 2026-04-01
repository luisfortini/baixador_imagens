export function createLogger({ verbose = true } = {}) {
  const write = (level, args) => {
    const timestamp = new Date().toISOString();
    const method = level === 'ERROR' ? console.error : console.log;
    method(`[${timestamp}] [${level}]`, ...args);
  };

  return {
    info: (...args) => write('INFO', args),
    warn: (...args) => write('WARN', args),
    error: (...args) => write('ERROR', args),
    debug: (...args) => {
      if (verbose) {
        write('DEBUG', args);
      }
    },
  };
}

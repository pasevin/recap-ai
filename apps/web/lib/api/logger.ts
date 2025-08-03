// API request/response logging utilities

// Type for any JSON-serializable data
export type LogData =
  | string
  | number
  | boolean
  | null
  | LogData[]
  | { [key: string]: LogData };

export interface LogContext {
  requestId: string;
  endpoint: string;
  method: string;
  timestamp: string;
  userAgent?: string;
  ip?: string;
}

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context: LogContext;
  data?: LogData;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class APILogger {
  private formatLogEntry(entry: LogEntry): string {
    const { level, message, context, duration, error, data } = entry;

    let logMessage = `[${level.toUpperCase()}] ${context.timestamp} - ${context.endpoint} (${context.method})`;
    logMessage += ` - RequestID: ${context.requestId}`;

    if (duration !== undefined) {
      logMessage += ` - Duration: ${duration}ms`;
    }

    logMessage += ` - ${message}`;

    if (error) {
      logMessage += ` - Error: ${error.name}: ${error.message}`;
    }

    if (data) {
      logMessage += ` - Data: ${JSON.stringify(data, null, 2)}`;
    }

    return logMessage;
  }

  info(
    message: string,
    context: LogContext,
    data?: LogData,
    duration?: number
  ): void {
    const entry: LogEntry = {
      level: 'info',
      message,
      context,
      data,
      duration,
    };
    console.log(this.formatLogEntry(entry));
  }

  warn(message: string, context: LogContext, data?: LogData): void {
    const entry: LogEntry = {
      level: 'warn',
      message,
      context,
      data,
    };
    console.warn(this.formatLogEntry(entry));
  }

  error(
    message: string,
    context: LogContext,
    error?: Error,
    data?: LogData
  ): void {
    const entry: LogEntry = {
      level: 'error',
      message,
      context,
      data,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    };
    console.error(this.formatLogEntry(entry));
  }

  debug(message: string, context: LogContext, data?: LogData): void {
    if (process.env.NODE_ENV === 'development') {
      const entry: LogEntry = {
        level: 'debug',
        message,
        context,
        data,
      };
      console.debug(this.formatLogEntry(entry));
    }
  }
}

export const apiLogger = new APILogger();

// Utility function to create log context
export function createLogContext(request: Request): LogContext {
  const url = new URL(request.url);

  return {
    requestId: crypto.randomUUID(),
    endpoint: url.pathname,
    method: request.method,
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent') ?? undefined,
    ip:
      request.headers.get('x-forwarded-for') ??
      request.headers.get('x-real-ip') ??
      'unknown',
  };
}

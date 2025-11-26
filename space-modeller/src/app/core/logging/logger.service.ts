import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { LogLevel, LogEntry } from './log-level.enum';

@Injectable({
  providedIn: 'root',
})
export class LoggerService {
  private readonly logHistory: LogEntry[] = [];
  private readonly maxHistorySize = 100;
  private readonly minLevel: LogLevel;

  constructor() {
    this.minLevel = this.getLogLevelFromString(environment.logging.level);
  }

  debug(message: string, context?: string, data?: unknown): void {
    this.log(LogLevel.Debug, message, context, data);
  }

  info(message: string, context?: string, data?: unknown): void {
    this.log(LogLevel.Info, message, context, data);
  }

  warn(message: string, context?: string, data?: unknown): void {
    this.log(LogLevel.Warn, message, context, data);
  }

  error(message: string, error?: Error, context?: string, data?: unknown): void {
    this.log(LogLevel.Error, message, context, data, error);
  }

  getHistory(): ReadonlyArray<LogEntry> {
    return [...this.logHistory];
  }

  clearHistory(): void {
    this.logHistory.length = 0;
  }

  private log(
    level: LogLevel,
    message: string,
    context?: string,
    data?: unknown,
    error?: Error
  ): void {
    if (!environment.logging.enabled || level < this.minLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      data,
      error,
    };

    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }

    this.logToConsole(entry);

    if (environment.logging.sendToServer && level >= LogLevel.Error) {
      this.sendToServer(entry);
    }
  }

  private logToConsole(entry: LogEntry): void {
    const prefix = `[${entry.level === LogLevel.Debug ? 'DEBUG' :
      entry.level === LogLevel.Info ? 'INFO' :
      entry.level === LogLevel.Warn ? 'WARN' : 'ERROR'}]`;
    
    const contextStr = entry.context ? ` [${entry.context}]` : '';
    const fullMessage = `${prefix}${contextStr} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.Debug:
        console.debug(fullMessage, entry.data);
        break;
      case LogLevel.Info:
        console.info(fullMessage, entry.data);
        break;
      case LogLevel.Warn:
        console.warn(fullMessage, entry.data);
        break;
      case LogLevel.Error:
        console.error(fullMessage, entry.error, entry.data);
        break;
    }
  }

  private sendToServer(entry: LogEntry): void {
    if (!environment.apiUrl) {
      return;
    }

    const payload = {
      timestamp: entry.timestamp.toISOString(),
      level: LogLevel[entry.level],
      message: entry.message,
      context: entry.context,
      data: entry.data,
      error: entry.error ? {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack,
      } : undefined,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    fetch(`${environment.apiUrl}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch((err) => {
      console.error('Failed to send log to server:', err);
    });
  }

  private getLogLevelFromString(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'debug': return LogLevel.Debug;
      case 'info': return LogLevel.Info;
      case 'warn': return LogLevel.Warn;
      case 'error': return LogLevel.Error;
      default: return LogLevel.Info;
    }
  }
}

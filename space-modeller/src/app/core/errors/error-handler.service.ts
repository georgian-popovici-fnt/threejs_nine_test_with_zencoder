import { Injectable, inject, ErrorHandler } from '@angular/core';
import { LoggerService } from '../logging/logger.service';
import { AppError } from './app-error';
import { ErrorCode } from './error-codes.enum';

export interface ErrorDisplayOptions {
  showToUser: boolean;
  autoHide?: boolean;
  duration?: number;
}

@Injectable({
  providedIn: 'root',
})
export class AppErrorHandler implements ErrorHandler {
  private readonly logger = inject(LoggerService);
  private readonly errorListeners: Array<(error: AppError) => void> = [];

  handleError(error: unknown): void {
    const appError = this.normalizeError(error);
    
    this.logger.error(
      appError.message,
      appError.originalError || new Error(appError.message),
      appError.code,
      appError.context
    );

    this.notifyListeners(appError);
  }

  onError(listener: (error: AppError) => void): () => void {
    this.errorListeners.push(listener);
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index >= 0) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  private normalizeError(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError({
        code: ErrorCode.UNKNOWN_ERROR,
        message: error.message,
        recoverable: true,
        originalError: error,
      });
    }

    return new AppError({
      code: ErrorCode.UNKNOWN_ERROR,
      message: String(error),
      recoverable: true,
    });
  }

  private notifyListeners(error: AppError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (err) {
        console.error('Error in error listener:', err);
      }
    });
  }
}

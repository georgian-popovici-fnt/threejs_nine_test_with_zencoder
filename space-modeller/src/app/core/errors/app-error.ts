import { ErrorCode, ErrorDetails } from './error-codes.enum';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly userMessage: string;
  public readonly recoverable: boolean;
  public readonly context?: Record<string, unknown>;
  public readonly originalError?: Error;
  public readonly timestamp: Date;

  constructor(details: ErrorDetails) {
    super(details.message);
    this.name = 'AppError';
    this.code = details.code;
    this.userMessage = details.userMessage || this.getDefaultUserMessage(details.code);
    this.recoverable = details.recoverable;
    this.context = details.context;
    this.originalError = details.originalError;
    this.timestamp = new Date();

    Object.setPrototypeOf(this, AppError.prototype);
  }

  private getDefaultUserMessage(code: ErrorCode): string {
    const messages: Record<ErrorCode, string> = {
      [ErrorCode.VIEWER_INIT_FAILED]: 'Failed to initialize 3D viewer. Please refresh the page.',
      [ErrorCode.IFC_LOAD_FAILED]: 'Failed to load IFC file. Please try again.',
      [ErrorCode.IFC_PARSE_FAILED]: 'Unable to parse IFC file. The file may be corrupted.',
      [ErrorCode.WASM_LOAD_FAILED]: 'Failed to load required components. Please check your connection.',
      [ErrorCode.GEOMETRY_PROCESSING_FAILED]: 'Error processing model geometry.',
      [ErrorCode.INVALID_FILE_FORMAT]: 'Invalid file format. Please select a valid IFC file.',
      [ErrorCode.FILE_TOO_LARGE]: 'File is too large. Please select a smaller file.',
      [ErrorCode.MEMORY_LIMIT_EXCEEDED]: 'Model is too complex for available memory.',
      [ErrorCode.RENDERER_ERROR]: 'Graphics rendering error occurred.',
      [ErrorCode.CAMERA_ERROR]: 'Camera control error.',
      [ErrorCode.SCENE_ERROR]: 'Scene management error.',
      [ErrorCode.NETWORK_ERROR]: 'Network connection error.',
      [ErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
    };

    return messages[code] || messages[ErrorCode.UNKNOWN_ERROR];
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      recoverable: this.recoverable,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack,
      } : undefined,
    };
  }
}

export class ViewerInitError extends AppError {
  constructor(message: string, originalError?: Error, context?: Record<string, unknown>) {
    super({
      code: ErrorCode.VIEWER_INIT_FAILED,
      message,
      recoverable: false,
      originalError,
      context,
    });
    this.name = 'ViewerInitError';
  }
}

export class IfcLoadError extends AppError {
  constructor(message: string, originalError?: Error, context?: Record<string, unknown>) {
    super({
      code: ErrorCode.IFC_LOAD_FAILED,
      message,
      recoverable: true,
      originalError,
      context,
    });
    this.name = 'IfcLoadError';
  }
}

export class WasmLoadError extends AppError {
  constructor(message: string, originalError?: Error, context?: Record<string, unknown>) {
    super({
      code: ErrorCode.WASM_LOAD_FAILED,
      message,
      recoverable: false,
      originalError,
      context,
    });
    this.name = 'WasmLoadError';
  }
}

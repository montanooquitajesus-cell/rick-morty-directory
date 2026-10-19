import { HttpErrorResponse } from '@angular/common/http';

export function isNotFound(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 404;
}

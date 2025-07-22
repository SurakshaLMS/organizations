import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Override canActivate to allow requests without tokens
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  // Override handleRequest to not throw errors when no user is found
  handleRequest(err: any, user: any, info: any) {
    // If there's an error or no user, just return undefined (allow access)
    // This makes authentication optional
    return user || undefined;
  }
}

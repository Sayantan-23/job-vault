import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the current authenticated user from the request object.
 * The user is attached to the request by the JwtAuthGuard (Plan 02).
 *
 * Usage: @CurrentUser() user: User
 * Usage: @CurrentUser('id') userId: string
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);

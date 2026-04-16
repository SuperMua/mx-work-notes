import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { RequestUser } from './request-user';

export const CurrentUser = createParamDecorator((_: never, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
  return request.user;
});

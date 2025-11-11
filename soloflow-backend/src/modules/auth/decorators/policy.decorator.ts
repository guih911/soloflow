import { SetMetadata } from '@nestjs/common';

export interface PolicyMetadata {
  resource: string;
  action: string;
}

export const POLICY_KEY = 'policy';

export const Policy = (metadata: PolicyMetadata) => SetMetadata(POLICY_KEY, metadata);

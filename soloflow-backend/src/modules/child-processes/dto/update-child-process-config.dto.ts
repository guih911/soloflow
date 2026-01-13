import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateChildProcessConfigDto } from './create-child-process-config.dto';

export class UpdateChildProcessConfigDto extends PartialType(
  OmitType(CreateChildProcessConfigDto, ['processInstanceId', 'mode'] as const),
) {}
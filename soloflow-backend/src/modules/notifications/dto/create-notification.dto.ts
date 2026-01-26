import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  type: NotificationType;
  title: string;
  message: string;
  userId: string;
  companyId: string;
  data?: Record<string, any>;
}

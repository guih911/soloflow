import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import { NotificationType } from '@prisma/client';

export interface TaskAssignedEvent {
  userId: string;
  companyId: string;
  processTitle: string;
  stepName: string;
  processId: string;
}

export interface ProcessCreatedEvent {
  creatorId: string;
  companyId: string;
  processTitle: string;
  processId: string;
}

export interface ProcessCompletedEvent {
  creatorId: string;
  companyId: string;
  processTitle: string;
  processId: string;
}

export interface ProcessRejectedEvent {
  creatorId: string;
  companyId: string;
  processTitle: string;
  processId: string;
  reason?: string;
}

export interface ProcessCancelledEvent {
  creatorId: string;
  companyId: string;
  processTitle: string;
  processId: string;
}

export interface StepCompletedEvent {
  creatorId: string;
  companyId: string;
  processTitle: string;
  processId: string;
  stepName: string;
  currentStep: number;
  totalSteps: number;
}

export interface SignaturePendingEvent {
  userId: string;
  companyId: string;
  processTitle: string;
  processId: string;
  documentName?: string;
}

export interface SignatureCompletedEvent {
  creatorId: string;
  companyId: string;
  processTitle: string;
  processId: string;
  signerName: string;
}

@Injectable()
export class NotificationEventsListener {
  private readonly logger = new Logger(NotificationEventsListener.name);

  constructor(private notificationsService: NotificationsService) {}

  @OnEvent('task.assigned')
  async handleTaskAssigned(event: TaskAssignedEvent) {
    this.logger.debug(`Evento task.assigned: ${event.userId}`);
    await this.notificationsService.create({
      type: NotificationType.TASK_ASSIGNED,
      title: event.processTitle,
      message: `Nova tarefa atribuída: ${event.stepName}`,
      userId: event.userId,
      companyId: event.companyId,
      data: { processId: event.processId, stepName: event.stepName },
    });
  }

  @OnEvent('process.created')
  async handleProcessCreated(event: ProcessCreatedEvent) {
    this.logger.debug(`Evento process.created: ${event.processId}`);
    await this.notificationsService.create({
      type: NotificationType.PROCESS_CREATED,
      title: event.processTitle,
      message: 'Processo criado com sucesso',
      userId: event.creatorId,
      companyId: event.companyId,
      data: { processId: event.processId },
    });
  }

  @OnEvent('process.completed')
  async handleProcessCompleted(event: ProcessCompletedEvent) {
    this.logger.debug(`Evento process.completed: ${event.processId}`);
    await this.notificationsService.create({
      type: NotificationType.PROCESS_COMPLETED,
      title: event.processTitle,
      message: 'Processo concluído com sucesso',
      userId: event.creatorId,
      companyId: event.companyId,
      data: { processId: event.processId },
    });
  }

  @OnEvent('process.rejected')
  async handleProcessRejected(event: ProcessRejectedEvent) {
    this.logger.debug(`Evento process.rejected: ${event.processId}`);
    await this.notificationsService.create({
      type: NotificationType.PROCESS_REJECTED,
      title: event.processTitle,
      message: event.reason ? `Processo rejeitado: ${event.reason}` : 'Processo foi rejeitado',
      userId: event.creatorId,
      companyId: event.companyId,
      data: { processId: event.processId, reason: event.reason },
    });
  }

  @OnEvent('process.cancelled')
  async handleProcessCancelled(event: ProcessCancelledEvent) {
    this.logger.debug(`Evento process.cancelled: ${event.processId}`);
    await this.notificationsService.create({
      type: NotificationType.PROCESS_CANCELLED,
      title: event.processTitle,
      message: 'Processo foi cancelado',
      userId: event.creatorId,
      companyId: event.companyId,
      data: { processId: event.processId },
    });
  }

  @OnEvent('step.completed')
  async handleStepCompleted(event: StepCompletedEvent) {
    this.logger.debug(`Evento step.completed: ${event.processId}`);
    await this.notificationsService.create({
      type: NotificationType.STEP_COMPLETED,
      title: event.processTitle,
      message: `Etapa concluída: ${event.stepName} (${event.currentStep}/${event.totalSteps})`,
      userId: event.creatorId,
      companyId: event.companyId,
      data: { processId: event.processId, stepName: event.stepName, currentStep: event.currentStep, totalSteps: event.totalSteps },
    });
  }

  @OnEvent('signature.pending')
  async handleSignaturePending(event: SignaturePendingEvent) {
    this.logger.debug(`Evento signature.pending: ${event.userId}`);
    await this.notificationsService.create({
      type: NotificationType.SIGNATURE_PENDING,
      title: event.processTitle,
      message: event.documentName
        ? `Documento aguardando sua assinatura: ${event.documentName}`
        : 'Você tem um documento aguardando assinatura',
      userId: event.userId,
      companyId: event.companyId,
      data: { processId: event.processId, documentName: event.documentName },
    });
  }

  @OnEvent('signature.completed')
  async handleSignatureCompleted(event: SignatureCompletedEvent) {
    this.logger.debug(`Evento signature.completed: ${event.processId}`);
    await this.notificationsService.create({
      type: NotificationType.SIGNATURE_COMPLETED,
      title: event.processTitle,
      message: `${event.signerName} assinou o documento`,
      userId: event.creatorId,
      companyId: event.companyId,
      data: { processId: event.processId, signerName: event.signerName },
    });
  }
}

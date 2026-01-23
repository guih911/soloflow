<template>
  <v-menu
    v-model="menuOpen"
    :close-on-content-click="false"
    location="bottom end"
    transition="slide-y-transition"
    min-width="380"
    max-width="420"
  >
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        icon
        variant="text"
        class="notification-btn"
        aria-label="Notificações"
      >
        <v-badge
          v-if="unreadCount > 0"
          :content="unreadCount > 99 ? '99+' : unreadCount"
          color="error"
          offset-x="-4"
          offset-y="-4"
        >
          <v-icon>mdi-bell-outline</v-icon>
        </v-badge>
        <v-icon v-else>mdi-bell-outline</v-icon>
      </v-btn>
    </template>

    <v-card class="notification-card" elevation="8">
      <!-- Header -->
      <div class="notification-header">
        <div class="notification-header__left">
          <span class="notification-title">Notificações</span>
          <v-chip
            v-if="unreadCount > 0"
            size="x-small"
            color="primary"
            variant="flat"
            class="ml-2"
          >
            {{ unreadCount }} {{ unreadCount === 1 ? 'nova' : 'novas' }}
          </v-chip>
        </div>
        <v-btn
          v-if="unreadCount > 0"
          variant="text"
          size="small"
          color="primary"
          class="mark-all-btn"
          @click="markAllAsRead"
        >
          <v-icon size="14" class="mr-1">mdi-check-all</v-icon>
          Marcar todas
        </v-btn>
      </div>

      <!-- Filter Tabs -->
      <div class="notification-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="tab-btn"
          :class="{ 'tab-btn--active': activeTab === tab.value }"
          @click="activeTab = tab.value"
        >
          {{ tab.label }}
          <span v-if="getTabCount(tab.value) > 0" class="tab-count">{{ getTabCount(tab.value) }}</span>
        </button>
      </div>

      <v-divider />

      <!-- Notifications List -->
      <div class="notification-content">
        <!-- Loading -->
        <div v-if="loading" class="loading-state">
          <v-progress-circular size="24" width="2" indeterminate color="primary" />
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredNotifications.length === 0" class="empty-state">
          <div class="empty-state__icon">
            <v-icon size="28">mdi-bell-check-outline</v-icon>
          </div>
          <p class="empty-state__title">Tudo em dia!</p>
          <p class="empty-state__text">Nenhuma notificação pendente</p>
        </div>

        <!-- List -->
        <div v-else class="notification-list">
          <div
            v-for="notification in filteredNotifications"
            :key="notification.id"
            class="notification-item"
            :class="{
              'notification-item--unread': !isRead(notification.id),
              'notification-item--clickable': !!getNotificationRoute(notification)
            }"
            @click="handleClick(notification)"
          >
            <div
              class="notification-item__icon"
              :class="'notification-item__icon--' + getNotificationColorClass(notification)"
            >
              <v-icon size="18">{{ getNotificationIcon(notification) }}</v-icon>
            </div>
            <div class="notification-item__content">
              <div class="notification-item__top">
                <span class="notification-item__title">{{ notification.title }}</span>
                <span class="notification-item__time">{{ getTimeAgo(notification.createdAt) }}</span>
              </div>
              <span class="notification-item__message">{{ notification.message }}</span>
              <div v-if="getNotificationRoute(notification)" class="notification-item__action">
                <v-icon size="12">mdi-arrow-right</v-icon>
                <span>{{ getActionLabel(notification) }}</span>
              </div>
            </div>
            <button
              v-if="!isRead(notification.id)"
              class="notification-item__mark-read"
              title="Marcar como lida"
              @click.stop="markAsRead(notification.id)"
            >
              <v-icon size="14">mdi-check</v-icon>
            </button>
            <div v-if="!isRead(notification.id)" class="notification-item__dot"></div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div v-if="notifications.length > maxVisible" class="notification-footer">
        <v-divider />
        <button class="footer-btn" @click="handleViewAll">
          <v-icon size="16">mdi-arrow-right</v-icon>
          <span>Ver todas ({{ notifications.length }})</span>
        </button>
      </div>
    </v-card>
  </v-menu>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationsStore } from '@/stores/notifications'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/pt-br'

dayjs.extend(relativeTime)
dayjs.locale('pt-br')

const emit = defineEmits(['show-modal'])
const router = useRouter()
const notificationsStore = useNotificationsStore()

// State
const menuOpen = ref(false)
const activeTab = ref('all')
const maxVisible = 8

// Tabs
const tabs = [
  { label: 'Todas', value: 'all' },
  { label: 'Tarefas', value: 'task' },
  { label: 'Assinaturas', value: 'signature' },
  { label: 'Atualizações', value: 'update' }
]

// Types grouped under "update" tab
const updateTypes = ['process_completed', 'process_cancelled', 'process_rejected', 'process_progress', 'signature_completed']

// Computed
const notifications = computed(() => notificationsStore.items || [])
const unreadCount = computed(() => notificationsStore.unreadCount || 0)
const loading = computed(() => notificationsStore.loading)

const filteredNotifications = computed(() => {
  let items = notifications.value
  if (activeTab.value === 'update') {
    items = items.filter(n => updateTypes.includes(getNotificationType(n)))
  } else if (activeTab.value !== 'all') {
    items = items.filter(n => getNotificationType(n) === activeTab.value)
  }
  return items.slice(0, maxVisible)
})

// Methods
function getNotificationType(notification) {
  if (notification.type) return notification.type
  if (notification.icon === 'mdi-draw-pen') return 'signature'
  if (notification.id?.startsWith('task-')) return 'task'
  return 'info'
}

function getTabCount(tabValue) {
  if (tabValue === 'all') return unreadCount.value
  if (tabValue === 'update') {
    return notifications.value.filter(n => !isRead(n.id) && updateTypes.includes(getNotificationType(n))).length
  }
  return notifications.value.filter(n => !isRead(n.id) && getNotificationType(n) === tabValue).length
}

function isRead(id) {
  return notificationsStore.isRead(id)
}

function getNotificationColorClass(notification) {
  const type = getNotificationType(notification)
  const colors = {
    task: 'primary',
    signature: 'warning',
    signature_completed: 'success',
    process_completed: 'success',
    process_progress: 'info',
    process_cancelled: 'error',
    process_rejected: 'error',
    approval: 'success',
    info: 'info',
    warning: 'warning',
    error: 'error',
  }
  return colors[type] || 'primary'
}

function getNotificationIcon(notification) {
  if (notification.icon && notification.icon !== 'mdi-bell') return notification.icon
  const type = getNotificationType(notification)
  const icons = {
    task: 'mdi-play-circle-outline',
    signature: 'mdi-draw-pen',
    signature_completed: 'mdi-check-decagram',
    process_completed: 'mdi-check-circle-outline',
    process_progress: 'mdi-arrow-right-circle-outline',
    process_cancelled: 'mdi-cancel',
    process_rejected: 'mdi-close-circle-outline',
    approval: 'mdi-check-decagram',
    info: 'mdi-information-outline',
    warning: 'mdi-alert-outline',
    error: 'mdi-alert-circle-outline',
  }
  return icons[type] || 'mdi-bell-outline'
}

function getNotificationRoute(notification) {
  const link = notification.actionUrl || notification.link
  if (!link) return null
  // Convert old paths to new routes
  const processMatch = link.match(/\/process(?:es|os)\/([^/]+)/)
  if (processMatch) {
    return { name: 'DetalhesDoProcesso', params: { id: processMatch[1] } }
  }
  return link
}

function getActionLabel(notification) {
  const type = getNotificationType(notification)
  if (type === 'signature') return 'Assinar documento'
  if (type === 'signature_completed') return 'Ver assinatura'
  if (type === 'task') return 'Executar etapa'
  if (type === 'process_completed') return 'Ver processo'
  if (type === 'process_progress') return 'Acompanhar'
  if (type === 'process_cancelled' || type === 'process_rejected') return 'Ver processo'
  return 'Ver detalhes'
}

function getTimeAgo(date) {
  if (!date) return ''
  const diff = dayjs().diff(dayjs(date), 'hour')
  if (diff < 1) return dayjs(date).fromNow()
  if (diff < 24) return `${diff}h atrás`
  const days = Math.floor(diff / 24)
  if (days === 1) return 'Ontem'
  if (days < 7) return `${days}d atrás`
  return dayjs(date).format('DD/MM')
}

async function handleClick(notification) {
  try {
    if (!isRead(notification.id)) {
      notificationsStore.markAsRead(notification.id)
    }

    const route = getNotificationRoute(notification)
    if (route) {
      menuOpen.value = false
      if (typeof route === 'string') {
        router.push(route)
      } else {
        router.push(route)
      }
    }
  } catch (e) {
    console.error('Erro ao processar notificação:', e)
  }
}

function markAsRead(id) {
  notificationsStore.markAsRead(id)
}

async function markAllAsRead() {
  notificationsStore.markAllAsRead()
}

function handleViewAll() {
  menuOpen.value = false
  emit('show-modal')
}
</script>

<style scoped>
.notification-btn {
  position: relative;
}

.notification-card {
  width: 400px;
  max-width: 100vw;
  border-radius: 14px !important;
  overflow: hidden;
}

/* Header */
.notification-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
}

.notification-header__left {
  display: flex;
  align-items: center;
}

.notification-title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-neutral-900);
}

.mark-all-btn {
  font-size: 0.75rem !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
}

/* Tabs */
.notification-tabs {
  display: flex;
  gap: 4px;
  padding: 0 12px 10px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-neutral-500);
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn:hover {
  background: var(--color-neutral-100);
  color: var(--color-neutral-700);
}

.tab-btn--active {
  background: var(--color-primary-50);
  color: var(--color-primary-700);
  font-weight: 600;
}

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  font-size: 0.625rem;
  font-weight: 700;
}

.tab-btn--active .tab-count {
  background: var(--color-primary-500);
  color: white;
}

/* Content */
.notification-content {
  max-height: 400px;
  overflow-y: auto;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

/* List */
.notification-list {
  padding: 4px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  position: relative;
  transition: background 0.15s ease;
}

.notification-item--clickable {
  cursor: pointer;
}

.notification-item:hover {
  background: var(--color-neutral-50);
}

.notification-item--unread {
  background: var(--color-primary-50);
}

.notification-item--unread:hover {
  background: var(--color-primary-100);
}

/* Icon */
.notification-item__icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notification-item__icon--primary {
  background: var(--color-primary-100);
  color: var(--color-primary-600);
}

.notification-item__icon--success {
  background: var(--color-success-100);
  color: var(--color-success-600);
}

.notification-item__icon--warning {
  background: var(--color-warning-100);
  color: var(--color-warning-600);
}

.notification-item__icon--error {
  background: var(--color-error-100);
  color: var(--color-error-600);
}

.notification-item__icon--info {
  background: var(--color-info-100);
  color: var(--color-info-600);
}

/* Content */
.notification-item__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.notification-item__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.notification-item__title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notification-item__time {
  font-size: 0.6875rem;
  color: var(--color-neutral-400);
  white-space: nowrap;
  flex-shrink: 0;
}

.notification-item__message {
  font-size: 0.75rem;
  color: var(--color-neutral-600);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
}

.notification-item__action {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--color-primary-600);
}

/* Mark as read */
.notification-item__mark-read {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: var(--color-primary-100);
  color: var(--color-primary-600);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.notification-item:hover .notification-item__mark-read {
  opacity: 1;
}

.notification-item__mark-read:hover {
  background: var(--color-primary-200);
}

/* Dot */
.notification-item__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-primary-500);
  flex-shrink: 0;
  margin-top: 14px;
}

/* Footer */
.notification-footer {
  padding: 0;
}

.footer-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 12px;
  border: none;
  background: transparent;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-primary-600);
  cursor: pointer;
  transition: background 0.15s ease;
}

.footer-btn:hover {
  background: var(--color-primary-50);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 36px 20px;
  text-align: center;
}

.empty-state__icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-success-50);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-success-500);
  margin-bottom: 12px;
}

.empty-state__title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-neutral-700);
  margin: 0 0 4px;
}

.empty-state__text {
  font-size: 0.75rem;
  color: var(--color-neutral-500);
  margin: 0;
}
</style>

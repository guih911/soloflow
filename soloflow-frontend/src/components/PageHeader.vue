<template>
  <div class="page-header" :class="headerClasses">
    <div class="header-content">
      <!-- Back Button -->
      <v-btn
        v-if="showBack"
        icon="mdi-arrow-left"
        variant="flat"
        color="white"
        @click="$emit('back')"
        class="back-btn"
      />

      <!-- Header Icon -->
      <div class="header-icon">
        <v-icon size="28" color="white">{{ icon }}</v-icon>
      </div>

      <!-- Header Text -->
      <div class="header-text">
        <h1 class="page-title">{{ title }}</h1>
        <p v-if="subtitle" class="page-subtitle">{{ subtitle }}</p>
      </div>
    </div>

    <!-- Actions Slot -->
    <div v-if="$slots.actions" class="header-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: 'mdi-file-document'
  },
  showBack: {
    type: Boolean,
    default: false
  },
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'success', 'warning', 'info', 'secondary'].includes(value)
  }
})

defineEmits(['back'])

const headerClasses = computed(() => ({
  [`page-header--${props.variant}`]: true
}))
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  border-radius: 16px;
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.25);
}

/* Variants */
.page-header--primary {
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
}

.page-header--success {
  background: linear-gradient(135deg, var(--color-success-500), var(--color-success-600));
  box-shadow: 0 4px 20px rgba(34, 197, 94, 0.25);
}

.page-header--warning {
  background: linear-gradient(135deg, var(--color-warning-500), var(--color-warning-600));
  box-shadow: 0 4px 20px rgba(245, 158, 11, 0.25);
}

.page-header--info {
  background: linear-gradient(135deg, var(--color-info-500), var(--color-info-600));
  box-shadow: 0 4px 20px rgba(6, 182, 212, 0.25);
}

.page-header--secondary {
  background: linear-gradient(135deg, var(--color-secondary-500), var(--color-secondary-600));
  box-shadow: 0 4px 20px rgba(139, 92, 246, 0.25);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  background: rgba(255, 255, 255, 0.15) !important;
  margin-right: 8px;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.25) !important;
}

.header-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: white !important;
  margin: 0;
  letter-spacing: -0.01em;
}

.page-subtitle {
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.75) !important;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Deep styling for action buttons */
.header-actions :deep(.v-btn) {
  text-transform: none;
  font-weight: 500;
  border-radius: 10px;
}

.header-actions :deep(.v-btn--variant-flat[color="white"]) {
  color: var(--color-primary-600) !important;
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 20px;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
  }

  .back-btn {
    position: absolute;
    top: 16px;
    left: 16px;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions :deep(.v-btn) {
    width: 100%;
  }
}
</style>

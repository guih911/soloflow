<template>
  <v-app>
    <v-main class="auth-main">
      <!-- Background Pattern -->
      <div class="auth-background">
        <div class="auth-pattern"></div>
        <div class="auth-gradient"></div>
      </div>

      <!-- Content -->
      <v-container fluid class="auth-container">
        <v-row align="center" justify="center" class="fill-height">
          <v-col cols="12" sm="10" md="8" lg="5" xl="4">
            <router-view v-slot="{ Component }">
              <transition name="slide-up" mode="out-in">
                <component :is="Component" />
              </transition>
            </router-view>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <!-- Snackbar Global -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
      location="top"
      rounded="lg"
    >
      <div class="d-flex align-center">
        <v-icon v-if="snackbar.color === 'success'" class="mr-2">mdi-check-circle</v-icon>
        <v-icon v-else-if="snackbar.color === 'error'" class="mr-2">mdi-alert-circle</v-icon>
        <v-icon v-else class="mr-2">mdi-information</v-icon>
        {{ snackbar.message }}
      </div>
      <template #actions>
        <v-btn variant="text" size="small" @click="snackbar.show = false">
          Fechar
        </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { reactive } from 'vue'

const snackbar = reactive({
  show: false,
  message: '',
  color: 'success'
})

// Global snackbar
window.showSnackbar = (message, color = 'success') => {
  snackbar.message = message
  snackbar.color = color
  snackbar.show = true
}
</script>

<style scoped>
.auth-main {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

.auth-background {
  position: fixed;
  inset: 0;
  z-index: 0;
}

.auth-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg,
    #2563eb 0%,
    #3b82f6 25%,
    #60a5fa 50%,
    #3b82f6 75%,
    #2563eb 100%
  );
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
}

@keyframes gradientShift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.auth-pattern {
  position: absolute;
  inset: 0;
  opacity: 0.1;
  background-image:
    radial-gradient(circle at 25% 25%, white 2px, transparent 2px),
    radial-gradient(circle at 75% 75%, white 2px, transparent 2px);
  background-size: 60px 60px;
  z-index: 1;
}

.auth-container {
  position: relative;
  z-index: 2;
  min-height: 100vh;
  display: flex;
  align-items: center;
  padding: 24px;
}

.fill-height {
  min-height: 100%;
}

/* Slide Up Transition */
.slide-up-enter-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 1, 1);
}

.slide-up-enter-from {
  transform: translateY(30px);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

/* Responsive */
@media (max-width: 600px) {
  .auth-container {
    padding: 16px;
  }
}
</style>
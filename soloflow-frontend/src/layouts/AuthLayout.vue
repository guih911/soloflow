<template>
  <v-app>
    <v-main class="auth-background">
      <v-container fluid class="fill-height">
        <v-row align="center" justify="center" class="fill-height">
          <v-col cols="12" sm="8" md="6" lg="4">
            <transition name="slide-fade" mode="out-in">
              <router-view />
            </transition>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <!-- Snackbar global -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
      top
      right
    >
      {{ snackbar.message }}
      <template v-slot:actions>
        <v-btn
          variant="text"
          @click="snackbar.show = false"
        >
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

// Expor método global para mostrar snackbar
window.showSnackbar = (message, color = 'success') => {
  snackbar.message = message
  snackbar.color = color
  snackbar.show = true
}
</script>

<style scoped>
.auth-background {
  background: linear-gradient(135deg, #1976D2, #42A5F5);
  min-height: 100vh;
}
</style>
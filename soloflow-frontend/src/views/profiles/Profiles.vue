<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Perfis de Acesso</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Perfis definem o que os usuários podem fazer no sistema.
        </p>
      </div>
      <v-btn
        v-if="canManageProfiles"
        color="primary"
        prepend-icon="mdi-plus"
        @click="openCreateDialog"
      >
        Novo perfil
      </v-btn>
    </div>

    <v-card>
      <v-data-table
        :headers="headers"
        :items="filteredProfiles"
        :loading="profilesLoading"
        class="elevation-0"
        density="comfortable"
        item-key="id"
        hover
      >
        <template #top>
          <v-card-title class="d-flex align-center pe-2">
            <v-icon icon="mdi-account-key" class="mr-2"></v-icon>
            Lista de Perfis
            <v-spacer></v-spacer>
            <v-text-field
              v-model="search"
              density="compact"
              label="Buscar"
              prepend-inner-icon="mdi-magnify"
              variant="solo-filled"
              flat
              hide-details
              single-line
            />
          </v-card-title>
        </template>

        <template #item.company="{ item }">
          <v-chip
            v-if="item.companyId"
            size="small"
            variant="tonal"
            color="primary"
          >
            {{ getCompanyLabel(item.companyId) }}
          </v-chip>
          <span v-else class="text-caption text-medium-emphasis">
            Disponível para todas as empresas
          </span>
        </template>

        <template #item.isDefault="{ item }">
          <v-chip :color="item.isDefault ? 'primary' : 'grey'" size="small" variant="flat">
            {{ item.isDefault ? 'Padrão' : 'Não' }}
          </v-chip>
        </template>

        <template #item.screens="{ item }">
          <div class="text-body-2">
            <v-chip
              v-for="summary in summarizeScreens(item)"
              :key="summary"
              size="small"
              class="ma-1"
              color="blue-lighten-4"
              variant="tonal"
            >
              {{ summary }}
            </v-chip>
            <span v-if="!item.permissions?.length" class="text-medium-emphasis text-caption">
              Sem permissões de tela configuradas
            </span>
          </div>
        </template>

        <template #item.processTypes="{ item }">
          <div class="text-body-2">
            <v-chip
              v-for="summary in summarizeProcessTypes(item)"
              :key="summary"
              size="small"
              class="ma-1"
              color="green-lighten-4"
              variant="tonal"
            >
              {{ summary }}
            </v-chip>
            <span v-if="!item.processTypePermissions?.length" class="text-medium-emphasis text-caption">
              Sem regras específicas
            </span>
          </div>
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex ga-2">
            <v-tooltip text="Editar perfil">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-pencil"
                  size="small"
                  variant="text"
                  :disabled="!canManageProfiles"
                  @click="openEditDialog(item.id)"
                />
              </template>
            </v-tooltip>
            <v-tooltip text="Apagar perfil">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-delete"
                  size="small"
                  variant="text"
                  color="error"
                  :disabled="!canManageProfiles || item.isDefault"
                  @click="confirmRemove(item)"
                />
              </template>
            </v-tooltip>
          </div>
        </template>

        <template #no-data>
          <v-card-text class="text-center text-medium-emphasis py-10">
            Nenhum perfil cadastrado.
          </v-card-text>
        </template>
      </v-data-table>
    </v-card>

    <profile-form-dialog
      v-model="formDialogOpen"
      :profile="editingProfile"
      :process-types="processTypes"
      :loading="profilesLoading"
      @save="handleSaveProfile"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import ProfileFormDialog from './components/ProfileFormDialog.vue'
import { useProfileStore } from '@/stores/profiles'
import { useProcessTypeStore } from '@/stores/processTypes'
import { useCompanyStore } from '@/stores/company'
import { useAuthStore } from '@/stores/auth'
import { SCREEN_CATALOG } from '@/constants/permissions'

const authStore = useAuthStore()
const profileStore = useProfileStore()
const processTypeStore = useProcessTypeStore()
const companyStore = useCompanyStore()

const search = ref('')
const formDialogOpen = ref(false)
const editingProfile = ref(null)

const headers = [
  { title: 'Nome', key: 'name' },
  { title: 'Empresa', key: 'company', sortable: false },
  { title: 'Padrão', key: 'isDefault', align: 'center' },
  { title: 'Telas liberadas', key: 'screens', sortable: false },
  { title: 'Tipos de processo', key: 'processTypes', sortable: false },
  { title: 'Ações', key: 'actions', align: 'center', sortable: false },
]

const profiles = computed(() => profileStore.profiles || [])
const processTypes = computed(() => processTypeStore.processTypes || [])
const companies = computed(() => companyStore.companies || [])
const profilesLoading = computed(() => profileStore.loading)
const canManageProfiles = computed(() => authStore.hasPermission('profiles', 'manage'))

const filteredProfiles = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return profiles.value
  return profiles.value.filter((profile) => {
    const haystack = [
      profile.name,
      profile.description,
      summarizeScreens(profile).join(' '),
      summarizeProcessTypes(profile).join(' '),
      getCompanyLabel(profile.companyId),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(term)
  })
})

const screenCatalog = SCREEN_CATALOG

onMounted(async () => {
  try {
    await Promise.all([
      profileStore.fetchProfiles(),
      processTypeStore.fetchProcessTypes(),
      companyStore.fetchCompanies(),
    ])
  } catch (error) {
    console.error('Erro ao carregar perfis:', error)
    window.showSnackbar?.('Erro ao carregar perfis', 'error')
  }
})

function getCompanyLabel(companyId) {
  if (!companyId) return 'Global'
  const company = (companies.value || []).find((item) => item.id === companyId)
  return company?.name || 'Empresa desconhecida'
}

function summarizeScreens(profile) {
  const permissions = Array.isArray(profile.permissions) ? profile.permissions : []
  const grouped = new Map()

  permissions.forEach((permission) => {
    const screen = screenCatalog.find((item) => item.id === permission.resource)
    if (!screen) return

    const entry = grouped.get(screen.label) || new Set()
    entry.add(
      screen.actions.find((action) => action.id === permission.action)?.label ??
        permission.action,
    )
    grouped.set(screen.label, entry)
  })

  return Array.from(grouped.entries()).map(
    ([label, actions]) => `${label}: ${Array.from(actions).join(', ')}`,
  )
}

function summarizeProcessTypes(profile) {
  const permissions = Array.isArray(profile.processTypePermissions)
    ? profile.processTypePermissions
    : []

  if (!permissions.length) return []

  return permissions.map((permission) => {
    const label =
      permission.processTypeId === '*'
        ? 'Todos os tipos'
        : processTypes.value.find((type) => type.id === permission.processTypeId)?.name ||
          'Tipo desconhecido'

    const capabilities = []
    if (permission.canView) capabilities.push('Ver')
    if (permission.canCreate) capabilities.push('Criar')
    if (permission.canExecute) capabilities.push('Executar')

    return `${label}: ${capabilities.join(', ') || 'Sem ações'}`
  })
}

function openCreateDialog() {
  editingProfile.value = null
  formDialogOpen.value = true
}

async function openEditDialog(profileId) {
  try {
    const profile = await profileStore.fetchProfile(profileId)
    editingProfile.value = profile
    formDialogOpen.value = true
  } catch (error) {
    window.showSnackbar?.('Erro ao carregar dados do perfil.', 'error')
  }
}

async function handleSaveProfile({ id, payload }) {
  try {
    if (id) {
      await profileStore.updateProfile(id, payload)
      window.showSnackbar?.('Perfil atualizado com sucesso!', 'success')
    } else {
      await profileStore.createProfile(payload)
      window.showSnackbar?.('Perfil criado com sucesso!', 'success')
    }
    formDialogOpen.value = false
    editingProfile.value = null
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Erro ao salvar perfil.'
    window.showSnackbar?.(message, 'error')
  }
}

async function confirmRemove(profile) {
  if (!canManageProfiles.value) return
  if (profile.isDefault) {
    window.showSnackbar?.('Não é possível remover o perfil padrão.', 'warning')
    return
  }

  const confirmed = window.confirm(`Remover o perfil "${profile.name}"?`)
  if (!confirmed) return

  try {
    await profileStore.deleteProfile(profile.id)
    window.showSnackbar?.('Perfil removido com sucesso.', 'success')
  } catch (error) {
    const message = error.response?.data?.message || 'Erro ao remover perfil.'
    window.showSnackbar?.(message, 'error')
  }
}
</script>

import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

function normalizePermission(permission) {
  return {
    id: permission.id ?? null,
    resource: String(permission.resource || '').toLowerCase(),
    action: String(permission.action || '').toLowerCase(),
    scope: permission.scope ?? null,
    createdAt: permission.createdAt ? new Date(permission.createdAt) : null,
    updatedAt: permission.updatedAt ? new Date(permission.updatedAt) : null,
  }
}

function normalizeProcessTypePermission(permission) {
  return {
    id: permission.id ?? null,
    processTypeId: permission.processTypeId,
    canView: Boolean(permission.canView),
    canCreate: Boolean(permission.canCreate),
    canExecute: Boolean(permission.canExecute),
    processType: permission.processType ?? null,
    createdAt: permission.createdAt ? new Date(permission.createdAt) : null,
    updatedAt: permission.updatedAt ? new Date(permission.updatedAt) : null,
  }
}

function normalizeProfile(profile) {
  // Backend retorna profile_permissions e profile_process_types (nomes das tabelas)
  // Frontend usa permissions e processTypePermissions (camelCase)
  const permissions = profile.permissions || profile.profile_permissions || []
  const processTypePermissions = profile.processTypePermissions || profile.profile_process_types || []

  return {
    ...profile,
    permissions: Array.isArray(permissions)
      ? permissions.map(normalizePermission)
      : [],
    processTypePermissions: Array.isArray(processTypePermissions)
      ? processTypePermissions.map(normalizeProcessTypePermission)
      : [],
    assignments: profile.assignments ?? [],
    createdAt: profile.createdAt ? new Date(profile.createdAt) : null,
    updatedAt: profile.updatedAt ? new Date(profile.updatedAt) : null,
  }
}

export const useProfileStore = defineStore('profiles', () => {
  const profiles = ref([])
  const currentProfile = ref(null)
  const assignments = ref([])
  const loading = ref(false)
  const assignmentsLoading = ref(false)
  const error = ref(null)

  async function fetchProfiles() {
    loading.value = true
    error.value = null

    try {
      const response = await api.get('/profiles')
      profiles.value = Array.isArray(response.data)
        ? response.data.map(normalizeProfile)
        : []
      return profiles.value
    } catch (err) {
      console.error('Error fetching profiles:', err)
      error.value = err.response?.data?.message || 'Erro ao carregar perfis'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchProfile(id) {
    loading.value = true
    error.value = null

    try {
      const response = await api.get(`/profiles/${id}`)
      currentProfile.value = normalizeProfile(response.data)
      const index = profiles.value.findIndex((item) => item.id === id)
      if (index !== -1) {
        profiles.value[index] = currentProfile.value
      } else {
        profiles.value.push(currentProfile.value)
      }
      return currentProfile.value
    } catch (err) {
      console.error('Error fetching profile:', err)
      error.value = err.response?.data?.message || 'Erro ao carregar perfil'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createProfile(payload) {
    loading.value = true
    error.value = null

    try {
      const response = await api.post('/profiles', payload)
      const profile = normalizeProfile(response.data)
      profiles.value.push(profile)
      return profile
    } catch (err) {
      console.error('Error creating profile:', err)
      error.value = err.response?.data?.message || 'Erro ao criar perfil'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateProfile(id, payload) {
    loading.value = true
    error.value = null

    try {
      const response = await api.patch(`/profiles/${id}`, payload)
      const profile = normalizeProfile(response.data)
      const index = profiles.value.findIndex((item) => item.id === id)
      if (index !== -1) {
        profiles.value[index] = profile
      } else {
        profiles.value.push(profile)
      }
      currentProfile.value = profile
      return profile
    } catch (err) {
      console.error('Error updating profile:', err)
      error.value = err.response?.data?.message || 'Erro ao atualizar perfil'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteProfile(id) {
    loading.value = true
    error.value = null

    try {
      await api.delete(`/profiles/${id}`)
      profiles.value = profiles.value.filter((item) => item.id !== id)
      if (currentProfile.value?.id === id) {
        currentProfile.value = null
        assignments.value = []
      }
    } catch (err) {
      console.error('Error deleting profile:', err)
      error.value = err.response?.data?.message || 'Erro ao remover perfil'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchAssignments(profileId) {
    assignmentsLoading.value = true
    error.value = null

    try {
      const response = await api.get(`/profiles/${profileId}/users`)
      assignments.value = Array.isArray(response.data) ? response.data : []
      return assignments.value
    } catch (err) {
      console.error('Error fetching assignments:', err)
      error.value = err.response?.data?.message || 'Erro ao carregar usuários do perfil'
      throw err
    } finally {
      assignmentsLoading.value = false
    }
  }

  async function assignUser(profileId, userId, assignedBy) {
    assignmentsLoading.value = true
    error.value = null

    try {
      const response = await api.post(`/profiles/${profileId}/assign`, {
        userId,
        assignedBy,
      })
      const assigned = response.data
      await fetchAssignments(profileId)
      return assigned
    } catch (err) {
      console.error('Error assigning user to profile:', err)
      error.value = err.response?.data?.message || 'Erro ao vincular usuário ao perfil'
      throw err
    } finally {
      assignmentsLoading.value = false
    }
  }

  async function removeAssignment(profileId, userId) {
    assignmentsLoading.value = true
    error.value = null

    try {
      await api.delete(`/profiles/${profileId}/assign/${userId}`)
      assignments.value = assignments.value.filter((item) => item.userId !== userId)
    } catch (err) {
      console.error('Error removing assignment:', err)
      error.value = err.response?.data?.message || 'Erro ao remover usuário do perfil'
      throw err
    } finally {
      assignmentsLoading.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  function resetCurrent() {
    currentProfile.value = null
    assignments.value = []
  }

  return {
    profiles,
    currentProfile,
    assignments,
    loading,
    assignmentsLoading,
    error,
    fetchProfiles,
    fetchProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    fetchAssignments,
    assignUser,
    removeAssignment,
    clearError,
    resetCurrent,
  }
})

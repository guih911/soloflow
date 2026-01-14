/**
 * Utilitários de formatação e validação de campos
 */

// ==================== VALIDAÇÕES ====================

/**
 * Valida CPF
 * @param {string} value - CPF a ser validado
 * @returns {boolean} - True se válido
 */
export function validateCPF(value) {
  if (!value) return true // Vazio é válido (use required para obrigar)
  
  const cleaned = value.replace(/\D/g, '')
  if (cleaned.length !== 11) return false
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleaned)) return false
  
  // Validação dos dígitos verificadores
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i)
  }
  let digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(cleaned.charAt(9))) return false
  
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i)
  }
  digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(cleaned.charAt(10))) return false
  
  return true
}

/**
 * Valida CNPJ
 * @param {string} value - CNPJ a ser validado
 * @returns {boolean} - True se válido
 */
export function validateCNPJ(value) {
  if (!value) return true // Vazio é válido (use required para obrigar)
  
  const cleaned = value.replace(/\D/g, '')
  if (cleaned.length !== 14) return false
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cleaned)) return false
  
  // Validação dos dígitos verificadores
  let length = cleaned.length - 2
  let numbers = cleaned.substring(0, length)
  const digits = cleaned.substring(length)
  let sum = 0
  let pos = length - 7
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(0))) return false
  
  length = length + 1
  numbers = cleaned.substring(0, length)
  sum = 0
  pos = length - 7
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(1))) return false
  
  return true
}

/**
 * Valida Email
 * @param {string} value - Email a ser validado
 * @returns {boolean} - True se válido
 */
export function validateEmail(value) {
  if (!value) return true
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(value)
}

/**
 * Valida se é um número
 * @param {string} value - Valor a ser validado
 * @returns {boolean} - True se válido
 */
export function validateNumber(value) {
  if (!value) return true
  return !isNaN(value) && !isNaN(parseFloat(value))
}

/**
 * Valida telefone (formato brasileiro)
 * @param {string} value - Telefone a ser validado
 * @returns {boolean} - True se válido
 */
export function validatePhone(value) {
  if (!value) return true
  const cleaned = value.replace(/\D/g, '')
  return cleaned.length === 10 || cleaned.length === 11
}

// ==================== FORMATAÇÕES ====================

/**
 * Formata CPF enquanto digita
 * @param {string} value - Valor a ser formatado
 * @returns {string} - CPF formatado (000.000.000-00)
 */
export function formatCPF(value) {
  if (!value) return ''
  
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, '')
  
  // Limita a 11 dígitos
  const limited = numbers.slice(0, 11)
  
  // Aplica a máscara
  let formatted = limited
  if (limited.length > 9) {
    formatted = limited.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4')
  } else if (limited.length > 6) {
    formatted = limited.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3')
  } else if (limited.length > 3) {
    formatted = limited.replace(/(\d{3})(\d{0,3})/, '$1.$2')
  }
  
  return formatted
}

/**
 * Formata CNPJ enquanto digita
 * @param {string} value - Valor a ser formatado
 * @returns {string} - CNPJ formatado (00.000.000/0000-00)
 */
export function formatCNPJ(value) {
  if (!value) return ''
  
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, '')
  
  // Limita a 14 dígitos
  const limited = numbers.slice(0, 14)
  
  // Aplica a máscara
  let formatted = limited
  if (limited.length > 12) {
    formatted = limited.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5')
  } else if (limited.length > 8) {
    formatted = limited.replace(/(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4')
  } else if (limited.length > 5) {
    formatted = limited.replace(/(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3')
  } else if (limited.length > 2) {
    formatted = limited.replace(/(\d{2})(\d{0,3})/, '$1.$2')
  }
  
  return formatted
}

/**
 * Formata valor monetário enquanto digita
 * @param {string} value - Valor a ser formatado
 * @returns {string} - Valor formatado (R$ 1.234,56)
 */
export function formatCurrency(value) {
  if (!value) return ''
  
  // Remove tudo que não é dígito
  let numbers = value.replace(/\D/g, '')
  
  if (!numbers) return ''
  
  // Converte para número e divide por 100 (para ter os centavos)
  const amount = parseFloat(numbers) / 100
  
  // Formata como moeda brasileira
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

/**
 * Remove formatação de CPF
 * @param {string} value - CPF formatado
 * @returns {string} - Apenas números
 */
export function unformatCPF(value) {
  if (!value) return ''
  return value.replace(/\D/g, '')
}

/**
 * Remove formatação de CNPJ
 * @param {string} value - CNPJ formatado
 * @returns {string} - Apenas números
 */
export function unformatCNPJ(value) {
  if (!value) return ''
  return value.replace(/\D/g, '')
}

/**
 * Remove formatação de moeda
 * @param {string} value - Valor formatado
 * @returns {string} - Número sem formatação
 */
export function unformatCurrency(value) {
  if (!value) return ''
  
  // Remove R$, pontos e substitui vírgula por ponto
  const cleaned = value
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .trim()
  
  return cleaned
}

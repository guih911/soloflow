export function formatCNPJ(cnpj) {
  if (!cnpj) return ''
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

export function formatPhone(phone) {
  if (!phone) return ''
  return phone.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3')
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}
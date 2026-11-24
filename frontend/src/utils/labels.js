export const ROLE_LABELS = {
  admin: 'Админ',
  teacher: 'Учитель',
  storekeeper: 'Завхоз',
  administration: 'Администрация школы',
}

export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Админ' },
  { value: 'teacher', label: 'Учитель' },
  { value: 'storekeeper', label: 'Завхоз' },
  { value: 'administration', label: 'Администрация школы' },
]

export const RECIPIENT_LABELS = {
  admin: 'Админ',
  storekeeper: 'Завхоз',
}

export const statusLabel = (status, viewerRole, recipientGroup, asRecipient = false) => {
  if (status === 'sent') {
    return asRecipient || viewerRole === recipientGroup ? 'Не обработано' : 'Отправлено'
  }
  if (status === 'completed') return 'Выполнено'
  if (status === 'impossible') return 'Невозможно выполнить'
  return status
}

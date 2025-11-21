export function formatDate(dateString: string | Date): string {
  const date =
    typeof dateString === 'string' ? new Date(dateString) : dateString

  if (isNaN(date.getTime())) {
    return 'Invalid date'
  }

  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

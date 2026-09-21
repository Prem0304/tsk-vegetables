export function formatDateWithDay(dateStr?: string | null): string {
  if (!dateStr) return '';
  
  // Handle ISO string or YYYY-MM-DD
  let dateObj: Date;
  if (dateStr.includes('T')) {
    dateObj = new Date(dateStr);
  } else {
    // Append T00:00:00 to prevent timezone shift issues
    dateObj = new Date(`${dateStr}T00:00:00`);
  }

  if (isNaN(dateObj.getTime())) return dateStr;

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekdayName = weekdays[dateObj.getDay()];

  return `${day}/${month}/${year} (${weekdayName})`;
}

export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

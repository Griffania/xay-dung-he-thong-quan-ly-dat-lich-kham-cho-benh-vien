export const formatSlotTime = (isoTimeStr: string) => {
  try {
    const dateObj = new Date(isoTimeStr);
    const hours = String(dateObj.getUTCHours()).padStart(2, '0');
    const minutes = String(dateObj.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '';
  }
};

export const displayTimeRange = (start: string, end: string) => {
  return `${formatSlotTime(start)} - ${formatSlotTime(end)}`;
};

export const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    // If it's a date-only string like YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    }

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    // For ISO string that represents a pure date (e.g. ending in T00:00:00.000Z or similar)
    if (dateStr.includes('T00:00:00')) {
      const day = String(d.getUTCDate()).padStart(2, '0');
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const year = d.getUTCFullYear();
      return `${day}/${month}/${year}`;
    }

    // For general timestamp strings, display in local time
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};
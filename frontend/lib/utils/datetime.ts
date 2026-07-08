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
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
};
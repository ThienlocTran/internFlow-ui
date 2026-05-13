const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DISPLAY_DATE_PATTERN = /^(\d{2})-(\d{2})-(\d{4})$/;

export function formatDate(dateText?: string | null) {
  if (!dateText) return "";
  const value = dateText.slice(0, 10);
  if (!ISO_DATE_PATTERN.test(value)) return dateText;
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

export function formatDateRange(startDate?: string | null, endDate?: string | null) {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  return end ? `${start} - ${end}` : start;
}

export function parseDisplayDateToIso(value: string) {
  const text = value.trim();
  if (ISO_DATE_PATTERN.test(text)) return text;
  const match = DISPLAY_DATE_PATTERN.exec(text);
  if (!match) return "";
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

export function formatDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${day}-${month}-${year} ${hour}:${minute}`;
}

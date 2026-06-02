export function formatNumber(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value);
}

export function truncateText(value: string, maxLength = 40) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}...`;
}

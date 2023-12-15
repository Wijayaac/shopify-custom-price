export function truncate(str: string, { length = 25 } = {}) {
  if (!str) return "";
  if (str.length < length) return str;
  return str.slice(0, length) + "...";
}

export function generateRandomDiscountCode(): string {
  const length = 8;
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = length; i > 0; --i)
    result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

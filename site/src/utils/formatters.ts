export const formatAddress = (address?: string): string => {
  if (!address) return "";
  return `${address.slice(0, 5)}...${address.slice(-3)}`;
};

export const formatTimeLeft = (endTimeMs: number): string => {
  const now = Date.now();
  const diff = endTimeMs - now;

  if (diff <= 0) return "00:00:00";

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h`;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const formatTimeLeftShort = (endTimeMs: number): string => {
  const now = Date.now();
  const diff = endTimeMs - now;

  if (diff <= 0) return "0h 0m";

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`;
};

export const environment = {
  production: false,
  apiUrl: getApiUrl(),
  publicUrl: getPublicUrl(),
};

function getApiUrl(): string {
  const userAgent =
    typeof navigator !== "undefined" ? navigator.userAgent || "" : "";

  // Android emulator local bridge
  if (/Android/i.test(userAgent)) {
    return "http://10.0.2.2:5000";
  }

  // Web local backend
  return "http://localhost:5000";
}

function getPublicUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return "http://localhost:4200";
}

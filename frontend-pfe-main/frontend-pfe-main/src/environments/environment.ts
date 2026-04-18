export const environment = {
  production: false,
  apiUrl: getApiUrl(),
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

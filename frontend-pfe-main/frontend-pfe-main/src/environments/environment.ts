export const environment = {
  production: false,
  apiUrl: getApiUrl()
};

function getApiUrl(): string {

  const userAgent = navigator.userAgent || '';

  // 🤖 Android Emulator
  if (/Android/i.test(userAgent)) {
    return 'http://10.0.2.2:5000';
  }

  // 💻 Web (browser)
  return 'http://localhost:5000';
}
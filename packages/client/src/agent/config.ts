interface UrlConfig {
  dxApiUrl: string;
  manageUrl: string;
  idServiceUrl: string;
  apiBaseUrl: string;
}

export const PROD_URLS: UrlConfig = {
  dxApiUrl: 'https://api.dx.deepgram.com',
  manageUrl: 'https://manage.deepgram.com',
  idServiceUrl: 'https://id.dx.deepgram.com',
  apiBaseUrl: 'https://manage.deepgram.com',
};

export const STAGING_URLS: UrlConfig = {
  dxApiUrl: 'https://api.staging.dx.deepgram.com',
  manageUrl: 'https://manage.staging.deepgram.com',
  idServiceUrl: 'https://id.staging.dx.deepgram.com',
  apiBaseUrl: 'https://manage.staging.deepgram.com',
};

export function getUrlConfig(staging?: boolean): UrlConfig {
  return staging ? STAGING_URLS : PROD_URLS;
}

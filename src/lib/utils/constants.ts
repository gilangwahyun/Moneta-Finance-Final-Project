/********** Constants **********/
const APP_NAME = "Moneta Finance";
const APP_DESCRIPTION = "Personal finance tracker with offline-first architecture";

/********** Auth **********/
const AUTH_COOKIE_NAME = "moneta-auth-token";
const MIN_PASSWORD_LENGTH = 6;
export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 30;
export const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

/********** Sync **********/
const SYNC_DEBOUNCE_MS = 5000;
const SYNC_RETRY_DELAY_MS = 10000;

/********** Currency **********/
export const DEFAULT_CURRENCY = "IDR";
export const DEFAULT_LOCALE = "id-ID";

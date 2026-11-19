interface ImportMetaEnv {
  /** Client ID of the app's multi-tenant Entra app registration. Not a secret. */
  readonly VITE_ENTRA_CLIENT_ID?: string;
  /** Origin of the website, such as https://asrcompass.cloud. */
  readonly VITE_SITE_ORIGIN?: string;
  /** Origin of the app, such as https://app.asrcompass.cloud. */
  readonly VITE_APP_ORIGIN?: string;
}

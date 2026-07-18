export const supportedLocales = ["en", "ru", "de"] as const;
export type AppLocale = (typeof supportedLocales)[number];

export const localeCookieName = "mail_ninja_locale";

export const localeLabels: Record<AppLocale, string> = {
  en: "EN",
  ru: "RU",
  de: "DE"
};

const dictionaries = {
  en: {
    navDashboard: "Dashboard",
    navCampaigns: "Campaigns",
    navRecipients: "Recipients",
    navImports: "Imports",
    navSuppressions: "Suppressions",
    navEvents: "Events",
    navJobs: "Jobs",
    navSettings: "Settings",
    navProviderKeys: "Provider Keys",
    navAdmins: "Admins",
    navMenu: "Menu",
    authSignInTitle: "Sign in with your administrator account.",
    authEmail: "Email",
    authPassword: "Password",
    authSignIn: "Sign in",
    authInvalidCredentials: "Invalid email or password.",
    signOut: "Sign out",
    sendingDisabled: "Sending is disabled until provider credentials and sender settings are configured.",
    language: "Language"
  },
  ru: {
    navDashboard: "Дашборд",
    navCampaigns: "Кампании",
    navRecipients: "Получатели",
    navImports: "Импорты",
    navSuppressions: "Исключения",
    navEvents: "События",
    navJobs: "Задачи",
    navSettings: "Настройки",
    navProviderKeys: "Ключи",
    navAdmins: "Админы",
    navMenu: "Меню",
    authSignInTitle: "Войдите под учетной записью администратора.",
    authEmail: "Email",
    authPassword: "Пароль",
    authSignIn: "Войти",
    authInvalidCredentials: "Неверный email или пароль.",
    signOut: "Выйти",
    sendingDisabled: "Отправка отключена, пока не настроены ключи провайдера и отправитель.",
    language: "Язык"
  },
  de: {
    navDashboard: "Dashboard",
    navCampaigns: "Kampagnen",
    navRecipients: "Empfänger",
    navImports: "Importe",
    navSuppressions: "Sperrliste",
    navEvents: "Ereignisse",
    navJobs: "Jobs",
    navSettings: "Einstellungen",
    navProviderKeys: "Schlüssel",
    navAdmins: "Admins",
    navMenu: "Menü",
    authSignInTitle: "Melden Sie sich mit Ihrem Administratorkonto an.",
    authEmail: "E-Mail",
    authPassword: "Passwort",
    authSignIn: "Anmelden",
    authInvalidCredentials: "Ungültige E-Mail-Adresse oder ungültiges Passwort.",
    signOut: "Abmelden",
    sendingDisabled: "Der Versand ist deaktiviert, bis Provider-Zugangsdaten und Absender eingerichtet sind.",
    language: "Sprache"
  }
} as const;

export type TranslationKey = keyof (typeof dictionaries)["en"];

export function normalizeAppLocale(value: string | null | undefined): AppLocale {
  return supportedLocales.includes(value as AppLocale) ? (value as AppLocale) : "en";
}

export function translate(locale: AppLocale, key: TranslationKey) {
  return dictionaries[locale][key] ?? dictionaries.en[key];
}

"use client";

import { adaptiveGlassActive, adaptiveGlassCluster, adaptiveGlassItem } from "@/components/magic/adaptive-glass";
import { useLocale } from "@/components/locale-provider";
import { localeLabels, supportedLocales } from "@/lib/i18n";

export function LocaleSwitcher() {
  const { locale, setLocale, t } = useLocale();
  return (
    <div className={adaptiveGlassCluster("inline-flex items-center gap-1 rounded-full p-1")} aria-label={t("language")}>
      {supportedLocales.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLocale(item)}
          aria-pressed={locale === item}
          className={
            locale === item
              ? adaptiveGlassItem(adaptiveGlassActive("rounded-full px-2.5 py-1 text-xs font-semibold"))
              : adaptiveGlassItem("rounded-full px-2.5 py-1 text-xs font-semibold transition hover:bg-white/40")
          }
        >
          {localeLabels[item]}
        </button>
      ))}
    </div>
  );
}

export type VariantCandidate = {
  id: string;
  locale: string;
  recipientRole: string;
  isFallback: boolean;
};

export function resolveVariant(
  variants: VariantCandidate[],
  input: { locale?: string | null; role?: string | null; defaultLocale: string }
) {
  const locale = input.locale ?? input.defaultLocale;
  const role = input.role ?? "generic";
  return (
    variants.find((variant) => variant.locale === locale && variant.recipientRole === role) ??
    variants.find((variant) => variant.locale === locale && variant.recipientRole === "generic") ??
    variants.find((variant) => variant.locale === input.defaultLocale && variant.recipientRole === role) ??
    variants.find((variant) => variant.locale === input.defaultLocale && variant.recipientRole === "generic") ??
    variants.find((variant) => variant.isFallback) ??
    null
  );
}

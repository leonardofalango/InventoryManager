const MIN_EAN_LENGTH = 8;
const MAX_EAN_LENGTH = 16;
const EAN_VALIDATION_BYPASS_VALUES = ["1", "true", "yes", "on"];

export const isEanValidationBypassed = EAN_VALIDATION_BYPASS_VALUES.includes(
  String(import.meta.env.VITE_BYPASS_EAN_VALIDATION ?? "").toLowerCase(),
);

export function isValidEan(value: string): boolean {
  const normalized = value.trim();
  if (!normalized || normalized.length > MAX_EAN_LENGTH) return false;
  if (isEanValidationBypassed) return true;
  if (!/^[0-9]+$/.test(normalized)) return false;
  return (
    normalized.length >= MIN_EAN_LENGTH && normalized.length <= MAX_EAN_LENGTH
  );
}

export function getEanValidationMessage(value: string): string | null {
  const normalized = value?.trim() ?? "";
  if (!normalized) return "Informe o EAN.";
  if (normalized.length > MAX_EAN_LENGTH)
    return "EAN invalido. Use um codigo de ate 16 digitos.";
  if (isEanValidationBypassed) return null;
  if (!/^[0-9]+$/.test(normalized))
    return "EAN invalido. O codigo deve conter apenas numeros.";
  if (normalized.length < MIN_EAN_LENGTH)
    return "EAN invalido. Use um codigo entre 8 e 16 digitos.";
  return null;
}

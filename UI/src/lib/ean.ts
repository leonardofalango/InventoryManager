const EAN_LENGTHS = [13];

export function isValidEan(value: string): boolean {
  const normalized = value.trim();
  if (!/^[0-9]+$/.test(normalized)) return false;
  return EAN_LENGTHS.includes(normalized.length);
}

export function getEanValidationMessage(value: string): string | null {
  const normalized = value?.trim() ?? "";
  if (!normalized) return "Informe o EAN.";
  if (!/^[0-9]+$/.test(normalized))
    return "EAN inválido. O código deve conter apenas números.";
  if (!EAN_LENGTHS.includes(normalized.length))
    return "EAN inválido. Use um código 13 dígitos.";
  return null;
}

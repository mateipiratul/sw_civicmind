export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatChamber(chamber?: string | null) {
  if (!chamber) return "";
  if (chamber === "deputies") return "Camera Deputaților";
  if (chamber === "senate") return "Senat";
  return chamber;
}

export function pluralize(count: number, singular: string, plural: string, prepositionalPlural?: string) {
  if (count === 1) return singular;
  if (count === 0 || (count % 100 > 0 && count % 100 < 20)) return plural;
  return prepositionalPlural || `de ${plural}`;
}

export function pluralizeLege(count: number) {
  return pluralize(count, "lege", "legi", "de legi");
}

export function formatDate(date: string | null | undefined) {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString("ro-RO");
  } catch (e) {
    return "—";
  }
}

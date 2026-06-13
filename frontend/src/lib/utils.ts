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
  } catch {
    return "—";
  }
}

export function cleanText(text?: string | null): string {
  if (!text) return "";
  let result = text;
  
  // Replace literal '\n' string sequences with actual newline characters
  result = result.replace(/\\n/g, '\n');
  
  // Replace known Romanian Mojibake (Windows-1252 / ISO-8859-2 encoding artifacts)
  result = result
    .replace(/ĂŽ/g, 'Î')
    .replace(/Ă®/g, 'î')
    .replace(/Ă˘/g, 'â')
    .replace(/Ă‚/g, 'Â')
    .replace(/Äƒ/g, 'ă')
    .replace(/Ä‚/g, 'Ă')
    .replace(/È™/g, 'ș')
    .replace(/È˜/g, 'Ș')
    .replace(/È›/g, 'ț')
    .replace(/Èš/g, 'Ț')
    .replace(/ÅŸ/g, 'ș')
    .replace(/Åž/g, 'Ș')
    .replace(/Å£/g, 'ț')
    .replace(/Å¢/g, 'Ț')
    .replace(/ĹŁ/g, 'ț')
    .replace(/ĹŢ/g, 'Ț')
    .replace(/Ã®/g, 'î')
    .replace(/Ã¢/g, 'â')
    .replace(/Ã‚/g, 'Â')
    .replace(/ÃŽ/g, 'Î')
    .replace(/ĂŁ/g, 'ă');
    
  // Strip control characters that cause squares
  // eslint-disable-next-line no-control-regex
  result = result.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F\u00AD\u200B-\u200F\u2028-\u202F\uFEFF]/g, '');

  // Handle remaining single characters that are part of Mojibake
  result = result
    .replace(/Ä/g, 'ă')
    .replace(/Ĺ/g, 'ș');
    
  return result;
}

export function extractBillTitleAndBody(rawTitle?: string | null): { title: string; body: string } {
  if (!rawTitle) return { title: "", body: "" };
  let cleaned = cleanText(rawTitle);
  
  // Extract proper title if it contains metadata garbage
  const match = cleaned.match(/(?:titlu votat:|titlu:)\s*(.+?)(?=\s*rezultat vot|\s*consultati stenograma|\s*Forma adoptat[aăÄ]|\s*Forma pentru promulgare|$)/i);
  if (match && match[1]) {
    cleaned = match[1].trim();
  }

  // Replace newlines with spaces to display the FULL title and prevent it from being cut off
  const title = cleaned.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  
  return { title, body: "" };
}

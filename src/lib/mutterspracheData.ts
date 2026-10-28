// Build-time view of the two first-language files, in the small shape both pages hand to
// the browser: which languages exist, which drills each one gets, and which typical mistake
// (fehler-nach-sprache.json) a drill answers for that language. The Aussprache-Check and
// /kultur/fehler embed the same object, so a link built on one page resolves on the other.
import fehler from "../data/fehler-nach-sprache.json";
import drillData from "../data/aussprache-muttersprache.json";

export interface MutterspracheInfo {
  languages: { id: string; name: string; native: string; rtl?: boolean }[];
  /** language → drill ids, in the order they are offered */
  drills: Record<string, string[]>;
  /** language → drill → error id */
  errorFor: Record<string, Record<string, string>>;
}

export function mutterspracheInfo(): MutterspracheInfo {
  const drills = drillData.languages as Record<string, string[]>;
  const errorFor: MutterspracheInfo["errorFor"] = {};
  for (const l of fehler.languages) {
    for (const m of l.mistakes as { id?: string; drill?: string }[]) {
      // The first mistake that names a drill is the one a finding links to.
      if (m.id && m.drill) (errorFor[l.id] ??= {})[m.drill] ??= m.id;
    }
  }
  return {
    languages: fehler.languages.map((l) => ({ id: l.id, name: l.name, native: l.native, ...((l as { rtl?: boolean }).rtl ? { rtl: true } : {}) })),
    drills,
    errorFor,
  };
}

import { getCollection, type CollectionEntry } from "astro:content";

const fmt = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function quand(e: CollectionEntry<"evenements">): string {
  return (
    e.data.dateText ??
    (e.data.date ? fmt.format(e.data.date) : "Date à définir")
  );
}

export async function evenements() {
  const tous = await getCollection("evenements");
  const auj = new Date();
  auj.setUTCHours(0, 0, 0, 0);
  const datés = tous.filter((e) => e.data.date);
  const avenir = datés
    .filter((e) => e.data.date! >= auj)
    .sort((a, b) => a.data.date!.valueOf() - b.data.date!.valueOf());
  const passés = datés
    .filter((e) => e.data.date! < auj)
    .sort((a, b) => b.data.date!.valueOf() - a.data.date!.valueOf());
  return { avenir: [...avenir, ...tous.filter((e) => !e.data.date)], passés };
}

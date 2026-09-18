import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Agregação sob demanda (raw SQL com GROUP BY date_trunc), em vez de uma
 * tabela materializada. Uma tabela materializada exigiria um caminho de
 * escrita adicional — atualizar (ou um job agendado recalculando) a
 * agregação toda vez que um Click é inserido — só para evitar uma query
 * de leitura que, no volume de tráfego deste projeto (portfolio, sem
 * tráfego real), roda em milissegundos com o índice
 * `Click_linkId_timestamp_idx`. Prisma não expressa `date_trunc` em
 * `groupBy` (só agrupa por colunas reais, não por expressões), daí o
 * `$queryRaw` — a interpolação abaixo usa o tagged template do Prisma,
 * que parametriza os valores automaticamente (sem concatenar string).
 */

export const CLICK_STATS_DAYS = 7;

export interface DailyClickCount {
  date: string; // "YYYY-MM-DD", em UTC
  count: number;
}

function startOfUtcDay(date: Date): Date {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

function daysAgoUtc(days: number): Date {
  const date = startOfUtcDay(new Date());
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Preenche com 0 os dias sem clique, para o sparkline não "pular" buracos. */
function buildDailySeries(
  since: Date,
  days: number,
  countsByDay: Map<string, number>
): DailyClickCount[] {
  const series: DailyClickCount[] = [];

  for (let i = 0; i < days; i++) {
    const day = new Date(since);
    day.setUTCDate(day.getUTCDate() + i);
    const key = toDateKey(day);
    series.push({ date: key, count: countsByDay.get(key) ?? 0 });
  }

  return series;
}

/**
 * Busca a série diária de clicks (últimos `days` dias, incluindo hoje)
 * para vários links de uma vez — uma query só por página do dashboard,
 * em vez de uma por link.
 */
export async function getDailyClickCountsForLinks(
  linkIds: string[],
  days: number = CLICK_STATS_DAYS
): Promise<Map<string, DailyClickCount[]>> {
  const result = new Map<string, DailyClickCount[]>();
  if (linkIds.length === 0) return result;

  const since = daysAgoUtc(days - 1);

  const rows = await prisma.$queryRaw<{ linkId: string; day: Date; count: bigint }[]>`
    SELECT "linkId", date_trunc('day', "timestamp") AS day, COUNT(*)::bigint AS count
    FROM "Click"
    WHERE "linkId" IN (${Prisma.join(linkIds)}) AND "timestamp" >= ${since}
    GROUP BY "linkId", day
    ORDER BY "linkId", day ASC
  `;

  const countsByLinkAndDay = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const perDay = countsByLinkAndDay.get(row.linkId) ?? new Map<string, number>();
    perDay.set(toDateKey(row.day), Number(row.count));
    countsByLinkAndDay.set(row.linkId, perDay);
  }

  for (const linkId of linkIds) {
    result.set(
      linkId,
      buildDailySeries(since, days, countsByLinkAndDay.get(linkId) ?? new Map())
    );
  }

  return result;
}

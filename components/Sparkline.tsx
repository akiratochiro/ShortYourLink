type SparklineProps = {
  data: { date: string; count: number }[];
};

const BAR_WIDTH = 6;
const BAR_GAP = 2;
const HEIGHT = 24;

/**
 * Mini gráfico de barras em SVG puro — sem lib de charting nova só para
 * isso (projeto não tinha nenhuma até então; ver README).
 */
export default function Sparkline({ data }: SparklineProps) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const width = data.length * BAR_WIDTH + (data.length - 1) * BAR_GAP;

  return (
    <svg
      width={width}
      height={HEIGHT}
      viewBox={`0 0 ${width} ${HEIGHT}`}
      role="img"
      aria-label={`Cliques nos últimos ${data.length} dias`}
      className="shrink-0"
    >
      {data.map((day, index) => {
        const barHeight = Math.max(2, (day.count / max) * HEIGHT);
        const x = index * (BAR_WIDTH + BAR_GAP);
        const y = HEIGHT - barHeight;

        return (
          // Sem <title> aninhado: o React 19 hoisteia qualquer <title> da
          // árvore (mesmo dentro de SVG) para o <head> e deduplica com o
          // <title> real da página, esvaziando este aqui. aria-label por
          // barra mantém a informação acessível sem esbarrar nisso.
          <rect
            key={day.date}
            x={x}
            y={y}
            width={BAR_WIDTH}
            height={barHeight}
            rx={1}
            aria-label={`${day.date}: ${day.count} ${day.count === 1 ? "clique" : "cliques"}`}
            className={day.count > 0 ? "fill-lightblue" : "fill-border"}
          />
        );
      })}
    </svg>
  );
}

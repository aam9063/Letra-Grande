import { CostBlock } from "./CostBlock";
import { DeadlineBlock } from "./DeadlineBlock";
import { DocumentBlock } from "./DocumentBlock";
import { FactBlock } from "./FactBlock";
import { StepBlock } from "./StepBlock";
import { WarningBlock } from "./WarningBlock";
import type { BlockData, Fuentes } from "./types";

/**
 * Renderizador del catálogo cerrado de bloques (sección 5.6).
 * Despacha por `kind`. El texto se pinta como texto plano: el modelo nunca
 * escribe HTML ni markdown y aquí no se interpreta nunca.
 * `fuentes` es opcional: si se conoce una fuente, la cita se enlaza con su
 * título humano; si no, se muestra el `sourceId` como texto.
 */
export function BlockRenderer({
  blocks,
  fuentes,
}: {
  blocks: readonly BlockData[];
  fuentes?: Fuentes;
}) {
  return (
    <div className="lg-bloques">
      {blocks.map((bloque, i) => {
        switch (bloque.kind) {
          case "step":
            return <StepBlock key={i} block={bloque} fuentes={fuentes} />;
          case "document":
            return <DocumentBlock key={i} block={bloque} fuentes={fuentes} />;
          case "cost":
            return <CostBlock key={i} block={bloque} fuentes={fuentes} />;
          case "deadline":
            return <DeadlineBlock key={i} block={bloque} fuentes={fuentes} />;
          case "warning":
            return <WarningBlock key={i} block={bloque} fuentes={fuentes} />;
          case "fact":
            return <FactBlock key={i} block={bloque} fuentes={fuentes} />;
        }
      })}
    </div>
  );
}

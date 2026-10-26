import { CostBlock } from "./CostBlock";
import { DeadlineBlock } from "./DeadlineBlock";
import { DocumentBlock } from "./DocumentBlock";
import { FactBlock } from "./FactBlock";
import { StepBlock } from "./StepBlock";
import { WarningBlock } from "./WarningBlock";
import type { BlockData } from "./types";

/**
 * Renderizador del catálogo cerrado de bloques (sección 5.6).
 * Despacha por `kind`. El texto se pinta como texto plano: el modelo nunca
 * escribe HTML ni markdown y aquí no se interpreta nunca.
 */
export function BlockRenderer({ blocks }: { blocks: readonly BlockData[] }) {
  return (
    <div className="lg-bloques">
      {blocks.map((bloque, i) => {
        switch (bloque.kind) {
          case "step":
            return <StepBlock key={i} block={bloque} />;
          case "document":
            return <DocumentBlock key={i} block={bloque} />;
          case "cost":
            return <CostBlock key={i} block={bloque} />;
          case "deadline":
            return <DeadlineBlock key={i} block={bloque} />;
          case "warning":
            return <WarningBlock key={i} block={bloque} />;
          case "fact":
            return <FactBlock key={i} block={bloque} />;
        }
      })}
    </div>
  );
}

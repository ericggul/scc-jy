import type { CSSProperties } from "react";
import { VideoCell } from "../media";
import type { VideoFieldExperiment } from "../model/field";
import { gridOneExperiment } from "../experiments";
import styles from "../screen/grid.module.css";

type FieldProperties = CSSProperties & {
  "--columns": number;
  "--rows": number;
  "--grid-ratio": number;
  "--cell-gap": string;
  "--field-background": string;
};

export default function GridOne() {
  const experiment: VideoFieldExperiment = gridOneExperiment;
  const fieldStyle: FieldProperties = {
    "--columns": experiment.columns,
    "--rows": experiment.rows,
    "--grid-ratio": (experiment.columns * 9) / (experiment.rows * 16),
    "--cell-gap": `${experiment.gap}px`,
    "--field-background": experiment.background,
  };

  return (
    <main className={styles.page} style={fieldStyle}>
      <div className={styles.grid}>
        {experiment.cells.map((cell) => (
          <div className={styles.cell} key={cell.id}>
            <VideoCell cell={cell} />
          </div>
        ))}
      </div>
    </main>
  );
}

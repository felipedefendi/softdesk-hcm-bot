import styles from "./Toggle.module.css";

interface Props {
  ligado: boolean;
  onAlternar: () => void;
  ariaLabel: string;
  disabled?: boolean;
}

export function Toggle({ ligado, onAlternar, ariaLabel, disabled }: Props) {
  return (
    <label className={styles.toggle}>
      <input type="checkbox" checked={ligado} onChange={onAlternar} aria-label={ariaLabel} disabled={disabled} />
      <span className={styles.trilho} />
    </label>
  );
}

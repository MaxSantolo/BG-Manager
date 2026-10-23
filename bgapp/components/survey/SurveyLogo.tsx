/**
 * Piccolo logo geometrico dell'area sondaggi: un dado stilizzato fatto di forme
 * semplici (quadrato, cerchio, triangolo) nei toni del tema blu. Niente testo,
 * scala con `size`. Usa i token accent, quindi segue il tema .survey-theme.
 */
export default function SurveyLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="34" height="34" rx="9"
        fill="var(--accent-blue, #1f3a60)" stroke="var(--accent-red-light, #7fbaf6)" strokeWidth="2.5" />
      <circle cx="13" cy="13" r="3.4" fill="var(--accent-red-light, #7fbaf6)" />
      <circle cx="27" cy="13" r="3.4" fill="var(--accent-red-light, #7fbaf6)" />
      <path d="M20 22 l6 9 h-12 z" fill="var(--accent-red, #2f7fe0)" />
    </svg>
  );
}

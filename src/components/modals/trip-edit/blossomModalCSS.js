/**
 * Scoped CSS for the Blossom-themed TripEditModal.
 * Extracted from TripEditModal.jsx to reduce file size.
 */

export const blossomModalCSS = `
  /* ── Blossom Token Overrides ── */
  .blossom-modal-overlay {
    --blossom-primary: #834b58;
    --blossom-primary-dim: #75404c;
    --blossom-primary-container: #feb6c4;
    --blossom-on-primary: #ffeff0;
    --blossom-secondary: #71563d;
    --blossom-secondary-container: #fed9b8;
    --blossom-tertiary: #b60d3d;
    --blossom-surface: #fbf5f5;
    --blossom-surface-container: #ede7e7;
    --blossom-surface-container-low: #f5efef;
    --blossom-surface-container-high: #e7e1e1;
    --blossom-surface-lowest: #ffffff;
    --blossom-on-surface: #302e2e;
    --blossom-on-surface-variant: #5e5b5b;
    --blossom-outline: #797676;
    --blossom-outline-variant: #b1acac;

    /* Remap M3 tokens so child components (ClimateCard, DestinationInput) use blossom palette */
    --md-sys-color-primary: #834b58;
    --md-sys-color-primary-container: #feb6c4;
    --md-sys-color-on-primary-container: #3b1520;
    --md-sys-color-secondary-container: #fed9b8;
    --md-sys-color-on-secondary-container: #3d2e1c;
    --md-sys-color-surface: #fbf5f5;
    --md-sys-color-surface-container: #ede7e7;
    --md-sys-color-surface-container-low: #f5efef;
    --md-sys-color-surface-container-lowest: #ffffff;
    --md-sys-color-on-surface: #302e2e;
    --md-sys-color-on-surface-variant: #5e5b5b;
    --md-sys-color-outline-variant: #b1acac;
    --blossom-radius: 1rem;
    --blossom-radius-lg: 2rem;
    --blossom-radius-xl: 3rem;
    --blossom-font-headline: 'Plus Jakarta Sans', 'Manrope', sans-serif;
    --blossom-font-body: 'Be Vietnam Pro', 'Inter', 'Noto Sans SC', sans-serif;
  }

  /* ── Overlay ── */
  .blossom-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(48, 46, 46, 0.45);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    opacity: 0;
    transition: opacity 0.35s ease;
    padding: 1rem;
  }
  .blossom-modal-overlay.blossom-modal-visible {
    opacity: 1;
  }

  /* ── Shell ── */
  .blossom-modal-shell {
    position: relative;
    width: 100%;
    max-width: 860px;
    max-height: 92vh;
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--blossom-surface);
    border-radius: var(--blossom-radius-xl);
    box-shadow:
      0 24px 48px -12px rgba(131, 75, 88, 0.15),
      0 0 0 1px rgba(131, 75, 88, 0.06);
    transform: translateY(16px) scale(0.97);
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .blossom-modal-visible .blossom-modal-shell {
    transform: translateY(0) scale(1);
  }

  /* Scrollbar */
  .blossom-modal-shell::-webkit-scrollbar { width: 6px; }
  .blossom-modal-shell::-webkit-scrollbar-track { background: transparent; }
  .blossom-modal-shell::-webkit-scrollbar-thumb {
    background: var(--blossom-outline-variant);
    border-radius: 3px;
  }

  /* ── Close button ── */
  .blossom-close-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    z-index: 10;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--blossom-on-surface);
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(131, 75, 88, 0.1);
  }
  .blossom-close-btn:hover {
    background: var(--blossom-primary-container);
    color: var(--blossom-primary);
    transform: rotate(90deg);
  }

  /* ── Hero banner ── */
  .blossom-hero {
    position: relative;
    width: 100%;
    height: 180px;
    overflow: hidden;
    border-radius: var(--blossom-radius-xl) var(--blossom-radius-xl) 0 0;
    background:
      linear-gradient(135deg, #feb6c4 0%, #fce7f3 40%, #fbf5f5 100%);
  }
  .blossom-hero-gradient {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 20% 80%, rgba(131, 75, 88, 0.25) 0%, transparent 60%),
      radial-gradient(ellipse at 80% 20%, rgba(182, 13, 61, 0.12) 0%, transparent 50%);
  }
  .blossom-hero-content {
    position: absolute;
    bottom: 1.5rem;
    left: 2rem;
    right: 2rem;
  }
  .blossom-hero-title {
    font-family: var(--blossom-font-headline);
    font-size: 2rem;
    font-weight: 800;
    color: var(--blossom-primary);
    line-height: 1.1;
    margin: 0;
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.6);
  }
  .blossom-hero-sub {
    font-family: var(--blossom-font-body);
    font-size: 0.9rem;
    color: var(--blossom-on-surface-variant);
    margin: 0.35rem 0 0;
    font-style: italic;
    font-weight: 500;
  }

  /* ── Body grid ── */
  .blossom-body {
    display: grid;
    grid-template-columns: 1fr 280px;
    gap: 1.25rem;
    padding: 1.5rem 2rem 2rem;
  }

  /* ── Main form card ── */
  .blossom-card {
    background: var(--blossom-surface-lowest);
    border-radius: var(--blossom-radius-lg);
    padding: 2rem;
    box-shadow: 0 4px 16px -4px rgba(131, 75, 88, 0.08);
  }
  .blossom-form-fields {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  /* ── Edit mode title ── */
  .blossom-edit-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: var(--blossom-font-headline);
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--blossom-primary);
    margin: 0;
  }

  /* ── Field ── */
  .blossom-field { display: flex; flex-direction: column; gap: 0.4rem; }

  .blossom-label {
    font-family: var(--blossom-font-body);
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--blossom-primary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding-left: 2px;
  }

  /* ── Input ── */
  .blossom-input-wrap {
    position: relative;
  }
  .blossom-input {
    width: 100%;
    background: var(--blossom-surface-container-low);
    border: none;
    border-radius: 0.75rem;
    padding: 0.85rem 1rem;
    font-family: var(--blossom-font-body);
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--blossom-on-surface);
    outline: none;
    transition: all 0.2s;
    box-sizing: border-box;
  }
  .blossom-input::placeholder {
    color: var(--blossom-outline-variant);
    font-weight: 400;
  }
  .blossom-input:focus {
    background: var(--blossom-surface-lowest);
    box-shadow: 0 0 0 2px var(--blossom-primary-container);
  }
  .blossom-input-wrap .blossom-input { padding-right: 2.5rem; }
  .blossom-input-icon {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--blossom-outline-variant);
    font-size: 20px !important;
    pointer-events: none;
    transition: color 0.2s;
  }
  .blossom-input-wrap:focus-within .blossom-input-icon {
    color: var(--blossom-primary);
  }
  .blossom-date {
    color-scheme: light;
  }

  /* ── Status buttons ── */
  .blossom-status-group {
    display: flex;
    gap: 0.5rem;
  }
  .blossom-status-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    padding: 0.6rem 0.5rem;
    border-radius: var(--blossom-radius);
    border: 1.5px solid var(--blossom-surface-container-high);
    background: var(--blossom-surface-container-low);
    color: var(--blossom-on-surface-variant);
    font-family: var(--blossom-font-body);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .blossom-status-btn:hover {
    border-color: var(--blossom-primary-container);
    background: rgba(254, 182, 196, 0.15);
  }
  .blossom-status-btn.active {
    background: var(--blossom-primary);
    border-color: var(--blossom-primary);
    color: var(--blossom-on-primary);
    box-shadow: 0 4px 12px rgba(131, 75, 88, 0.25);
  }

  /* ── Dates row ── */
  .blossom-dates-row { display: flex; gap: 1rem; }

  /* ── Existing days alert ── */
  .blossom-days-alert {
    padding: 0.85rem 1rem;
    border-radius: 0.75rem;
    background: rgba(254, 217, 184, 0.25);
    border: 1px solid rgba(113, 86, 61, 0.2);
  }
  .blossom-days-alert-head {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.3rem;
  }
  .blossom-days-alert-title {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--blossom-secondary);
  }
  .blossom-days-alert-dates {
    font-size: 0.75rem;
    color: var(--blossom-on-surface-variant);
    margin-bottom: 0.5rem;
  }
  .blossom-days-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: var(--blossom-on-surface);
    cursor: pointer;
  }
  .blossom-days-checkbox input[type="checkbox"] {
    accent-color: var(--blossom-secondary);
    width: 15px;
    height: 15px;
  }

  /* ── Currency buttons ── */
  .blossom-currency-group {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .blossom-currency-btn {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.55rem 1rem;
    border-radius: 9999px;
    border: none;
    background: var(--blossom-surface-container-high);
    color: var(--blossom-primary);
    font-family: var(--blossom-font-body);
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .blossom-currency-btn:hover {
    background: rgba(254, 182, 196, 0.3);
  }
  .blossom-currency-btn.active {
    background: var(--blossom-primary);
    color: var(--blossom-on-primary);
    font-weight: 700;
    box-shadow: 0 4px 12px rgba(131, 75, 88, 0.2);
    transform: scale(1.02);
  }
  .blossom-currency-btn:active { transform: scale(0.95); }

  /* ── Cover Image toggle ── */
  .blossom-image-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: 1.5px dashed var(--blossom-outline-variant);
    border-radius: 0.75rem;
    padding: 0.7rem 1rem;
    color: var(--blossom-on-surface-variant);
    font-family: var(--blossom-font-body);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
  }
  .blossom-image-toggle:hover {
    border-color: var(--blossom-primary);
    color: var(--blossom-primary);
    background: rgba(254, 182, 196, 0.08);
  }
  .blossom-thumb-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--blossom-tertiary);
    margin-left: auto;
  }

  /* ── Image section ── */
  .blossom-image-section {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .blossom-search-row {
    display: flex;
    gap: 0.5rem;
  }
  .blossom-search-btn {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0 1rem;
    border: none;
    border-radius: 0.75rem;
    background: var(--blossom-primary);
    color: var(--blossom-on-primary);
    font-family: var(--blossom-font-body);
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .blossom-search-btn:hover { opacity: 0.9; }
  .blossom-search-btn:active { transform: scale(0.96); }

  .blossom-upload-area {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.6rem;
    border: 1.5px dashed var(--blossom-outline-variant);
    border-radius: 0.75rem;
    color: var(--blossom-on-surface-variant);
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .blossom-upload-area:hover {
    border-color: var(--blossom-primary);
    color: var(--blossom-primary);
    background: rgba(254, 182, 196, 0.08);
  }

  .blossom-image-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    max-height: 160px;
    overflow-y: auto;
  }
  .blossom-image-thumb {
    height: 64px;
    border-radius: 0.5rem;
    background-size: cover;
    background-position: center;
    cursor: pointer;
    border: 2.5px solid transparent;
    transition: all 0.2s;
  }
  .blossom-image-thumb:hover { opacity: 0.85; transform: scale(1.03); }
  .blossom-image-thumb.selected {
    border-color: var(--blossom-primary);
    box-shadow: 0 0 0 2px rgba(131, 75, 88, 0.2);
  }

  /* ── Actions ── */
  .blossom-actions {
    display: flex;
    gap: 0.75rem;
    padding-top: 0.5rem;
  }
  .blossom-cancel-btn {
    padding: 0.7rem 1.5rem;
    border-radius: 9999px;
    border: 1.5px solid var(--blossom-outline-variant);
    background: transparent;
    color: var(--blossom-on-surface-variant);
    font-family: var(--blossom-font-body);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .blossom-cancel-btn:hover {
    background: var(--blossom-surface-container-low);
    border-color: var(--blossom-outline);
  }
  .blossom-cancel-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .blossom-magic-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.85rem 1.5rem;
    border: none;
    border-radius: 9999px;
    background: linear-gradient(135deg, var(--blossom-primary), var(--blossom-primary-dim));
    color: var(--blossom-on-primary);
    font-family: var(--blossom-font-headline);
    font-size: 1.05rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 8px 24px -4px rgba(131, 75, 88, 0.3);
    transition: all 0.25s;
  }
  .blossom-magic-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px -4px rgba(131, 75, 88, 0.4);
  }
  .blossom-magic-btn:active { transform: translateY(0); }
  .blossom-magic-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
  .blossom-magic-icon { transition: transform 0.3s; }
  .blossom-magic-btn:hover .blossom-magic-icon { transform: rotate(12deg); }

  /* ── Tips column ── */
  .blossom-tips-col {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .blossom-tips-card {
    background: rgba(254, 217, 184, 0.2);
    border: 1px solid rgba(254, 217, 184, 0.4);
    border-radius: var(--blossom-radius);
    padding: 1.25rem;
  }
  .blossom-tips-title {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-family: var(--blossom-font-headline);
    font-size: 1rem;
    font-weight: 700;
    color: var(--blossom-secondary);
    margin: 0 0 0.75rem;
  }
  .blossom-tip-item {
    display: flex;
    gap: 0.6rem;
    margin-bottom: 0.75rem;
  }
  .blossom-tip-item:last-child { margin-bottom: 0; }
  .blossom-tip-icon {
    color: var(--blossom-secondary);
    font-size: 20px !important;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .blossom-tip-item p {
    margin: 0;
    font-size: 0.8rem;
    line-height: 1.5;
    color: var(--blossom-on-surface-variant);
    font-weight: 500;
  }

  /* ── Inspiration card ── */
  .blossom-inspo-card {
    position: relative;
    height: 130px;
    border-radius: var(--blossom-radius);
    overflow: hidden;
    background:
      linear-gradient(135deg, rgba(131, 75, 88, 0.12), rgba(254, 182, 196, 0.2));
  }
  .blossom-inspo-bg {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 70% 30%, rgba(182, 13, 61, 0.08) 0%, transparent 60%);
  }
  .blossom-inspo-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    height: 100%;
    padding: 1rem;
  }
  .blossom-inspo-tag {
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--blossom-primary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 0.25rem;
  }
  .blossom-inspo-title {
    font-family: var(--blossom-font-headline);
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--blossom-on-surface);
    margin: 0;
  }

  /* ── Stats card ── */
  .blossom-stats-card {
    background: var(--blossom-surface-container-low);
    border-radius: var(--blossom-radius);
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .blossom-stat-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .blossom-stat-label {
    flex: 1;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--blossom-on-surface-variant);
  }
  .blossom-stat-value {
    font-family: var(--blossom-font-headline);
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--blossom-primary);
  }

  /* ── Accordion (hidden on desktop, visible on mobile) ── */
  .blossom-accordion-header {
    display: none;  /* hidden on desktop */
  }
  .blossom-accordion-body {
    /* always visible on desktop — open/close class ignored */
  }
  .blossom-mobile-only {
    display: none;  /* hidden on desktop */
  }
  .blossom-desktop-only {
    display: block;  /* visible on desktop */
  }

  /* ── Responsive: collapse to single column ── */
  @media (max-width: 700px) {
    .blossom-modal-overlay {
      align-items: flex-end;
      padding: 0;
      padding-bottom: 72px; /* 底部导航栏高度 */
    }
    .blossom-modal-shell {
      max-width: 100%;
      max-height: calc(100vh - 72px);
      border-radius: var(--blossom-radius-lg) var(--blossom-radius-lg) 0 0;
    }
    .blossom-hero {
      height: 120px;
      border-radius: var(--blossom-radius-lg) var(--blossom-radius-lg) 0 0;
    }
    .blossom-hero-title { font-size: 1.5rem; }
    .blossom-body {
      grid-template-columns: 1fr;
      padding: 1rem 1.25rem 1.5rem;
      gap: 1rem;
    }
    .blossom-card { padding: 1.25rem; }
    .blossom-tips-col { display: none; }
    .blossom-dates-row { flex-direction: column; gap: 0.75rem; }
    .blossom-status-group { flex-wrap: wrap; }

    /* Accordion — visible on mobile */
    .blossom-accordion-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.7rem 0.85rem;
      background: rgba(131, 75, 88, 0.06);
      border: none;
      border-left: 3px solid var(--blossom-primary);
      border-radius: 0.5rem;
      cursor: pointer;
      font-family: var(--blossom-font-body);
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--blossom-on-surface);
      transition: background 0.2s;
    }
    .blossom-accordion-header:hover {
      background: rgba(131, 75, 88, 0.1);
    }
    .blossom-accordion-body {
      display: none;
      padding: 0.6rem 0 0;
    }
    .blossom-accordion-body.open {
      display: block;
    }
    .blossom-mobile-only {
      display: block;
    }
    .blossom-desktop-only {
      display: none;
    }
  }
`;

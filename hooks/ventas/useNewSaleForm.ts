import { useSaleHostessLogic } from './useSaleHostessLogic';
import { useSaleValidation } from './useSaleValidation';

/**
 * Thin orchestrator that composes useSaleHostessLogic and useSaleValidation.
 * Original 663-line monolith now split into focused hooks:
 * - useSaleHostessLogic: product rules (pure functions) + hostess selection state
 * - useSaleValidation: form state, search, totals, validation, submit
 */
export const useNewSaleForm = () => {
  // ── Hostess selection state ─────────────────────────────────────────
  const hostessSelections = useSaleHostessLogic();

  // ── Form state + handlers ───────────────────────────────────────────
  const { formState, ...handlers } = useSaleValidation({
    onClearSearch: () => {
      hostessSelections.setHostessSearchValues({});
    }
  });

  return {
    // Form state
    ...formState,
    // Handlers
    ...handlers,
    // Hostess selection state
    ...hostessSelections,
    // Product rules (for external use, re-exported from formState)
    isChampagneProduct: formState.isChampagne
  };
};

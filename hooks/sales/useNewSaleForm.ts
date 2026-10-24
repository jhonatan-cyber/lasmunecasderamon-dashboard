import { useSaleHostessLogic } from './useSaleHostessLogic';
import { useSaleValidation } from './useSaleValidation';

export const useNewSaleForm = () => {
  const hostessSelections = useSaleHostessLogic();
  const { formState, ...handlers } = useSaleValidation({
    onClearSearch: () => {
      hostessSelections.setHostessSearchValues({});
    }
  });

  return {
    ...formState,
    ...handlers,
    ...hostessSelections,
    isChampagneProduct: formState.isChampagne
  };
};

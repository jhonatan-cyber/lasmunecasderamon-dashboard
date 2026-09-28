export {
  OrderForm,
  ServiceOrderFormNew,
  OrderTotalHeader,
  CategoryProductsModal,
  HostessMultiSelect
} from './forms';
export { default as CustomerSelect } from '../shared/selects/CustomerSelect';
export { default as OrderDetailModal } from './OrderDetailModal';
export {
  OrderDetailInfoPanel,
  OrderDetailPaymentPanel,
  OrderDetailTotalsSummary,
  getOrderRoomId,
  getOrderRoomName
} from './detail';
export {
  isChampagneProduct,
  hasCommission,
  getHostessLimit,
  getChampagneHostessLimit,
  getExplicitMaxAnfitrionas,
  getActiveHostesses,
  getAssignedHostessIds,
  computeOrderHostessLimit,
  isExpensiveDrink,
  expensiveDrinkThreshold,
  setExpensiveDrinkThreshold,
  cardSplitVenta,
  cardSplitPropina,
  setCardSplit,
  getCardSplit
} from './productModalRules';

import { Search, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  CUENTA_TABLE_CARD_CLASS,
  CUENTA_TABLE_CELL_CLASS,
  CUENTA_TABLE_CLASS,
  CUENTA_TABLE_HEAD_CLASS,
  CUENTA_TABLE_HEADER_CLASS,
  CUENTA_TABLE_HEADER_ROW_CLASS,
  CUENTA_TABLE_ROW_CLASS
} from '@/components/cuentas/tables/cuentaTableStyles';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import HostessMultiSelect from '@/components/orders/HostessMultiSelect';
import IndividualHostessSelect from '@/components/shared/selects/IndividualHostessSelect';

interface NewSaleSearchProps {
  searchProducto: string;
  setSearchProducto: (val: string) => void;
  handleClearSearch: () => void;
  searchLoading: boolean;
  searchResults: any[];
  anfitrionas: any[];
  champagneHostessSelections: { [key: string]: string[] };
  handleChampagneHostessChange: (id: string, ids: string[]) => void;
  hostessSearchValues: { [key: string]: string };
  setHostessSearchValues: any;
  otherProductHostessSelections: { [key: string]: string[] };
  handleOtherProductHostessChange: (id: string, val: string[]) => void;
  handleAddProducto: (p: any) => void;
  isChampagneProduct: (p: any) => boolean;
}

export const NewSaleSearch = ({
  searchProducto,
  setSearchProducto,
  handleClearSearch,
  searchLoading,
  searchResults,
  anfitrionas,
  champagneHostessSelections,
  handleChampagneHostessChange,
  hostessSearchValues,
  setHostessSearchValues,
  otherProductHostessSelections,
  handleOtherProductHostessChange,
  handleAddProducto,
  isChampagneProduct
}: NewSaleSearchProps) => {
  return (
    <div className='space-y-4'>
      <div className='flex flex-col sm:flex-row items-center justify-center gap-2 mb-4'>
        <div className='relative w-full max-w-xs'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4' />
          <Input
            placeholder='Buscar Producto'
            value={searchProducto}
            onChange={e => setSearchProducto(e.target.value)}
            className='pl-10 pr-20 py-2 text-sm sm:text-base rounded-full'
          />
          <Button
            variant='outline'
            className='absolute bg-black text-white right-0 top-1/2 -translate-y-1/2 text-xs sm:text-sm rounded-full'
          >
            Buscar
          </Button>
        </div>
        {searchProducto && (
          <Button
            variant='outline'
            size='sm'
            className='rounded-full px-4 bg-black text-white'
            onClick={handleClearSearch}
          >
            <X className='mr-1' /> Limpiar
          </Button>
        )}
      </div>

      {searchProducto && (
        <div className={`mb-4 ${CUENTA_TABLE_CARD_CLASS}`}>
          <div className='overflow-x-auto'>
            <Table className={CUENTA_TABLE_CLASS}>
              <TableHeader className={CUENTA_TABLE_HEADER_CLASS}>
                <TableRow className={CUENTA_TABLE_HEADER_ROW_CLASS}>
                  <TableHead className={CUENTA_TABLE_HEAD_CLASS}>PRODUCTO</TableHead>
                  <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>PRECIO</TableHead>
                  <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>
                    COMISIÓN
                  </TableHead>
                  <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center text-xs`}>
                    CATEGORÍA
                  </TableHead>
                  <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>
                    ANFITRIONA
                  </TableHead>
                  <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>
                    AGREGAR
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className={`${CUENTA_TABLE_CELL_CLASS} text-center py-4`}
                    >
                      Buscando...
                    </TableCell>
                  </TableRow>
                ) : searchResults.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className={`${CUENTA_TABLE_CELL_CLASS} text-center py-4 text-gray-400`}
                    >
                      No hay resultados
                    </TableCell>
                  </TableRow>
                ) : (
                  searchResults.map((producto, idx) => {
                    const id = String(producto.id_producto || producto.id);
                    const isChampagne = isChampagneProduct(producto);
                    const hasComm = (producto.comision || producto.commission || 0) > 0;
                    return (
                      <TableRow key={idx} className={CUENTA_TABLE_ROW_CLASS}>
                        <TableCell className={CUENTA_TABLE_CELL_CLASS}>{producto.nombre}</TableCell>
                        <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
                          {formatCurrencyNoDecimals(producto.precio)}
                        </TableCell>
                        <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
                          {formatCurrencyNoDecimals(producto.comision || 0)}
                        </TableCell>
                        <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center text-xs`}>
                          {producto.categoria}
                        </TableCell>
                        <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
                          {hasComm ? (
                            isChampagne ? (
                              <HostessMultiSelect
                                anfitrionas={anfitrionas.filter(
                                  h => h.status === 1 || h.status === 2
                                )}
                                value={champagneHostessSelections[id] || []}
                                onChange={ids => handleChampagneHostessChange(id, ids)}
                                searchValue={hostessSearchValues[id] || ''}
                                onSearchChange={val =>
                                  setHostessSearchValues((prev: any) => ({ ...prev, [id]: val }))
                                }
                                maxSelection={
                                  Number(producto.precio) >= 240000
                                    ? 5
                                    : Number(producto.precio) >= 120000
                                      ? 2
                                      : 1
                                }
                              />
                            ) : (
                              <IndividualHostessSelect
                                anfitrionas={anfitrionas.filter(
                                  h => h.status === 1 || h.status === 2
                                )}
                                value={otherProductHostessSelections[id]?.[0] || ''}
                                onChange={val =>
                                  handleOtherProductHostessChange(id, val ? [val] : [])
                                }
                              />
                            )
                          ) : (
                            <span className='text-gray-400 text-xs'>Sin comisión</span>
                          )}
                        </TableCell>
                        <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
                          <Button
                            size='icon'
                            className='bg-black text-white rounded-full hover:scale-110 transition-all duration-200'
                            onClick={() =>
                              handleAddProducto({
                                ...producto,
                                selectedHostesses: isChampagne
                                  ? champagneHostessSelections[id] || []
                                  : otherProductHostessSelections[id] || []
                              })
                            }
                            disabled={
                              hasComm &&
                              ((isChampagne && !champagneHostessSelections[id]?.length) ||
                                (!isChampagne && !otherProductHostessSelections[id]?.length))
                            }
                          >
                            <Plus className='w-4 h-4' />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};

import React from "react";
import { Button } from "@/components/ui/button";

interface PaginateProps {
    page: number;
    totalPages: number;
    setPage: (page: number) => void;
}

const Paginate: React.FC<PaginateProps> = ({ page, totalPages, setPage }) => {
    return (
        <div className="flex justify-center items-center gap-2 sm:gap-3 mt-4 sm:mt-5">
            <Button
                size="sm"
                variant="outline"
                className="rounded-full px-3 sm:px-6 py-2 bg-black text-white hover:scale-110 transition-all duration-200 text-xs sm:text-sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
            >
                Anterior
            </Button>
            <span className="text-xs sm:text-sm text-gray-600 px-2 sm:px-4">
                Página {page} de {totalPages || 1}
            </span>
            <Button
                size="sm"
                variant="outline"
                className="rounded-full px-3 sm:px-6 py-2 bg-black text-white hover:scale-110 transition-all duration-200 text-xs sm:text-sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages || totalPages === 0}
            >
                Siguiente
            </Button>
        </div>
    );
};

export default Paginate;
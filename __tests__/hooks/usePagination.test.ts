import { renderHook, act } from '@testing-library/react'
import { usePagination } from '@/hooks/usePagination'

describe('usePagination Hook', () => {
  const mockData = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }))

  it('returns correct initial state', () => {
    const { result } = renderHook(() => usePagination(mockData))

    expect(result.current.pagination.currentPage).toBe(1)
    expect(result.current.pagination.totalPages).toBe(3) // 25 items / 10 per page
    expect(result.current.pagination.totalItems).toBe(25)
    expect(result.current.pagination.itemsPerPage).toBe(10)
    expect(result.current.paginatedData).toHaveLength(10)
  })

  it('paginates data correctly', () => {
    const { result } = renderHook(() => usePagination(mockData))

    // First page should have items 1-10
    expect(result.current.paginatedData[0].id).toBe(1)
    expect(result.current.paginatedData[9].id).toBe(10)

    // Go to second page
    act(() => {
      result.current.controls.goToPage(2)
    })

    // Second page should have items 11-20
    expect(result.current.paginatedData[0].id).toBe(11)
    expect(result.current.paginatedData[9].id).toBe(20)
  })

  it('handles navigation controls', () => {
    const { result } = renderHook(() => usePagination(mockData))

    // Test next page
    act(() => {
      result.current.controls.nextPage()
    })
    expect(result.current.pagination.currentPage).toBe(2)

    // Test previous page
    act(() => {
      result.current.controls.previousPage()
    })
    expect(result.current.pagination.currentPage).toBe(1)

    // Test go to first page
    act(() => {
      result.current.controls.goToPage(3)
      result.current.controls.goToFirstPage()
    })
    expect(result.current.pagination.currentPage).toBe(1)

    // Test go to last page
    act(() => {
      result.current.controls.goToLastPage()
    })
    expect(result.current.pagination.currentPage).toBe(3)
  })

  it('changes items per page correctly', () => {
    const { result } = renderHook(() => usePagination(mockData))

    act(() => {
      result.current.controls.setItemsPerPage(5)
    })

    expect(result.current.pagination.itemsPerPage).toBe(5)
    expect(result.current.pagination.totalPages).toBe(5) // 25 items / 5 per page
    expect(result.current.pagination.currentPage).toBe(1) // Should reset to first page
    expect(result.current.paginatedData).toHaveLength(5)
  })

  it('calculates visible pages correctly', () => {
    const { result } = renderHook(() => usePagination(mockData, { maxVisiblePages: 3 }))

    // With 25 items and 10 per page = 3 pages, should show all pages
    expect(result.current.visiblePages).toEqual([1, 2, 3])

    // Test with more pages
    const largeData = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }))
    const { result: result2 } = renderHook(() => usePagination(largeData, { maxVisiblePages: 5 }))

    // Should show first 5 pages
    expect(result2.current.visiblePages).toEqual([1, 2, 3, 4, 5])
  })

  it('handles edge cases', () => {
    // Empty data
    const { result: emptyResult } = renderHook(() => usePagination([]))
    expect(emptyResult.current.pagination.totalPages).toBe(0)
    expect(emptyResult.current.paginatedData).toHaveLength(0)

    // Single page
    const smallData = Array.from({ length: 5 }, (_, i) => ({ id: i + 1 }))
    const { result: smallResult } = renderHook(() => usePagination(smallData))
    expect(smallResult.current.pagination.totalPages).toBe(1)
    expect(smallResult.current.paginatedData).toHaveLength(5)
  })

  it('prevents invalid page navigation', () => {
    const { result } = renderHook(() => usePagination(mockData))

    // Try to go to page 0
    act(() => {
      result.current.controls.goToPage(0)
    })
    expect(result.current.pagination.currentPage).toBe(1)

    // Try to go to page beyond total pages
    act(() => {
      result.current.controls.goToPage(10)
    })
    expect(result.current.pagination.currentPage).toBe(1)

    // Try to go to previous page when on first page
    act(() => {
      result.current.controls.previousPage()
    })
    expect(result.current.pagination.currentPage).toBe(1)

    // Try to go to next page when on last page
    act(() => {
      result.current.controls.goToLastPage()
      result.current.controls.nextPage()
    })
    expect(result.current.pagination.currentPage).toBe(3)
  })

  it('updates pagination state when data changes', () => {
    const { result, rerender } = renderHook(
      ({ data }) => usePagination(data),
      { initialProps: { data: mockData } }
    )

    expect(result.current.pagination.totalItems).toBe(25)

    // Change data
    const newData = Array.from({ length: 50 }, (_, i) => ({ id: i + 1 }))
    rerender({ data: newData })

    expect(result.current.pagination.totalItems).toBe(50)
    expect(result.current.pagination.totalPages).toBe(5) // 50 items / 10 per page
  })
}) 
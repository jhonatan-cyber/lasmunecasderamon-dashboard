import React from 'react'
import { render, screen, fireEvent } from '@/lib/test-utils'
import { Pagination } from '@/components/ui/Pagination'

describe('Pagination Component', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 5,
    totalItems: 50,
    itemsPerPage: 10,
    visiblePages: [1, 2, 3, 4, 5],
    onPageChange: jest.fn(),
    onItemsPerPageChange: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders pagination controls', () => {
    render(<Pagination {...defaultProps} />)
    
    expect(screen.getByText('Mostrar:')).toBeInTheDocument()
    expect(screen.getByText('50 elementos')).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 5')).toBeInTheDocument()
  })

  it('shows correct page buttons', () => {
    render(<Pagination {...defaultProps} />)
    
    // Check if page buttons are rendered
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('calls onPageChange when page button is clicked', () => {
    const onPageChange = jest.fn()
    render(<Pagination {...defaultProps} onPageChange={onPageChange} />)
    
    fireEvent.click(screen.getByText('2'))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('calls onItemsPerPageChange when items per page is changed', () => {
    const onItemsPerPageChange = jest.fn()
    render(<Pagination {...defaultProps} onItemsPerPageChange={onItemsPerPageChange} />)
    
    const select = screen.getByRole('combobox')
    fireEvent.click(select)
    
    const option20 = screen.getByText('20')
    fireEvent.click(option20)
    
    expect(onItemsPerPageChange).toHaveBeenCalledWith(20)
  })

  it('disables previous buttons when on first page', () => {
    render(<Pagination {...defaultProps} currentPage={1} />)
    
    const prevButton = screen.getByLabelText('Página anterior')
    const firstButton = screen.getByLabelText('Ir a la primera página')
    
    expect(prevButton).toBeDisabled()
    expect(firstButton).toBeDisabled()
  })

  it('disables next buttons when on last page', () => {
    render(<Pagination {...defaultProps} currentPage={5} />)
    
    const nextButton = screen.getByLabelText('Página siguiente')
    const lastButton = screen.getByLabelText('Ir a la última página')
    
    expect(nextButton).toBeDisabled()
    expect(lastButton).toBeDisabled()
  })

  it('does not render when totalPages is 1', () => {
    const { container } = render(<Pagination {...defaultProps} totalPages={1} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows correct current page as active', () => {
    render(<Pagination {...defaultProps} currentPage={3} />)
    
    const page3Button = screen.getByText('3')
    expect(page3Button).toHaveClass('bg-primary')
  })

  it('handles single item correctly', () => {
    render(<Pagination {...defaultProps} totalItems={1} />)
    
    expect(screen.getByText('1 elemento')).toBeInTheDocument()
  })

  it('can hide items per page selector', () => {
    render(<Pagination {...defaultProps} showItemsPerPage={false} />)
    
    expect(screen.queryByText('Mostrar:')).not.toBeInTheDocument()
  })

  it('can hide total items count', () => {
    render(<Pagination {...defaultProps} showTotalItems={false} />)
    
    expect(screen.queryByText('50 elementos')).not.toBeInTheDocument()
  })
}) 
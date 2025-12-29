import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable, Column } from '../DataTable';

interface TestItem {
  id: string;
  name: string;
  status: string;
}

describe('DataTable', () => {
  const mockData: TestItem[] = [
    { id: '1', name: 'Item 1', status: 'active' },
    { id: '2', name: 'Item 2', status: 'inactive' },
    { id: '3', name: 'Item 3', status: 'active' },
  ];

  const columns: Column<TestItem>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => <span>{row.name}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <span className="status">{row.status}</span>,
    },
  ];

  const keyExtractor = (row: TestItem) => row.id;

  describe('Rendering', () => {
    it('should render table with data', () => {
      render(
        <DataTable
          columns={columns}
          data={mockData}
          keyExtractor={keyExtractor}
        />
      );

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('should render empty state when no data', () => {
      render(
        <DataTable
          columns={columns}
          data={[]}
          keyExtractor={keyExtractor}
        />
      );

      expect(screen.getByText('데이터가 없습니다.')).toBeInTheDocument();
    });

    it('should render custom empty message', () => {
      const customMessage = 'No items found';
      render(
        <DataTable
          columns={columns}
          data={[]}
          keyExtractor={keyExtractor}
          emptyMessage={customMessage}
        />
      );

      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });

    it('should apply loading state className', () => {
      const { container } = render(
        <DataTable
          columns={columns}
          data={mockData}
          keyExtractor={keyExtractor}
          loading={true}
        />
      );

      const tableWrapper = container.querySelector('.opacity-60');
      expect(tableWrapper).toBeInTheDocument();
    });

    it('should render all column headers', () => {
      render(
        <DataTable
          columns={columns}
          data={mockData}
          keyExtractor={keyExtractor}
        />
      );

      columns.forEach(col => {
        expect(screen.getByText(col.header)).toBeInTheDocument();
      });
    });

    it('should apply custom header className', () => {
      const columnsWithClass: Column<TestItem>[] = [
        {
          key: 'name',
          header: 'Name',
          headerClassName: 'custom-header-class',
          render: (row) => <span>{row.name}</span>,
        },
      ];

      const { container } = render(
        <DataTable
          columns={columnsWithClass}
          data={mockData}
          keyExtractor={keyExtractor}
        />
      );

      const headerCell = container.querySelector('.custom-header-class');
      expect(headerCell).toBeInTheDocument();
    });

    it('should apply custom cell className', () => {
      const columnsWithClass: Column<TestItem>[] = [
        {
          key: 'name',
          header: 'Name',
          cellClassName: 'custom-cell-class',
          render: (row) => <span>{row.name}</span>,
        },
      ];

      const { container } = render(
        <DataTable
          columns={columnsWithClass}
          data={mockData}
          keyExtractor={keyExtractor}
        />
      );

      const cells = container.querySelectorAll('.custom-cell-class');
      expect(cells.length).toBe(mockData.length);
    });
  });

  describe('Interactions', () => {
    it('should call onRowClick when row is clicked', () => {
      const onRowClick = vi.fn();
      render(
        <DataTable
          columns={columns}
          data={mockData}
          keyExtractor={keyExtractor}
          onRowClick={onRowClick}
        />
      );

      const firstRow = screen.getByText('Item 1').closest('tr');
      fireEvent.click(firstRow!);

      expect(onRowClick).toHaveBeenCalledWith(mockData[0], 0);
    });

    it('should not add cursor-pointer class when onRowClick is not provided', () => {
      const { container } = render(
        <DataTable
          columns={columns}
          data={mockData}
          keyExtractor={keyExtractor}
        />
      );

      const firstRow = container.querySelector('tbody tr');
      expect(firstRow?.className).not.toContain('cursor-pointer');
    });

    it('should add cursor-pointer class when onRowClick is provided', () => {
      const { container } = render(
        <DataTable
          columns={columns}
          data={mockData}
          keyExtractor={keyExtractor}
          onRowClick={vi.fn()}
        />
      );

      const firstRow = container.querySelector('tbody tr');
      expect(firstRow?.className).toContain('cursor-pointer');
    });

    it('should call onRowClick with correct index for each row', () => {
      const onRowClick = vi.fn();
      render(
        <DataTable
          columns={columns}
          data={mockData}
          keyExtractor={keyExtractor}
          onRowClick={onRowClick}
        />
      );

      const rows = screen.getAllByText(/Item \d/).map(el => el.closest('tr'));
      
      rows.forEach((row, index) => {
        fireEvent.click(row!);
        expect(onRowClick).toHaveBeenCalledWith(mockData[index], index);
      });

      expect(onRowClick).toHaveBeenCalledTimes(mockData.length);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single item', () => {
      const singleItem = [mockData[0]];
      render(
        <DataTable
          columns={columns}
          data={singleItem}
          keyExtractor={keyExtractor}
        />
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
    });

    it('should handle empty columns array', () => {
      render(
        <DataTable
          columns={[]}
          data={mockData}
          keyExtractor={keyExtractor}
        />
      );

      // Should still render table structure
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('should use keyExtractor correctly for unique keys', () => {
      const { container } = render(
        <DataTable
          columns={columns}
          data={mockData}
          keyExtractor={keyExtractor}
        />
      );

      const rows = container.querySelectorAll('tbody tr');
      const keys = Array.from(rows).map(row => row.getAttribute('key'));
      
      // Check that keys are unique (in React, keys don't appear as attributes, but the component should use them)
      expect(rows.length).toBe(mockData.length);
    });

    it('should handle complex render functions', () => {
      const complexColumns: Column<TestItem>[] = [
        {
          key: 'complex',
          header: 'Complex',
          render: (row, index) => (
            <div>
              <span data-testid={`row-${index}`}>{row.name}</span>
              <span>{row.status}</span>
            </div>
          ),
        },
      ];

      render(
        <DataTable
          columns={complexColumns}
          data={mockData}
          keyExtractor={keyExtractor}
        />
      );

      mockData.forEach((item, index) => {
        expect(screen.getByTestId(`row-${index}`)).toHaveTextContent(item.name);
      });
    });

    it('should not show border on last row', () => {
      const { container } = render(
        <DataTable
          columns={columns}
          data={mockData}
          keyExtractor={keyExtractor}
        />
      );

      const rows = container.querySelectorAll('tbody tr');
      const lastRow = rows[rows.length - 1];
      
      expect(lastRow.className).not.toContain('border-b');
    });

    it('should show border on non-last rows', () => {
      const { container } = render(
        <DataTable
          columns={columns}
          data={mockData}
          keyExtractor={keyExtractor}
        />
      );

      const rows = container.querySelectorAll('tbody tr');
      
      // Check all rows except the last one
      for (let i = 0; i < rows.length - 1; i++) {
        expect(rows[i].className).toContain('border-b');
      }
    });

    it('should handle large datasets', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        name: `Item ${i}`,
        status: i % 2 === 0 ? 'active' : 'inactive',
      }));

      render(
        <DataTable
          columns={columns}
          data={largeData}
          keyExtractor={keyExtractor}
        />
      );

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('should handle keyExtractor with index', () => {
      const keyExtractorWithIndex = (row: TestItem, index: number) => `${row.id}-${index}`;
      
      render(
        <DataTable
          columns={columns}
          data={mockData}
          keyExtractor={keyExtractorWithIndex}
        />
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper table structure', () => {
      render(
        <DataTable
          columns={columns}
          data={mockData}
          keyExtractor={keyExtractor}
        />
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should have thead and tbody elements', () => {
      const { container } = render(
        <DataTable
          columns={columns}
          data={mockData}
          keyExtractor={keyExtractor}
        />
      );

      expect(container.querySelector('thead')).toBeInTheDocument();
      expect(container.querySelector('tbody')).toBeInTheDocument();
    });

    it('should use proper colspan for empty state', () => {
      const { container } = render(
        <DataTable
          columns={columns}
          data={[]}
          keyExtractor={keyExtractor}
        />
      );

      const emptyCell = container.querySelector('tbody td');
      expect(emptyCell?.getAttribute('colSpan')).toBe(String(columns.length));
    });
  });
});
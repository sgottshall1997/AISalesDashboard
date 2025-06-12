import { createContext, useContext, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataTableContextType {
  data: any[];
  columns: Column[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  sortConfig: SortConfig | null;
  setSortConfig: (config: SortConfig | null) => void;
}

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
  width?: string;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

const DataTableContext = createContext<DataTableContextType | null>(null);

function useDataTableContext() {
  const context = useContext(DataTableContext);
  if (!context) {
    throw new Error("DataTable components must be used within DataTable.Root");
  }
  return context;
}

// Root compound component
function DataTableRoot({ 
  data, 
  columns, 
  pageSize = 10, 
  className,
  children 
}: {
  data: any[];
  columns: Column[];
  pageSize?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const contextValue: DataTableContextType = {
    data,
    columns,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    pageSize,
    sortConfig,
    setSortConfig,
  };

  return (
    <DataTableContext.Provider value={contextValue}>
      <Card className={cn("p-6 space-y-4", className)}>
        {children}
      </Card>
    </DataTableContext.Provider>
  );
}

// Header with search and actions
function DataTableHeader({ children }: { children?: React.ReactNode }) {
  const { searchTerm, setSearchTerm } = useDataTableContext();

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

// Table content
function DataTableContent() {
  const { 
    data, 
    columns, 
    searchTerm, 
    currentPage, 
    pageSize, 
    sortConfig, 
    setSortConfig 
  } = useDataTableContext();

  // Filter data based on search term
  const filteredData = data.filter(row =>
    columns.some(column => {
      const value = row[column.key];
      return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
    })
  );

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0;
    
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Paginate data
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);

  const handleSort = (columnKey: string) => {
    setSortConfig(current => {
      if (current?.key === columnKey) {
        return current.direction === 'asc' 
          ? { key: columnKey, direction: 'desc' }
          : null;
      }
      return { key: columnKey, direction: 'asc' };
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  "text-left py-3 px-4 font-medium text-sm text-muted-foreground",
                  column.sortable && "cursor-pointer hover:text-foreground",
                  column.width && `w-${column.width}`
                )}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center gap-2">
                  {column.label}
                  {column.sortable && (
                    <div className="flex flex-col">
                      <div className={cn(
                        "w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent",
                        sortConfig?.key === column.key && sortConfig.direction === 'asc'
                          ? "border-b-foreground"
                          : "border-b-muted-foreground/30"
                      )} />
                      <div className={cn(
                        "w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent mt-1",
                        sortConfig?.key === column.key && sortConfig.direction === 'desc'
                          ? "border-t-foreground"
                          : "border-t-muted-foreground/30"
                      )} />
                    </div>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((row, index) => (
            <tr key={index} className="border-b hover:bg-muted/50">
              {columns.map((column) => (
                <td key={column.key} className="py-3 px-4">
                  {column.render 
                    ? column.render(row[column.key], row)
                    : row[column.key]
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      {paginatedData.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No data found
        </div>
      )}
    </div>
  );
}

// Pagination footer
function DataTableFooter() {
  const { 
    data, 
    searchTerm, 
    currentPage, 
    setCurrentPage, 
    pageSize, 
    columns 
  } = useDataTableContext();

  // Filter data for accurate pagination
  const filteredData = data.filter(row =>
    columns.some(column => {
      const value = row[column.key];
      return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
    })
  );

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, filteredData.length);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        Showing {startIndex} to {endIndex} of {filteredData.length} results
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        
        <span className="text-sm">
          Page {currentPage} of {totalPages}
        </span>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Export compound component
export const DataTable = {
  Root: DataTableRoot,
  Header: DataTableHeader,
  Content: DataTableContent,
  Footer: DataTableFooter,
};

// Helper components for common use cases
export function StatusBadge({ status }: { status: string }) {
  const getVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'paid':
      case 'completed':
        return 'default';
      case 'pending':
      case 'in progress':
        return 'secondary';
      case 'overdue':
      case 'failed':
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Badge variant={getVariant(status)}>
      {status}
    </Badge>
  );
}

export function ActionButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick}>
      {children}
    </Button>
  );
}
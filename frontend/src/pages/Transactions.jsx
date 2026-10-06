import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Download, Printer, X } from 'lucide-react';
import {
  transactionsApi,
  projectsApi,
  categoriesApi,
} from '@/lib/api';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { formatDateTime, formatINR } from '@/lib/format';
import {
  exportToExcel,
  exportToPDF,
  printReport,
} from '@/lib/exporters';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Transactions() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [projectId, setProjectId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  const { data: projects = [] } = useQuery({
    queryKey: ['projs-all'],
    queryFn: projectsApi.all,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-all'],
    queryFn: categoriesApi.all,
  });

  const { data } = useQuery({
    queryKey: [
      'transactions',
      {
        page,
        search,
        type,
        projectId,
        categoryId,
        from,
        to,
        sortBy,
        sortDir,
      },
    ],
    queryFn: () =>
      transactionsApi.list({
        page,
        pageSize: 15,
        search: search || undefined,
        type: type || undefined,
        projectId: projectId || undefined,
        categoryId: categoryId || undefined,
        from: from || undefined,
        to: to || undefined,
        sortBy,
        sortDir,
      }),
  });

  /*
   * TAXABLE AMOUNT
   * Unit Cost × Quantity + Transportation Charges
   */
  const getTaxableAmount = (r) => {
    if (r.type !== 'IN') return 0;

    const unitCost = Number(r.unitCost || 0);
    const quantity = Number(r.quantity || 0);
    const transportation = Number(
      r.transportationCharges || 0
    );

    return unitCost * quantity + transportation;
  };

  /*
   * CGST + SGST
   *
   * For CGST transactions:
   * gstPercentage = SGST percentage
   * cgstPercentage = CGST percentage
   */
  const getSgstPercentage = (r) =>
    r.type === 'IN' && r.gstType === 'CGST'
      ? Number(r.gstPercentage || 0)
      : 0;

  const getCgstPercentage = (r) =>
    r.type === 'IN' && r.gstType === 'CGST'
      ? Number(
          r.cgstPercentage ??
            r.gstPercentage ??
            0
        )
      : 0;

  /*
   * IGST
   */
  const getIgstPercentage = (r) =>
    r.type === 'IN' && r.gstType === 'IGST'
      ? Number(r.gstPercentage || 0)
      : 0;

  /*
   * UTGST
   */
  const getUtgstPercentage = (r) =>
    r.type === 'IN' && r.gstType === 'UTGST'
      ? Number(r.gstPercentage || 0)
      : 0;

  /*
   * GST AMOUNTS
   */
  const getSgstAmount = (r) =>
    getTaxableAmount(r) *
    getSgstPercentage(r) /
    100;

  const getCgstAmount = (r) =>
    r.type === 'IN' && r.gstType === 'CGST'
      ? Number(
          r.cgstAmount ??
            (
              getTaxableAmount(r) *
              getCgstPercentage(r) /
              100
            )
        )
      : 0;

  const getIgstAmount = (r) =>
    r.type === 'IN' && r.gstType === 'IGST'
      ? getTaxableAmount(r) *
        getIgstPercentage(r) /
        100
      : 0;

  const getUtgstAmount = (r) =>
    r.type === 'IN' && r.gstType === 'UTGST'
      ? getTaxableAmount(r) *
        getUtgstPercentage(r) /
        100
      : 0;

  /*
   * TOTAL GST
   *
   * If backend has gstAmount, use it.
   * Otherwise calculate from individual GST components.
   */
  const getTotalGstAmount = (r) => {
    if (r.type !== 'IN') return 0;

    if (r.gstAmount != null) {
      return Number(r.gstAmount);
    }

    return (
      getCgstAmount(r) +
      getSgstAmount(r) +
      getIgstAmount(r) +
      getUtgstAmount(r)
    );
  };

  const columns = [
    {
      key: 'type',
      header: 'Type',
      cell: (r) =>
        r.type === 'IN' ? (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border font-normal font-mono">
            IN
          </Badge>
        ) : (
          <Badge className="bg-red-50 text-red-700 border-red-200 border font-normal font-mono">
            OUT
          </Badge>
        ),
    },

    {
      key: 'date',
      header: 'Date',
      sortable: true,
      cell: (r) => (
        <span className="text-zinc-800">
          {formatDateTime(r.date)}
        </span>
      ),
    },

    {
      key: 'product',
      header: 'Product',
      cell: (r) => (
        <div>
          <div className="font-medium text-zinc-900">
            {r.product?.name || '—'}
          </div>

          <div className="text-xs text-muted-foreground font-mono">
            {r.product?.sku}
          </div>
        </div>
      ),
    },

    {
      key: 'project',
      header: 'Project / Vendor',
      cell: (r) =>
        r.type === 'OUT'
          ? r.project?.name || (
              <span className="text-muted-foreground text-xs">
                —
              </span>
            )
          : r.supplier?.name || (
              <span className="text-muted-foreground text-xs">
                —
              </span>
            ),
    },

    {
      key: 'vendorGstNumber',
      header: 'Vendor GSTIN',
      cell: (r) =>
        r.type === 'IN' &&
        r.supplier?.gstNumber ? (
          <span className="font-mono text-xs">
            {r.supplier.gstNumber}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">
            —
          </span>
        ),
    },

    {
      key: 'quantity',
      header: 'Qty',
      sortable: true,
      cell: (r) => (
        <span
          className={`font-mono font-semibold ${
            r.type === 'IN'
              ? 'text-emerald-600'
              : 'text-red-600'
          }`}
        >
          {r.type === 'IN' ? '+' : '−'}
          {r.quantity}
        </span>
      ),
    },

    /*
     * STOCK OUT PERSON
     */
    {
      key: 'stockOutBy',
      header: 'Stock Out By',
      cell: (r) =>
        r.type === 'OUT' &&
        r.stockOutBy ? (
          <span className="text-sm">
            {r.stockOutBy}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">
            —
          </span>
        ),
    },

    /*
     * PURCHASE PRICE
     */
    {
      key: 'unitCost',
      header: 'Unit Cost',
      cell: (r) =>
        r.type === 'IN' &&
        r.unitCost != null ? (
          <span className="font-mono text-sm">
            {formatINR(r.unitCost)}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">
            —
          </span>
        ),
    },

    /*
     * TAXABLE AMOUNT
     */
    {
      key: 'taxableAmount',
      header: 'Taxable Amount',
      cell: (r) =>
        r.type === 'IN' ? (
          <span className="font-mono text-sm">
            {formatINR(
              getTaxableAmount(r)
            )}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">
            —
          </span>
        ),
    },

    /*
     * GST TYPE
     */
    {
      key: 'gstType',
      header: 'GST Type',
      cell: (r) =>
        r.type === 'IN' &&
        r.gstType ? (
          <Badge
            variant="outline"
            className="font-normal font-mono"
          >
            {r.gstType === 'CGST'
              ? 'CGST + SGST'
              : r.gstType}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">
            —
          </span>
        ),
    },

    /*
     * CGST %
     */
    {
      key: 'cgstPercentage',
      header: 'CGST %',
      cell: (r) =>
        getCgstPercentage(r) > 0 ? (
          <span className="font-mono text-sm">
            {getCgstPercentage(r)}%
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">
            —
          </span>
        ),
    },

    /*
     * CGST AMOUNT
     */
    {
      key: 'cgstAmount',
      header: 'CGST',
      cell: (r) =>
        getCgstAmount(r) > 0 ? (
          <span className="font-mono text-sm">
            {formatINR(
              getCgstAmount(r)
            )}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">
            —
          </span>
        ),
    },

    /*
     * SGST %
     */
    {
      key: 'sgstPercentage',
      header: 'SGST %',
      cell: (r) =>
        getSgstPercentage(r) > 0 ? (
          <span className="font-mono text-sm">
            {getSgstPercentage(r)}%
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">
            —
          </span>
        ),
    },

    /*
     * SGST AMOUNT
     */
    {
      key: 'sgstAmount',
      header: 'SGST',
      cell: (r) =>
        getSgstAmount(r) > 0 ? (
          <span className="font-mono text-sm">
            {formatINR(
              getSgstAmount(r)
            )}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">
            —
          </span>
        ),
    },

    /*
     * IGST %
     */
    {
      key: 'igstPercentage',
      header: 'IGST %',
      cell: (r) =>
        getIgstPercentage(r) > 0 ? (
          <span className="font-mono text-sm">
            {getIgstPercentage(r)}%
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">
            —
          </span>
        ),
    },

    /*
     * IGST AMOUNT
     */
    {
      key: 'igstAmount',
      header: 'IGST',
      cell: (r) =>
        getIgstAmount(r) > 0 ? (
          <span className="font-mono text-sm">
            {formatINR(
              getIgstAmount(r)
            )}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">
            —
          </span>
        ),
    },

    /*
     * UTGST %
     */
    {
      key: 'utgstPercentage',
      header: 'UTGST %',
      cell: (r) =>
        getUtgstPercentage(r) > 0 ? (
          <span className="font-mono text-sm">
            {getUtgstPercentage(r)}%
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">
            —
          </span>
        ),
    },

    /*
     * UTGST AMOUNT
     */
    {
      key: 'utgstAmount',
      header: 'UTGST',
      cell: (r) =>
        getUtgstAmount(r) > 0 ? (
          <span className="font-mono text-sm">
            {formatINR(
              getUtgstAmount(r)
            )}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">
            —
          </span>
        ),
    },

    /*
     * TOTAL GST
     */
    {
      key: 'gstAmount',
      header: 'Total GST',
      cell: (r) =>
        r.type === 'IN' ? (
          <span className="font-mono text-sm font-medium">
            {formatINR(
              getTotalGstAmount(r)
            )}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">
            —
          </span>
        ),
    },

    /*
     * TRANSPORTATION
     */
    {
      key: 'transportationCharges',
      header: 'Transportation',
      cell: (r) =>
        r.type === 'IN' &&
        Number(
          r.transportationCharges || 0
        ) > 0 ? (
          <span className="font-mono text-sm">
            {formatINR(
              r.transportationCharges
            )}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">
            —
          </span>
        ),
    },

    /*
     * FINAL PRICE
     */
    {
      key: 'totalAmount',
      header: 'Total Price',
      cell: (r) =>
        r.type === 'IN' &&
        r.totalAmount != null ? (
          <span className="font-mono text-sm font-semibold text-emerald-600">
            {formatINR(
              r.totalAmount
            )}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">
            —
          </span>
        ),
    },

    {
      key: 'note',
      header: 'Note',
      cell: (r) => (
        <span className="text-muted-foreground text-xs">
          {r.note || '—'}
        </span>
      ),
    },
  ];

  /*
   * EXCEL EXPORT
   */
  const exportCols = [
    {
      header: 'Date',
      accessor: (r) =>
        formatDateTime(r.date),
    },

    {
      header: 'Type',
      accessor: 'type',
    },

    {
      header: 'Product SKU',
      accessor: (r) =>
        r.product?.sku || '',
    },

    {
      header: 'Product',
      accessor: (r) =>
        r.product?.name || '',
    },

    {
      header: 'Project',
      accessor: (r) =>
        r.project?.name || '',
    },

    {
      header: 'Vendor',
      accessor: (r) =>
        r.supplier?.name || '',
    },

    {
      header: 'Vendor GSTIN',
      accessor: (r) =>
        r.type === 'IN'
          ? r.supplier?.gstNumber || ''
          : '',
    },

    {
      header: 'Stock Out By',
      accessor: (r) =>
        r.type === 'OUT'
          ? r.stockOutBy || ''
          : '',
    },

    {
      header: 'Quantity',
      accessor: 'quantity',
    },

    {
      header: 'Unit Cost',
      accessor: (r) =>
        r.type === 'IN'
          ? r.unitCost ?? ''
          : '',
    },

    {
      header: 'Taxable Amount',
      accessor: (r) =>
        r.type === 'IN'
          ? getTaxableAmount(r)
          : '',
    },

    {
      header: 'GST Type',
      accessor: (r) =>
        r.type === 'IN'
          ? (
              r.gstType === 'CGST'
                ? 'CGST + SGST'
                : r.gstType || ''
            )
          : '',
    },

    {
      header: 'CGST Percentage',
      accessor: (r) =>
        getCgstPercentage(r) || '',
    },

    {
      header: 'CGST Amount',
      accessor: (r) =>
        getCgstAmount(r) || '',
    },

    {
      header: 'SGST Percentage',
      accessor: (r) =>
        getSgstPercentage(r) || '',
    },

    {
      header: 'SGST Amount',
      accessor: (r) =>
        getSgstAmount(r) || '',
    },

    {
      header: 'IGST Percentage',
      accessor: (r) =>
        getIgstPercentage(r) || '',
    },

    {
      header: 'IGST Amount',
      accessor: (r) =>
        getIgstAmount(r) || '',
    },

    {
      header: 'UTGST Percentage',
      accessor: (r) =>
        getUtgstPercentage(r) || '',
    },

    {
      header: 'UTGST Amount',
      accessor: (r) =>
        getUtgstAmount(r) || '',
    },

    {
      header: 'Total GST',
      accessor: (r) =>
        r.type === 'IN'
          ? getTotalGstAmount(r)
          : '',
    },

    {
      header: 'Transportation Charges',
      accessor: (r) =>
        r.type === 'IN'
          ? Number(
              r.transportationCharges || 0
            )
          : '',
    },

    {
      header: 'Total Price',
      accessor: (r) =>
        r.type === 'IN'
          ? r.totalAmount ?? ''
          : '',
    },

    {
      header: 'Reference',
      accessor: (r) =>
        r.reference || '',
    },

    {
      header: 'Note',
      accessor: (r) =>
        r.note || '',
    },
  ];

  /*
   * PRINT REPORT
   */
  const handlePrint = () => {
    const rows = (
      data?.items || []
    ).map((r) => [
      formatDateTime(r.date),

      r.type,

      r.product?.sku || '',

      r.product?.name || '',

      r.type === 'OUT'
        ? r.project?.name || '—'
        : r.supplier?.name || '—',

      r.type === 'IN'
        ? r.supplier?.gstNumber || '—'
        : '—',

      r.type === 'OUT'
        ? r.stockOutBy || '—'
        : '—',

      r.quantity,

      r.type === 'IN' &&
      r.unitCost != null
        ? formatINR(r.unitCost)
        : '—',

      r.type === 'IN'
        ? formatINR(
            getTaxableAmount(r)
          )
        : '—',

      r.type === 'IN'
        ? (
            r.gstType === 'CGST'
              ? 'CGST + SGST'
              : r.gstType || '—'
          )
        : '—',

      getCgstPercentage(r) > 0
        ? `${getCgstPercentage(r)}%`
        : '—',

      getCgstAmount(r) > 0
        ? formatINR(
            getCgstAmount(r)
          )
        : '—',

      getSgstPercentage(r) > 0
        ? `${getSgstPercentage(r)}%`
        : '—',

      getSgstAmount(r) > 0
        ? formatINR(
            getSgstAmount(r)
          )
        : '—',

      getIgstPercentage(r) > 0
        ? `${getIgstPercentage(r)}%`
        : '—',

      getIgstAmount(r) > 0
        ? formatINR(
            getIgstAmount(r)
          )
        : '—',

      getUtgstPercentage(r) > 0
        ? `${getUtgstPercentage(r)}%`
        : '—',

      getUtgstAmount(r) > 0
        ? formatINR(
            getUtgstAmount(r)
          )
        : '—',

      r.type === 'IN'
        ? formatINR(
            getTotalGstAmount(r)
          )
        : '—',

      r.type === 'IN' &&
      Number(
        r.transportationCharges || 0
      ) > 0
        ? formatINR(
            r.transportationCharges
          )
        : '—',

      r.type === 'IN' &&
      r.totalAmount != null
        ? formatINR(
            r.totalAmount
          )
        : '—',

      r.reference || '',

      r.note || '',
    ]);

    printReport(
      'Transactions Report',
      [
        'Date',
        'Type',
        'SKU',
        'Product',
        'Project/Vendor',
        'Vendor GSTIN',
        'Stock Out By',
        'Qty',
        'Unit Cost',
        'Taxable Amount',
        'GST Type',
        'CGST %',
        'CGST',
        'SGST %',
        'SGST',
        'IGST %',
        'IGST',
        'UTGST %',
        'UTGST',
        'Total GST',
        'Transportation',
        'Total Price',
        'Ref',
        'Note',
      ],
      rows
    );
  };

  return (
    <div data-testid="page-transactions">
      <PageHeader
        overline="Operations"
        title="Transactions"
        description="Immutable ledger of every stock movement. Use it for audits, reconciliations and month-end closing."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                exportToExcel(
                  data?.items || [],
                  exportCols,
                  'transactions.xlsx',
                  'Transactions'
                )
              }
              data-testid="txn-export-excel"
            >
              <Download className="w-4 h-4 mr-2" />
              Excel
            </Button>

            <Button
              variant="outline"
              onClick={() =>
                exportToPDF(
                  data?.items || [],
                  exportCols,
                  'Transactions',
                  'transactions.pdf'
                )
              }
              data-testid="txn-export-pdf"
            >
              PDF
            </Button>

            <Button
              variant="outline"
              onClick={handlePrint}
              data-testid="txn-print"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mb-4">
        <div className="col-span-2 flex items-center gap-2 border border-border rounded-md px-2 h-9 bg-white">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />

          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search product or note…"
            className="border-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
            data-testid="txn-search"
          />
        </div>

        <Select
          value={type || 'all'}
          onValueChange={(v) => {
            setType(
              v === 'all' ? '' : v
            );
            setPage(1);
          }}
        >
          <SelectTrigger data-testid="txn-filter-type">
            <SelectValue placeholder="Type" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">
              All types
            </SelectItem>

            <SelectItem value="IN">
              Stock In
            </SelectItem>

            <SelectItem value="OUT">
              Stock Out
            </SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={categoryId || 'all'}
          onValueChange={(v) => {
            setCategoryId(
              v === 'all' ? '' : v
            );
            setPage(1);
          }}
        >
          <SelectTrigger data-testid="txn-filter-category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">
              All categories
            </SelectItem>

            {categories.map(
              (category) => (
                <SelectItem
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        <Select
          value={projectId || 'all'}
          onValueChange={(v) => {
            setProjectId(
              v === 'all' ? '' : v
            );
            setPage(1);
          }}
        >
          <SelectTrigger data-testid="txn-filter-project">
            <SelectValue placeholder="Project" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">
              All projects
            </SelectItem>

            {projects.map((p) => (
              <SelectItem
                key={p.id}
                value={p.id}
              >
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className={from ? 'pr-16' : ''}
            data-testid="txn-filter-from"
          />

          {from && (
            <button
              type="button"
              onClick={() => {
                setFrom('');
                setPage(1);
              }}
              className="absolute right-8 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear from date"
              title="Clear date"
              data-testid="txn-filter-from-clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="relative">
          <Input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className={to ? 'pr-16' : ''}
            data-testid="txn-filter-to"
          />

          {to && (
            <button
              type="button"
              onClick={() => {
                setTo('');
                setPage(1);
              }}
              className="absolute right-8 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear to date"
              title="Clear date"
              data-testid="txn-filter-to-clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.items || []}
        page={page}
        pageSize={15}
        total={data?.total || 0}
        totalPages={
          data?.totalPages || 1
        }
        onPageChange={setPage}
        onSortChange={(k, d) => {
          setSortBy(k);
          setSortDir(d);
        }}
        sortBy={sortBy}
        sortDir={sortDir}
        testId="transactions-table"
      />
    </div>
  );
}
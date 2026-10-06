import React from 'react';

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Download,
  Printer,
  Upload,
  FileSpreadsheet,
  FileText,
  Loader2,
  ChevronDown,
  Check,
} from 'lucide-react';

import {
  productsApi,
  categoriesApi,
  suppliersApi,
} from '@/lib/api';

import { productSchema } from '@/lib/schemas';

import {
  formatINR,
  formatNumber,
  formatDate,
} from '@/lib/format';

import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

import {
  exportToExcel,
  exportToPDF,
} from '@/lib/exporters';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';


/* =========================================================
   SEARCHABLE FILTER
   ========================================================= */

function SearchableFilter({
  options = [],
  value,
  onChange,
  placeholder,
  allLabel,
}) {
  const [open, setOpen] = React.useState(false);
  const [searchText, setSearchText] = React.useState('');

  const selected = options.find(
    (option) => String(option.id) === String(value)
  );

  const filteredOptions = options.filter((option) =>
    String(option.name || '')
      .toLowerCase()
      .includes(searchText.trim().toLowerCase())
  );

  return (
    <div className="relative w-full sm:w-48">
      <button
        type="button"
        className="
          flex h-9 w-full items-center justify-between
          rounded-md border border-border bg-white
          px-3 text-left text-sm
          hover:bg-zinc-50
          focus:outline-none
          focus:ring-2 focus:ring-ring
        "
        onClick={() => {
          setOpen((current) => !current);
          setSearchText('');
        }}
      >
        <span
          className={
            selected
              ? 'truncate text-zinc-900'
              : 'truncate text-muted-foreground'
          }
        >
          {selected?.name || allLabel}
        </span>

        <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          <div
            className="
              absolute left-0 top-full z-50 mt-1
              w-full min-w-[230px]
              overflow-hidden rounded-md
              border border-border bg-white
              shadow-lg
            "
          >
            <div className="border-b border-border p-2">
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />

                <Input
                  autoFocus
                  value={searchText}
                  onChange={(event) =>
                    setSearchText(event.target.value)
                  }
                  placeholder={placeholder}
                  className="
                    h-8 border-0 px-0
                    focus-visible:ring-0
                  "
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto p-1">
              <button
                type="button"
                className={`
                  flex w-full items-center justify-between
                  rounded-sm px-2 py-2
                  text-left text-sm
                  hover:bg-zinc-100
                  ${!value ? 'bg-zinc-100 font-medium' : ''}
                `}
                onClick={() => {
                  onChange('');
                  setSearchText('');
                  setOpen(false);
                }}
              >
                <span>{allLabel}</span>

                {!value && (
                  <Check className="h-3.5 w-3.5" />
                )}
              </button>

              {filteredOptions.map((option) => {
                const isSelected =
                  String(value) === String(option.id);

                return (
                  <button
                    type="button"
                    key={option.id}
                    className={`
                      flex w-full items-center justify-between
                      rounded-sm px-2 py-2
                      text-left text-sm
                      hover:bg-zinc-100
                      ${isSelected ? 'bg-zinc-100 font-medium' : ''}
                    `}
                    onClick={() => {
                      onChange(option.id);
                      setSearchText('');
                      setOpen(false);
                    }}
                  >
                    <span className="truncate">
                      {option.name}
                    </span>

                    {isSelected && (
                      <Check className="h-3.5 w-3.5 shrink-0" />
                    )}
                  </button>
                );
              })}

              {filteredOptions.length === 0 && (
                <div className="px-2 py-3 text-xs text-muted-foreground">
                  No matching options.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


/* =========================================================
   SEARCHABLE FORM SELECT
   ========================================================= */

function SearchableFormSelect({
  options = [],
  value,
  onChange,
  placeholder,
  noneLabel,
}) {
  const [open, setOpen] = React.useState(false);
  const [searchText, setSearchText] = React.useState('');

  const selected = options.find(
    (option) => String(option.id) === String(value)
  );

  const filteredOptions = options.filter((option) =>
    String(option.name || '')
      .toLowerCase()
      .includes(searchText.trim().toLowerCase())
  );

  return (
    <div className="relative w-full">
      <button
        type="button"
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-left text-sm shadow-sm hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-ring"
        onClick={() => {
          setOpen((current) => !current);
          setSearchText('');
        }}
      >
        <span className={selected ? 'truncate text-zinc-900' : 'truncate text-muted-foreground'}>
          {selected?.name || noneLabel}
        </span>
        <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[230px] overflow-hidden rounded-md border border-border bg-white shadow-lg">
            <div className="border-b border-border p-2">
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  autoFocus
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder={placeholder}
                  className="h-8 border-0 px-0 focus-visible:ring-0"
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto p-1">
              <button
                type="button"
                className={`flex w-full items-center justify-between rounded-sm px-2 py-2 text-left text-sm hover:bg-zinc-100 ${!value ? 'bg-zinc-100 font-medium' : ''}`}
                onClick={() => {
                  onChange('');
                  setOpen(false);
                  setSearchText('');
                }}
              >
                <span>{noneLabel}</span>
                {!value && <Check className="h-3.5 w-3.5" />}
              </button>

              {filteredOptions.map((option) => {
                const isSelected = String(value) === String(option.id);
                return (
                  <button
                    type="button"
                    key={option.id}
                    className={`flex w-full items-center justify-between rounded-sm px-2 py-2 text-left text-sm hover:bg-zinc-100 ${isSelected ? 'bg-zinc-100 font-medium' : ''}`}
                    onClick={() => {
                      onChange(option.id);
                      setOpen(false);
                      setSearchText('');
                    }}
                  >
                    <span className="truncate">{option.name}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                );
              })}

              {filteredOptions.length === 0 && (
                <div className="px-2 py-3 text-xs text-muted-foreground">No matching options.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


/* =========================================================
   EMPTY PRODUCT FORM
   ========================================================= */

const emptyForm = {
  sku: '',
  name: '',
  description: '',
  unit: 'pcs',
  price: 0,
  minStock: 0,
  currentStock: 0,
  categoryId: '',
  supplierId: '',
  location: '',
  rackNumber: '',
};


/* =========================================================
   PRODUCTS PAGE
   ========================================================= */

export default function Products() {
  const qc = useQueryClient();

  /* -------------------------------------------------------
     TABLE / FILTER STATE
     ------------------------------------------------------- */

  const [page, setPage] = React.useState(1);

  const [search, setSearch] = React.useState('');

  const [sortBy, setSortBy] = React.useState('createdAt');

  const [sortDir, setSortDir] = React.useState('desc');

  const [categoryId, setCategoryId] = React.useState('');

  const [supplierId, setSupplierId] = React.useState('');

  /* -------------------------------------------------------
     DIALOG STATE
     ------------------------------------------------------- */

  const [dialogOpen, setDialogOpen] = React.useState(false);

  const [editing, setEditing] = React.useState(null);

  const [confirmId, setConfirmId] = React.useState(null);

  /* -------------------------------------------------------
     IMPORT STATE
     ------------------------------------------------------- */

  const fileInputRef = React.useRef(null);

  const [selectedFileName, setSelectedFileName] =
    React.useState('');


  /* =======================================================
     SERVER PRODUCT QUERY
     ======================================================= */

  const {
    data,
    isLoading,
  } = useQuery({
    queryKey: [
      'products',
      {
        page,
        search,
        sortBy,
        sortDir,
      },
    ],

    queryFn: () =>
      productsApi.list({
        page,
        pageSize: 10,
        search,
        sortBy,
        sortDir,
      }),
  });


  /* =======================================================
     CATEGORIES
     ======================================================= */

  const {
    data: categories = [],
  } = useQuery({
    queryKey: ['cats-all'],
    queryFn: categoriesApi.all,
  });


  /* =======================================================
     SUPPLIERS
     ======================================================= */

  const {
    data: suppliers = [],
  } = useQuery({
    queryKey: ['sups-all'],
    queryFn: suppliersApi.all,
  });


  /* =======================================================
     ALL PRODUCTS
     
     Used when user searches/filter locally.
     This makes the filters work across all products,
     not only the currently visible 10 rows.
     ======================================================= */

  const {
    data: allProducts = [],
  } = useQuery({
    queryKey: ['prods-all'],
    queryFn: productsApi.all,
  });


  /* =======================================================
     FILTERED PRODUCTS
     ======================================================= */

  const filteredProducts = React.useMemo(() => {
    const hasFilters =
      Boolean(categoryId) ||
      Boolean(supplierId) ||
      Boolean(search.trim());

    if (!hasFilters) {
      return null;
    }

    const query = search.trim().toLowerCase();

    return allProducts.filter((product) => {
      const productCategoryId =
        product.categoryId ??
        product.category?.id ??
        '';

      const productSupplierId =
        product.supplierId ??
        product.supplier?.id ??
        '';

      const categoryMatch =
        !categoryId ||
        String(productCategoryId) ===
          String(categoryId);

      const supplierMatch =
        !supplierId ||
        String(productSupplierId) ===
          String(supplierId);

      const sku =
        String(product.sku || '').toLowerCase();

      const name =
        String(product.name || '').toLowerCase();

      const searchMatch =
        !query ||
        sku.includes(query) ||
        name.includes(query);

      return (
        categoryMatch &&
        supplierMatch &&
        searchMatch
      );
    });
  }, [
    allProducts,
    categoryId,
    supplierId,
    search,
  ]);


  /* =======================================================
     SORT LOCAL FILTER RESULTS
     ======================================================= */

  const sortedFilteredProducts = React.useMemo(() => {
    if (!filteredProducts) {
      return null;
    }

    const products = [...filteredProducts];

    products.sort((a, b) => {
      let aValue = a?.[sortBy];
      let bValue = b?.[sortBy];

      if (sortBy === 'category') {
        aValue =
          a.category?.name || '';
        bValue =
          b.category?.name || '';
      }

      if (sortBy === 'supplier') {
        aValue =
          a.supplier?.name || '';
        bValue =
          b.supplier?.name || '';
      }

      if (
        typeof aValue === 'string' ||
        typeof bValue === 'string'
      ) {
        aValue = String(aValue || '').toLowerCase();
        bValue = String(bValue || '').toLowerCase();

        if (aValue < bValue) {
          return sortDir === 'asc' ? -1 : 1;
        }

        if (aValue > bValue) {
          return sortDir === 'asc' ? 1 : -1;
        }

        return 0;
      }

      const aNumber =
        Number(aValue ?? 0);

      const bNumber =
        Number(bValue ?? 0);

      return sortDir === 'asc'
        ? aNumber - bNumber
        : bNumber - aNumber;
    });

    return products;
  }, [
    filteredProducts,
    sortBy,
    sortDir,
  ]);


  /* =======================================================
     PAGINATION
     ======================================================= */

  const displayedProducts =
    sortedFilteredProducts
      ? sortedFilteredProducts.slice(
          (page - 1) * 10,
          page * 10
        )
      : data?.items || [];

  const displayedTotal =
    sortedFilteredProducts
      ? sortedFilteredProducts.length
      : data?.total || 0;

  const displayedTotalPages =
    sortedFilteredProducts
      ? Math.max(
          1,
          Math.ceil(
            sortedFilteredProducts.length / 10
          )
        )
      : data?.totalPages || 1;


  /* =======================================================
     FORM
     ======================================================= */

  const form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: emptyForm,
  });

  const watchedCategoryId = form.watch('categoryId');
  const watchedSku = form.watch('sku');
  const selectedFormCategory = React.useMemo(
    () => categories.find((category) => String(category.id) === String(watchedCategoryId)),
    [categories, watchedCategoryId]
  );

  const selectedPrefix = selectedFormCategory?.skuPrefix
    ? String(selectedFormCategory.skuPrefix).toUpperCase()
    : '';

  const [skuSuffix, setSkuSuffix] = React.useState('');

  React.useEffect(() => {
    if (editing) return;
    const prefix = selectedPrefix && !selectedPrefix.endsWith('-')
      ? `${selectedPrefix}-`
      : selectedPrefix;
    const current = String(watchedSku || '');
    const currentSuffix = prefix && current.toUpperCase().startsWith(prefix)
      ? current.slice(prefix.length)
      : skuSuffix;
    const finalSku = `${prefix}${currentSuffix}`;
    if (finalSku !== current) {
      form.setValue('sku', finalSku, { shouldValidate: true });
    }
    if (currentSuffix !== skuSuffix) setSkuSuffix(currentSuffix);
  }, [selectedPrefix, watchedCategoryId, editing]);


  /* =======================================================
     CREATE
     ======================================================= */

  const openCreate = () => {
    setEditing(null);

    form.reset(emptyForm);
    setSkuSuffix('');

    setDialogOpen(true);
  };


  /* =======================================================
     EDIT
     ======================================================= */

  const openEdit = (row) => {
    setEditing(row);

    form.reset({
      sku: row.sku || '',
      name: row.name || '',
      description: row.description || '',
      unit: row.unit || 'pcs',
      price: row.price ?? 0,
      minStock: row.minStock ?? 0,
      currentStock: row.currentStock ?? 0,

      categoryId:
        row.categoryId ||
        row.category?.id ||
        '',

      supplierId:
        row.supplierId ||
        row.supplier?.id ||
        '',

      location:
        row.location || '',

      rackNumber:
        row.rackNumber || '',
    });

    const editCategory = categories.find((category) =>
      String(category.id) === String(row.categoryId || row.category?.id || '')
    );
    const editPrefix = editCategory?.skuPrefix
      ? String(editCategory.skuPrefix).toUpperCase()
      : '';
    const normalizedEditPrefix = editPrefix && !editPrefix.endsWith('-')
      ? `${editPrefix}-`
      : editPrefix;
    setSkuSuffix(normalizedEditPrefix && String(row.sku || '').toUpperCase().startsWith(normalizedEditPrefix)
      ? String(row.sku).slice(normalizedEditPrefix.length)
      : String(row.sku || ''));

    setDialogOpen(true);
  };


  /* =======================================================
     CREATE MUTATION
     ======================================================= */

  const createMut = useMutation({
    mutationFn: (values) =>
      productsApi.create({
        ...values,

        categoryId:
          values.categoryId || null,

        supplierId:
          values.supplierId || null,

        location:
          values.location || null,

        rackNumber:
          values.rackNumber || null,
      }),

    onSuccess: () => {
      toast.success('Product created');

      qc.invalidateQueries({
        queryKey: ['products'],
      });

      qc.invalidateQueries({
        queryKey: ['prods-all'],
      });

      qc.invalidateQueries({
        queryKey: ['summary'],
      });

      qc.invalidateQueries({
        queryKey: ['inventory'],
      });

      setDialogOpen(false);
    },

    onError: (error) => {
      toast.error(
        error?.friendly ||
          error?.message ||
          'Failed to create product'
      );
    },
  });


  /* =======================================================
     UPDATE MUTATION
     ======================================================= */

  const updateMut = useMutation({
    mutationFn: ({ id, values }) =>
      productsApi.update(id, {
        ...values,

        categoryId:
          values.categoryId || null,

        supplierId:
          values.supplierId || null,

        location:
          values.location || null,

        rackNumber:
          values.rackNumber || null,
      }),

    onSuccess: () => {
      toast.success('Product updated');

      qc.invalidateQueries({
        queryKey: ['products'],
      });

      qc.invalidateQueries({
        queryKey: ['prods-all'],
      });

      qc.invalidateQueries({
        queryKey: ['summary'],
      });

      qc.invalidateQueries({
        queryKey: ['inventory'],
      });

      setDialogOpen(false);
    },

    onError: (error) => {
      toast.error(
        error?.friendly ||
          error?.message ||
          'Failed to update product'
      );
    },
  });


  /* =======================================================
     DELETE MUTATION
     ======================================================= */

  const deleteMut = useMutation({
    mutationFn: (id) =>
      productsApi.remove(id),

    onSuccess: () => {
      toast.success('Product deleted');

      qc.invalidateQueries({
        queryKey: ['products'],
      });

      qc.invalidateQueries({
        queryKey: ['prods-all'],
      });

      qc.invalidateQueries({
        queryKey: ['summary'],
      });

      qc.invalidateQueries({
        queryKey: ['inventory'],
      });

      setConfirmId(null);
    },

    onError: (error) => {
      toast.error(
        error?.friendly ||
          error?.message ||
          'Failed to delete product'
      );
    },
  });


  /* =======================================================
     IMPORT
     ======================================================= */

  const importMut = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();

      formData.append('file', file);

      const response = await fetch(
        '/api/products/import',
        {
          method: 'POST',
          body: formData,
        }
      );

      let result = {};

      try {
        result = await response.json();
      } catch {
        result = {};
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            result.message ||
            'Failed to import products'
        );
      }

      return result;
    },

    onSuccess: (result) => {
      const imported =
        result.imported ??
        result.created ??
        result.count ??
        0;

      const skipped =
        result.skipped ?? 0;

      if (imported > 0) {
        toast.success(
          `${imported} product${
            imported === 1 ? '' : 's'
          } imported successfully${
            skipped > 0
              ? `, ${skipped} skipped`
              : ''
          }`
        );
      } else {
        toast.success(
          'File processed successfully'
        );
      }

      qc.invalidateQueries({
        queryKey: ['products'],
      });

      qc.invalidateQueries({
        queryKey: ['prods-all'],
      });

      qc.invalidateQueries({
        queryKey: ['summary'],
      });

      qc.invalidateQueries({
        queryKey: ['inventory'],
      });

      setSelectedFileName('');

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setPage(1);
    },

    onError: (error) => {
      toast.error(
        error?.message ||
          'Failed to import file'
      );

      setSelectedFileName('');

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
  });


  /* =======================================================
     FILE SELECT
     ======================================================= */

  const handleFileSelect = (event) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedExtensions = [
      '.xlsx',
      '.xls',
      '.csv',
      '.pdf',
    ];

    const fileName =
      file.name.toLowerCase();

    const isAllowed =
      allowedExtensions.some(
        (extension) =>
          fileName.endsWith(extension)
      );

    if (!isAllowed) {
      toast.error(
        'Please select an Excel, CSV or PDF file'
      );

      event.target.value = '';

      return;
    }

    const maxSize =
      10 * 1024 * 1024;

    if (file.size > maxSize) {
      toast.error(
        'File size must be 10 MB or less'
      );

      event.target.value = '';

      return;
    }

    setSelectedFileName(file.name);

    importMut.mutate(file);
  };


  /* =======================================================
     SUBMIT
     ======================================================= */

  const onSubmit = (values) => {
    if (editing) {
      updateMut.mutate({
        id: editing.id,
        values,
      });
    } else {
      createMut.mutate(values);
    }
  };


  /* =======================================================
     TABLE COLUMNS
     ======================================================= */

  const columns = [
    {
      key: 'sku',
      header: 'SKU',
      sortable: true,

      cell: (row) => (
        <span className="font-mono text-xs">
          {row.sku}
        </span>
      ),
    },

    {
      key: 'name',
      header: 'Name',
      sortable: true,

      cell: (row) => (
        <div>
          <div className="font-medium text-zinc-900">
            {row.name}
          </div>

          {row.description && (
            <div className="
              max-w-[280px]
              truncate
              text-xs
              text-muted-foreground
            ">
              {row.description}
            </div>
          )}
        </div>
      ),
    },

    {
      key: 'category',
      header: 'Category',

      cell: (row) =>
        row.category?.name ? (
          <Badge
            variant="secondary"
            className="font-normal"
          >
            {row.category.name}
          </Badge>
        ) : (
          <span className="
            text-xs
            text-muted-foreground
          ">
            —
          </span>
        ),
    },

    {
      key: 'supplier',
      header: 'Supplier',

      cell: (row) =>
        row.supplier?.name ? (
          <span>
            {row.supplier.name}
          </span>
        ) : (
          <span className="
            text-xs
            text-muted-foreground
          ">
            —
          </span>
        ),
    },

    {
      key: 'location',
      header: 'Location',

      cell: (row) =>
        row.location ? (
          <span>
            {row.location}
          </span>
        ) : (
          <span className="
            text-xs
            text-muted-foreground
          ">
            —
          </span>
        ),
    },

    {
      key: 'rackNumber',
      header: 'Rack No.',

      cell: (row) =>
        row.rackNumber ? (
          <span className="font-mono text-xs">
            {row.rackNumber}
          </span>
        ) : (
          <span className="
            text-xs
            text-muted-foreground
          ">
            —
          </span>
        ),
    },

    {
      key: 'price',
      header: 'Price',
      sortable: true,

      cell: (row) => (
        <span className="font-mono">
          {formatINR(row.price)}
        </span>
      ),
    },

    {
      key: 'currentStock',
      header: 'Stock',
      sortable: true,

      cell: (row) => {
        const low =
          Number(row.currentStock || 0) <=
          Number(row.minStock || 0);

        return (
          <span
            className={`
              font-mono
              font-semibold
              ${
                low
                  ? 'text-red-600'
                  : 'text-zinc-900'
              }
            `}
          >
            {formatNumber(
              row.currentStock
            )}{' '}

            <span className="
              text-xs
              font-normal
              text-muted-foreground
            ">
              {row.unit}
            </span>
          </span>
        );
      },
    },

    {
      key: 'minStock',
      header: 'Min',

      cell: (row) => (
        <span className="
          font-mono
          text-xs
          text-muted-foreground
        ">
          {row.minStock}
        </span>
      ),
    },

    {
      key: 'actions',
      header: '',

      cell: (row) => (
        <div className="
          flex
          justify-end
          gap-1
        ">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              openEdit(row)
            }
            data-testid={`product-edit-${row.sku}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="
              h-8 w-8
              text-red-600
              hover:text-red-700
            "
            onClick={() =>
              setConfirmId(row.id)
            }
            data-testid={`product-delete-${row.sku}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];


  /* =======================================================
     EXPORT COLUMNS
     ======================================================= */

  const exportCols = [
    {
      header: 'SKU',
      accessor: 'sku',
    },

    {
      header: 'Name',
      accessor: 'name',
    },

    {
      header: 'Category',
      accessor: (row) =>
        row.category?.name || '',
    },

    {
      header: 'Supplier',
      accessor: (row) =>
        row.supplier?.name || '',
    },

    {
      header: 'Location',
      accessor: 'location',
    },

    {
      header: 'Rack Number',
      accessor: 'rackNumber',
    },

    {
      header: 'Unit',
      accessor: 'unit',
    },

    {
      header: 'Price (INR)',
      accessor: 'price',
    },

    {
      header: 'Current Stock',
      accessor: 'currentStock',
    },

    {
      header: 'Min Stock',
      accessor: 'minStock',
    },

    {
      header: 'Created',
      accessor: (row) =>
        formatDate(row.createdAt),
    },
  ];


  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div data-testid="page-products">

      {/* =================================================
          PAGE HEADER
          ================================================= */}

      <PageHeader
        overline="Catalog"
        title="Products"
        description="
          Master data for every SKU your operation moves.
          Track price, minimum stock and live inventory levels.
        "
        actions={
          <div className="
            flex
            flex-wrap
            gap-2
          ">

            {/* IMPORT */}

            <input
              ref={fileInputRef}
              type="file"
              accept="
                .xlsx,
                .xls,
                .csv,
                .pdf,
                application/pdf,
                application/vnd.ms-excel,
                application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,
                text/csv
              "
              className="hidden"
              onChange={handleFileSelect}
            />

            <Button
              variant="outline"
              disabled={importMut.isPending}
              onClick={() =>
                fileInputRef.current?.click()
              }
              data-testid="products-import-btn"
            >
              {importMut.isPending ? (
                <Loader2 className="
                  mr-2
                  h-4
                  w-4
                  animate-spin
                " />
              ) : (
                <Upload className="
                  mr-2
                  h-4
                  w-4
                " />
              )}

              {importMut.isPending
                ? 'Importing...'
                : 'Import file'}
            </Button>


            {/* EXCEL */}

            <Button
              variant="outline"
              onClick={() =>
                exportToExcel(
                  displayedProducts,
                  exportCols,
                  'products.xlsx',
                  'Products'
                )
              }
              data-testid="products-export-excel"
            >
              <Download className="
                mr-2
                h-4
                w-4
              " />

              Excel
            </Button>


            {/* PDF */}

            <Button
              variant="outline"
              onClick={() =>
                exportToPDF(
                  displayedProducts,
                  exportCols,
                  'Products',
                  'products.pdf'
                )
              }
              data-testid="products-export-pdf"
            >
              <Printer className="
                mr-2
                h-4
                w-4
              " />

              PDF
            </Button>


            {/* NEW PRODUCT */}

            <Button
              onClick={openCreate}
              data-testid="products-add-btn"
            >
              <Plus className="
                mr-2
                h-4
                w-4
              " />

              New product
            </Button>

          </div>
        }
      />


      {/* =================================================
          IMPORT STATUS
          ================================================= */}

      {selectedFileName && (
        <div className="
          mb-4
          flex
          items-center
          gap-2
          rounded-md
          border
          border-border
          bg-muted/30
          px-3
          py-2
          text-sm
        ">
          {selectedFileName
            .toLowerCase()
            .endsWith('.pdf') ? (
            <FileText className="
              h-4
              w-4
              text-muted-foreground
            " />
          ) : (
            <FileSpreadsheet className="
              h-4
              w-4
              text-muted-foreground
            " />
          )}

          <span className="truncate">
            {selectedFileName}
          </span>

          {importMut.isPending && (
            <span className="
              text-muted-foreground
            ">
              Processing file...
            </span>
          )}
        </div>
      )}


      {/* =================================================
          FILTERS
          ================================================= */}

      <div className="
        mb-4
        flex
        flex-wrap
        items-center
        gap-2
      ">

        {/* SKU / NAME SEARCH */}

        <div className="
          flex
          h-9
          w-full
          items-center
          gap-2
          rounded-md
          border
          border-border
          bg-white
          px-2
          sm:w-64
        ">
          <Search className="
            h-3.5
            w-3.5
            text-muted-foreground
          " />

          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by SKU or name…"
            className="
              h-8
              border-0
              px-0
              focus-visible:ring-0
              focus-visible:ring-offset-0
            "
            data-testid="products-search"
          />
        </div>


        {/* CATEGORY SEARCH FILTER */}

        <SearchableFilter
          options={categories}
          value={categoryId}
          onChange={(value) => {
            setCategoryId(value);
            setPage(1);
          }}
          placeholder="Search category..."
          allLabel="All categories"
        />


        {/* SUPPLIER SEARCH FILTER */}

        <SearchableFilter
          options={suppliers}
          value={supplierId}
          onChange={(value) => {
            setSupplierId(value);
            setPage(1);
          }}
          placeholder="Search supplier..."
          allLabel="All suppliers"
        />

      </div>


      {/* =================================================
          ACTIVE FILTER RESET
          ================================================= */}

      {(search ||
        categoryId ||
        supplierId) && (
        <div className="
          mb-3
          flex
          items-center
          gap-2
          text-xs
          text-muted-foreground
        ">
          <span>
            Showing {displayedTotal} matching product
            {displayedTotal === 1 ? '' : 's'}
          </span>

          <button
            type="button"
            className="
              font-medium
              text-zinc-900
              underline
              underline-offset-2
              hover:text-red-600
            "
            onClick={() => {
              setSearch('');
              setCategoryId('');
              setSupplierId('');
              setPage(1);
            }}
          >
            Clear filters
          </button>
        </div>
      )}


      {/* =================================================
          TABLE
          ================================================= */}

      <DataTable
        columns={columns}
        data={displayedProducts}
        page={page}
        pageSize={10}
        total={displayedTotal}
        totalPages={displayedTotalPages}
        onPageChange={setPage}

        onSortChange={(key, direction) => {
          setSortBy(key);
          setSortDir(direction);
        }}

        sortBy={sortBy}
        sortDir={sortDir}
        testId="products-table"

        emptyMessage={
          isLoading
            ? 'Loading…'
            : sortedFilteredProducts &&
              sortedFilteredProducts.length === 0
            ? 'No products match the selected filters.'
            : 'No products yet — create your first SKU.'
        }
      />


      {/* =================================================
          CREATE / EDIT DIALOG
          ================================================= */}

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      >
        <DialogContent
          className="max-w-2xl"
          data-testid="product-dialog"
        >

          <DialogHeader>
            <DialogTitle>
              {editing
                ? 'Edit product'
                : 'New product'}
            </DialogTitle>
          </DialogHeader>


          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="
              grid
              grid-cols-2
              gap-4
            "
          >

            {/* CATEGORY - FIRST FOR QUICK SKU SETUP */}

            <div className="col-span-2">
              <Label>Category *</Label>
              <SearchableFormSelect
                options={categories}
                value={watchedCategoryId}
                onChange={(value) => {
                  form.setValue('categoryId', value, { shouldValidate: true });
                  if (!editing) {
                    const category = categories.find((item) => String(item.id) === String(value));
                    const prefix = category?.skuPrefix
                      ? String(category.skuPrefix).toUpperCase()
                      : '';
                    const normalizedPrefix = prefix && !prefix.endsWith('-') ? `${prefix}-` : prefix;
                    form.setValue('sku', `${normalizedPrefix}${skuSuffix}`, { shouldValidate: true });
                  }
                }}
                placeholder="Search category..."
                noneLabel="No category"
              />
              {!editing && selectedFormCategory?.skuPrefix && (
                <p className="mt-1 text-xs text-muted-foreground">
                  SKU prefix: <span className="font-mono font-medium text-zinc-900">{selectedFormCategory.skuPrefix}</span>
                </p>
              )}
              {form.formState.errors.categoryId && (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.categoryId.message}</p>
              )}
            </div>

            {/* SKU */}

            <div>
              <Label>SKU *</Label>
              {editing ? (
                <Input
                  {...form.register('sku')}
                  placeholder="PRD-0001"
                  data-testid="product-form-sku"
                />
              ) : (
                <div className="flex h-9 w-full items-center overflow-hidden rounded-md border border-input bg-background">
                  <span className="flex h-full items-center border-r border-input bg-muted/40 px-3 font-mono text-sm text-muted-foreground">
                    {selectedPrefix || 'SKU-'}
                  </span>
                  <Input
                    value={skuSuffix}
                    onChange={(event) => {
                      const suffix = event.target.value.replace(/\s/g, '');
                      setSkuSuffix(suffix);
                      const prefix = selectedPrefix && !selectedPrefix.endsWith('-')
                        ? `${selectedPrefix}-`
                        : selectedPrefix;
                      form.setValue('sku', `${prefix}${suffix}`, { shouldValidate: true });
                    }}
                    placeholder="001"
                    className="h-full border-0 focus-visible:ring-0"
                    data-testid="product-form-sku-suffix"
                  />
                </div>
              )}
              {!editing && <p className="mt-1 text-xs text-muted-foreground">Enter only the numeric/alphanumeric suffix, e.g. 001, 002.</p>}
              {form.formState.errors.sku && (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.sku.message}</p>
              )}
            </div>

            {/* NAME */}

            <div>
              <Label>Name *</Label>
              <Input
                {...form.register('name')}
                placeholder="Product name"
                data-testid="product-form-name"
              />
              {form.formState.errors.name && (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.name.message}</p>
              )}
            </div>

            {/* DESCRIPTION */}

            <div className="col-span-2">
              <Label>Description</Label>

              <Textarea
                {...form.register('description')}
                rows={2}
                placeholder="Product description..."
              />
            </div>


            {/* SUPPLIER */}

            <div>
              <Label>Supplier</Label>
              <SearchableFormSelect
                options={suppliers}
                value={form.watch('supplierId')}
                onChange={(value) => form.setValue('supplierId', value)}
                placeholder="Search supplier..."
                noneLabel="No supplier"
              />
            </div>

            {/* CURRENT STOCK */}

            <div>
              <Label>Current stock</Label>

              <Input
                type="number"
                {...form.register(
                  'currentStock',
                  {
                    valueAsNumber: true,
                  }
                )}
                disabled={!!editing}
                data-testid="product-form-currentStock"
              />

              {editing && (
                <p className="
                  mt-1
                  text-xs
                  text-muted-foreground
                ">
                  Modify via Stock In / Out to
                  preserve audit trail.
                </p>
              )}
            </div>


            {/* MIN STOCK */}

            <div>
              <Label>Minimum stock</Label>

              <Input
                type="number"
                {...form.register(
                  'minStock',
                  {
                    valueAsNumber: true,
                  }
                )}
                data-testid="product-form-minStock"
              />
            </div>


            {/* UNIT */}

            <div>
              <Label>Unit</Label>

              <Input
                {...form.register('unit')}
                placeholder="pcs, kg, roll..."
              />
            </div>


            {/* PRICE */}

            <div>
              <Label>Price</Label>

              <Input
                type="number"
                step="0.01"
                min="0"
                {...form.register(
                  'price',
                  {
                    valueAsNumber: true,
                  }
                )}
              />
            </div>


            {/* LOCATION */}

            <div>
              <Label>Location</Label>

              <Input
                {...form.register('location')}
                placeholder="e.g. Warehouse A"
                data-testid="product-form-location"
              />
            </div>


            {/* RACK */}

            <div>
              <Label>Rack Number</Label>

              <Input
                {...form.register('rackNumber')}
                placeholder="e.g. R-01"
                data-testid="product-form-rackNumber"
              />
            </div>


            {/* FOOTER */}

            <DialogFooter
              className="
                col-span-2
                mt-2
              "
            >
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setDialogOpen(false)
                }
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={
                  createMut.isPending ||
                  updateMut.isPending
                }
                data-testid="product-form-submit"
              >
                {createMut.isPending ||
                updateMut.isPending ? (
                  <>
                    <Loader2 className="
                      mr-2
                      h-4
                      w-4
                      animate-spin
                    " />

                    Saving...
                  </>
                ) : editing ? (
                  'Save changes'
                ) : (
                  'Create product'
                )}
              </Button>
            </DialogFooter>

          </form>

        </DialogContent>
      </Dialog>


      {/* =================================================
          DELETE CONFIRMATION
          ================================================= */}

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(value) => {
          if (!value) {
            setConfirmId(null);
          }
        }}
        title="Delete product?"
        description="
          This will also delete related transactions
          for this product. This cannot be undone.
        "
        onConfirm={() =>
          deleteMut.mutate(confirmId)
        }
        confirmLabel="Delete"
        destructive
        testId="product-delete-confirm"
      />

    </div>
  );
}
// StockIn.jsx
// CGST select karne par:
// GST Percentage -> SGST Percentage
// CGST Percentage -> manually editable
// Total GST = SGST + CGST

import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import dayjs from 'dayjs';

import {
  ArrowDownToLine,
  PackagePlus,
  Truck,
  Package,
  IndianRupee,
  Hash,
  CalendarDays,
  FileText,
  TrendingUp,
  AlertTriangle,
  MapPin,
  Archive,
  Percent,
} from 'lucide-react';

import {
  productsApi,
  suppliersApi,
  transactionsApi,
  categoriesApi,
} from '@/lib/api';

import {
  stockInSchema,
  productSchema,
  supplierSchema,
} from '@/lib/schemas';

import { PageHeader } from '@/components/common/PageHeader';
import { QuickCreate } from '@/components/common/QuickCreate';

import {
  formatDateTime,
  formatNumber,
  formatINR,
} from '@/lib/format';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const today = () => dayjs().format('YYYY-MM-DD');


const SearchableOptionSelect = ({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyLabel = 'No matching options.',
  noneOption,
  renderOption,
  getSearchText,
}) => {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const selectedOption = options.find((option) => option.id === value);
  const filteredOptions = options.filter((option) => {
    const label = getSearchText
      ? getSearchText(option)
      : option.name;

    return String(label || '')
      .toLowerCase()
      .includes(search.trim().toLowerCase());
  });

  const selectedLabel = selectedOption
    ? (renderOption ? renderOption(selectedOption, true) : selectedOption.name)
    : noneOption?.label || placeholder;

  return (
    <div className="relative">
      <button
        type="button"
        className="flex h-9 w-full items-center justify-between rounded-md border border-border bg-white px-3 text-left text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
        onClick={() => {
          setOpen((current) => !current);
          setSearch('');
        }}
      >
        <span className={selectedOption || value ? 'truncate text-zinc-900' : 'truncate text-muted-foreground'}>
          {selectedLabel}
        </span>
        <span className="ml-2 shrink-0 text-xs text-muted-foreground">⌄</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-white shadow-lg">
          <div className="border-b border-border p-2">
            <Input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-8"
            />
          </div>

          <div className="max-h-64 overflow-y-auto p-1">
            {noneOption && (
              <button
                type="button"
                className={`flex w-full items-center rounded-sm px-2 py-2 text-left text-sm hover:bg-zinc-100 ${!value ? 'bg-zinc-100 font-medium' : ''}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange('');
                  setSearch('');
                  setOpen(false);
                }}
              >
                {noneOption.label}
              </button>
            )}

            {filteredOptions.map((option) => (
              <button
                type="button"
                key={option.id}
                className={`flex w-full items-center rounded-sm px-2 py-2 text-left text-sm hover:bg-zinc-100 ${value === option.id ? 'bg-zinc-100 font-medium' : ''}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.id);
                  setSearch('');
                  setOpen(false);
                }}
              >
                {renderOption ? renderOption(option, false) : option.name}
              </button>
            ))}

            {filteredOptions.length === 0 && (
              <div className="px-2 py-3 text-xs text-muted-foreground">
                {emptyLabel}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function StockIn() {
  const qc = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ['prods-all'],
    queryFn: productsApi.all,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['sups-all'],
    queryFn: suppliersApi.all,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-all'],
    queryFn: categoriesApi.all,
  });

  const [categoryId, setCategoryId] = React.useState('');
  const [transportation, setTransportation] = React.useState(false);

  const filteredProducts = useMemo(() => {
    if (!categoryId) return products;

    return products.filter(
      (p) => p.categoryId === categoryId
    );
  }, [products, categoryId]);

  const { data: recent = {} } = useQuery({
    queryKey: ['recent-in'],
    queryFn: () =>
      transactionsApi.list({
        type: 'IN',
        pageSize: 8,
        page: 1,
      }),
  });

  const form = useForm({
    resolver: zodResolver(stockInSchema),
    defaultValues: {
      productId: '',
      supplierId: '',
      rackNumber: '',
      location: '',
      quantity: 1,
      unitCost: '',
      gstPercentage: 0,
      cgstPercentage: 0,
      gstType: 'CGST',
      transportationCharges: '',
      reference: '',
      date: today(),
      note: '',
    },
  });

  const productId = form.watch('productId');
  const supplierId = form.watch('supplierId');
  const quantity = Number(form.watch('quantity') || 0);
  const unitCost = form.watch('unitCost');
  const gstPercentage = Number(
    form.watch('gstPercentage') || 0
  );
  const cgstPercentage = Number(
    form.watch('cgstPercentage') || 0
  );
  const gstType = form.watch('gstType') || 'CGST';

  const watchedTransportationCharges = form.watch(
    'transportationCharges'
  );

  const selected = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId]
  );

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === supplierId),
    [suppliers, supplierId]
  );

  /*
   * PURCHASE AMOUNT
   */
  const baseAmount =
    unitCost !== '' &&
    unitCost !== null &&
    unitCost !== undefined &&
    quantity
      ? Number(unitCost) * quantity
      : 0;

  /*
   * TRANSPORTATION
   */
  const transportationCharges = transportation
    ? Number(watchedTransportationCharges || 0)
    : 0;

  /*
   * TAXABLE AMOUNT
   */
  const taxableAmount =
    baseAmount + transportationCharges;

  /*
   * CGST MODE
   *
   * gstPercentage = SGST percentage
   * cgstPercentage = CGST percentage
   */
  const cgstAmount =
    gstType === 'CGST' &&
    taxableAmount > 0 &&
    cgstPercentage > 0
      ? (taxableAmount * cgstPercentage) / 100
      : 0;

  const sgstAmount =
    gstType === 'CGST' &&
    taxableAmount > 0 &&
    gstPercentage > 0
      ? (taxableAmount * gstPercentage) / 100
      : 0;

  /*
   * OTHER GST TYPES
   *
   * SGST / IGST / UTGST:
   * normal single GST percentage calculation
   */
  const gstAmount =
    gstType === 'CGST'
      ? cgstAmount + sgstAmount
      : taxableAmount > 0 && gstPercentage > 0
        ? (taxableAmount * gstPercentage) / 100
        : 0;

  /*
   * FINAL TOTAL
   */
  const totalAfterGST =
    taxableAmount + gstAmount;

  const newStockLevel = selected
    ? Number(selected.currentStock || 0) + quantity
    : 0;

  React.useEffect(() => {
    if (selected?.supplierId && !supplierId) {
      form.setValue(
        'supplierId',
        selected.supplierId
      );
    }

    if (
      selected?.price !== undefined &&
      selected?.price !== null &&
      !unitCost
    ) {
      form.setValue(
        'unitCost',
        selected.price
      );
    }
  }, [
    selected,
    supplierId,
    unitCost,
    form,
  ]);

  /*
   * STOCK IN MUTATION
   */
  const mut = useMutation({
    mutationFn: transactionsApi.stockIn,

    onSuccess: (data) => {
      toast.success(
        `Stock in recorded — ${data.transaction.product.name} +${data.transaction.quantity}`
      );

      qc.invalidateQueries();

      form.reset({
        productId: '',
        supplierId: '',
        rackNumber: '',
        location: '',
        quantity: 1,
        unitCost: '',
        gstPercentage: 0,
        cgstPercentage: 0,
        gstType: 'CGST',
        transportationCharges: '',
        reference: '',
        date: today(),
        note: '',
      });

      setTransportation(false);
      setCategoryId('');
    },

    onError: (e) =>
      toast.error(
        e.friendly ||
        'Failed to record stock in'
      ),
  });

  /*
   * SUBMIT
   */
  const onSubmit = (v) => {
    const payload = {
      ...v,

      supplierId:
        v.supplierId || null,

      unitCost:
        v.unitCost === '' ||
        v.unitCost == null
          ? null
          : Number(v.unitCost),

      /*
       * CGST:
       * gstPercentage = SGST
       * cgstPercentage = CGST
       *
       * Other GST:
       * gstPercentage = selected GST rate
       */
      gstPercentage:
        Number(v.gstPercentage || 0),

      gstType:
        v.gstType || 'CGST',

      cgstPercentage:
        v.gstType === 'CGST'
          ? Number(v.cgstPercentage || 0)
          : null,

      /*
       * Transportation
       */
      transportationCharges:
        transportation
          ? Number(
              v.transportationCharges || 0
            )
          : 0,

      /*
       * Calculated GST
       */
      gstAmount,

      /*
       * Final amount
       */
      totalAmount:
        totalAfterGST,

      date:
        dayjs(v.date).toISOString(),
    };

    mut.mutate(payload);
  };

  return (
    <div data-testid="page-stock-in">

      <PageHeader
        overline="Operations · Inward"
        title="Stock In"
        description="Receive inventory from a vendor. Creates an immutable transaction, links the supplier, captures unit cost, GST and transportation and updates stock atomically."
        actions={
          <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              All fields marked * are required
            </span>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* FORM */}
        <div className="xl:col-span-3 card-flat p-0 overflow-hidden">

          <div className="px-6 py-4 border-b border-border bg-zinc-50/60">
            <div className="flex items-center gap-2">

              <div className="h-7 w-7 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                <ArrowDownToLine className="w-4 h-4" />
              </div>

              <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
                New inward entry
              </h2>

            </div>
          </div>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="p-6 grid grid-cols-2 gap-5"
            data-testid="stockin-form"
          >

            {/* CATEGORY */}
            <div className="col-span-2">

              <Label className="flex items-center gap-1.5 mb-1.5">
                <Package className="w-3.5 h-3.5" />
                Category
              </Label>

              <SearchableOptionSelect
                options={categories}
                value={categoryId}
                onChange={(value) => {
                  setCategoryId(value);
                  form.setValue('productId', '', {
                    shouldValidate: true,
                  });
                }}
                placeholder="Select category"
                searchPlaceholder="Search category…"
                noneOption={{ label: "All categories" }}
              />

            </div>

            {/* PRODUCT */}
            <div className="col-span-2">

              <div className="flex items-center justify-between mb-1.5">

                <Label className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  Product *
                </Label>

                <QuickCreate
                  label="New product"
                  title="Create new product"
                  schema={productSchema}
                  defaults={{
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
                  }}
                  fields={[
                    {
                      name: 'sku',
                      label: 'SKU',
                      required: true,
                      placeholder: 'PRD-0009',
                      half: true,
                      full: false,
                    },
                    {
                      name: 'name',
                      label: 'Product name',
                      required: true,
                      half: true,
                      full: false,
                    },
                    {
                      name: 'unit',
                      label: 'Unit',
                      placeholder: 'pcs, kg, roll…',
                      half: true,
                      full: false,
                    },
                    {
                      name: 'price',
                      label: 'List price (₹)',
                      type: 'number',
                      step: '0.01',
                      min: '0',
                      half: true,
                      full: false,
                    },
                    {
                      name: 'minStock',
                      label: 'Minimum stock',
                      type: 'number',
                      min: '0',
                      half: true,
                      full: false,
                    },
                    {
                      name: 'currentStock',
                      label: 'Opening stock',
                      type: 'number',
                      min: '0',
                      half: true,
                      full: false,
                    },
                    {
                      name: 'location',
                      label: 'Location',
                      half: true,
                      full: false,
                    },
                    {
                      name: 'rackNumber',
                      label: 'Rack Number',
                      half: true,
                      full: false,
                    },
                    {
                      name: 'description',
                      label: 'Description',
                      textarea: true,
                    },
                  ]}
                  createFn={(v) =>
                    productsApi.create({
                      ...v,
                      categoryId:
                        categoryId || null,
                      supplierId: null,
                      location:
                        v.location || null,
                      rackNumber:
                        v.rackNumber || null,
                    })
                  }
                  invalidateKeys={[
                    ['prods-all'],
                    ['products'],
                    ['summary'],
                    ['inventory'],
                  ]}
                  onCreated={(id) =>
                    form.setValue(
                      'productId',
                      id,
                      {
                        shouldValidate: true,
                      }
                    )
                  }
                  testId="stockin-quick-product"
                />

              </div>

              <Select
                value={productId}
                onValueChange={(v) =>
                  form.setValue(
                    'productId',
                    v,
                    {
                      shouldValidate: true,
                    }
                  )
                }
              >

                <SelectTrigger data-testid="stockin-product">
                  <SelectValue placeholder="Select a product to receive" />
                </SelectTrigger>

                <SelectContent>

                  {filteredProducts.map((p) => (
                    <SelectItem
                      key={p.id}
                      value={p.id}
                    >
                      <span className="font-mono text-xs mr-2 text-muted-foreground">
                        {p.sku}
                      </span>

                      {p.name}
                    </SelectItem>
                  ))}

                </SelectContent>

              </Select>

              {form.formState.errors.productId && (
                <p className="text-xs text-red-600 mt-1">
                  {form.formState.errors.productId.message}
                </p>
              )}

            </div>

            {/* VENDOR */}
            <div className="col-span-2">

              <div className="flex items-center justify-between mb-1.5">

                <Label className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" />
                  Vendor
                </Label>

                <QuickCreate
                  label="New vendor"
                  title="Create new vendor"
                  schema={supplierSchema}
                  defaults={{
                    name: '',
                    contact: '',
                    phone: '',
                    email: '',
                    address: '',
                    gstNumber: '',
                  }}
                  fields={[
                    {
                      name: 'name',
                      label: 'Vendor name',
                      required: true,
                    },
                    {
                      name: 'contact',
                      label: 'Contact person',
                      half: true,
                      full: false,
                    },
                    {
                      name: 'phone',
                      label: 'Phone',
                      half: true,
                      full: false,
                    },
                    {
                      name: 'email',
                      label: 'Email',
                      type: 'email',
                    },
                    {
                      name: 'gstNumber',
                      label: 'GST Number / GSTIN',
                      placeholder: 'Enter GSTIN',
                    },
                    {
                      name: 'address',
                      label: 'Address',
                      textarea: true,
                    },
                  ]}
                  createFn={suppliersApi.create}
                  invalidateKeys={[
                    ['sups-all'],
                    ['suppliers'],
                  ]}
                  onCreated={(id) =>
                    form.setValue(
                      'supplierId',
                      id
                    )
                  }
                  testId="stockin-quick-vendor"
                />

              </div>

              <SearchableOptionSelect
                options={suppliers}
                value={supplierId}
                onChange={(value) =>
                  form.setValue('supplierId', value, {
                    shouldValidate: true,
                  })
                }
                placeholder="Select vendor / supplier"
                searchPlaceholder="Search vendor…"
                noneOption={{ label: '— No vendor —' }}
                getSearchText={(supplier) =>
                  `${supplier.name || ''} ${supplier.phone || ''}`
                }
                renderOption={(supplier, selectedOnly) => (
                  <>
                    {supplier.name}
                    {supplier.phone && !selectedOnly ? (
                      <span className="text-muted-foreground text-xs ml-2">
                        · {supplier.phone}
                      </span>
                    ) : null}
                  </>
                )}
              />

              {selectedSupplier && (
                <p className="text-xs text-muted-foreground mt-1">
                  Receiving from {selectedSupplier.name}
                </p>
              )}

            </div>

            {/* QUANTITY */}
            <div>

              <Label className="flex items-center gap-1.5 mb-1.5">
                <Hash className="w-3.5 h-3.5" />
                Quantity *
              </Label>

              <div className="relative">

                <Input
                  type="number"
                  min="1"
                  {...form.register('quantity')}
                  data-testid="stockin-quantity"
                  className="pr-14 font-mono"
                />

                {selected && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
                    {selected.unit}
                  </span>
                )}

              </div>

              {form.formState.errors.quantity && (
                <p className="text-xs text-red-600 mt-1">
                  {form.formState.errors.quantity.message}
                </p>
              )}

            </div>

            {/* PURCHASE PRICE */}
            <div>

              <Label className="flex items-center gap-1.5 mb-1.5">
                <IndianRupee className="w-3.5 h-3.5" />
                Purchase Price *
              </Label>

              <div className="relative">

                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  ₹
                </span>

                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter purchase price"
                  {...form.register('unitCost')}
                  data-testid="stockin-unit-cost"
                  className="pl-7 font-mono"
                />

              </div>

              {form.formState.errors.unitCost && (
                <p className="text-xs text-red-600 mt-1">
                  {form.formState.errors.unitCost.message}
                </p>
              )}

              <p className="text-xs text-muted-foreground mt-1">
                Purchase price per unit
              </p>

            </div>

            {/* GST TYPE */}
            <div>

              <Label className="flex items-center gap-1.5 mb-1.5">
                <FileText className="w-3.5 h-3.5" />
                GST Type *
              </Label>

              <Select
                value={gstType}
                onValueChange={(v) => {

                  form.setValue(
                    'gstType',
                    v,
                    {
                      shouldValidate: true,
                    }
                  );

                  if (v !== 'CGST') {
                    form.setValue('cgstPercentage', 0);
                  }

                }}
              >

                <SelectTrigger data-testid="stockin-gst-type">
                  <SelectValue placeholder="Select GST type" />
                </SelectTrigger>

                <SelectContent>

                  <SelectItem value="CGST">
                    CGST
                  </SelectItem>

                  <SelectItem value="SGST">
                    SGST
                  </SelectItem>

                  <SelectItem value="IGST">
                    IGST
                  </SelectItem>

                  <SelectItem value="UTGST">
                    UTGST
                  </SelectItem>

                </SelectContent>

              </Select>

            </div>

            {/* GST / SGST PERCENTAGE */}
            <div>

              <Label className="flex items-center gap-1.5 mb-1.5">

                <Percent className="w-3.5 h-3.5" />

                {gstType === 'CGST'
                  ? 'SGST Percentage *'
                  : 'GST Percentage *'}

              </Label>

              <div className="relative">

                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder={
                    gstType === 'CGST'
                      ? 'e.g. 9'
                      : 'e.g. 18'
                  }
                  {...form.register(
                    'gstPercentage'
                  )}
                  data-testid="stockin-gst-percentage"
                  className="pr-8 font-mono"
                />

                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  %
                </span>

              </div>

              {form.formState.errors.gstPercentage && (
                <p className="text-xs text-red-600 mt-1">
                  {form.formState.errors.gstPercentage.message}
                </p>
              )}

            </div>

            {/* CGST PERCENTAGE */}
            {gstType === 'CGST' && (
              <div>

                <Label className="flex items-center gap-1.5 mb-1.5">

                  <Percent className="w-3.5 h-3.5" />

                  CGST Percentage *

                </Label>

                <div className="relative">

                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="e.g. 9"
                    {...form.register('cgstPercentage')}
                    className="pr-8 font-mono"
                    data-testid="stockin-cgst-percentage"
                  />

                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>

                </div>

                <p className="text-xs text-muted-foreground mt-1">
                  Enter CGST percentage manually
                </p>

              </div>
            )}

            {/* TRANSPORTATION */}
            <div className="col-span-2">

              <Label className="flex items-center gap-1.5 mb-1.5">
                <Truck className="w-3.5 h-3.5" />
                Transportation
              </Label>

              <Select
                value={
                  transportation
                    ? 'yes'
                    : 'no'
                }
                onValueChange={(v) => {

                  const enabled =
                    v === 'yes';

                  setTransportation(
                    enabled
                  );

                  if (!enabled) {
                    form.setValue(
                      'transportationCharges',
                      ''
                    );
                  }

                }}
              >

                <SelectTrigger data-testid="stockin-transportation">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>

                  <SelectItem value="no">
                    No
                  </SelectItem>

                  <SelectItem value="yes">
                    Yes
                  </SelectItem>

                </SelectContent>

              </Select>

            </div>

            {/* TRANSPORTATION CHARGES */}
            {transportation && (
              <div className="col-span-2">

                <Label className="flex items-center gap-1.5 mb-1.5">
                  <IndianRupee className="w-3.5 h-3.5" />
                  Transportation Charges
                </Label>

                <div className="relative">

                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    ₹
                  </span>

                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Enter transportation charges"
                    {...form.register(
                      'transportationCharges'
                    )}
                    className="pl-7 font-mono"
                    data-testid="stockin-transportation-charges"
                  />

                </div>

              </div>
            )}

            {/* LOCATION */}
            <div>

              <Label className="flex items-center gap-1.5 mb-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Location
              </Label>

              <Input
                {...form.register('location')}
                placeholder="e.g. Warehouse A"
                data-testid="stockin-location"
              />

            </div>

            {/* RACK */}
            <div>

              <Label className="flex items-center gap-1.5 mb-1.5">
                <Archive className="w-3.5 h-3.5" />
                Rack Number
              </Label>

              <Input
                {...form.register('rackNumber')}
                placeholder="e.g. R-01"
                data-testid="stockin-rack-number"
              />

            </div>

            {/* DATE */}
            <div>

              <Label className="flex items-center gap-1.5 mb-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                Date *
              </Label>

              <Input
                type="date"
                {...form.register('date')}
                data-testid="stockin-date"
              />

            </div>

            {/* REFERENCE */}
            <div>

              <Label className="flex items-center gap-1.5 mb-1.5">
                <FileText className="w-3.5 h-3.5" />
                Reference #
              </Label>

              <Input
                placeholder="Invoice / PO / DC number"
                {...form.register('reference')}
                data-testid="stockin-reference"
              />

            </div>

            {/* NOTE */}
            <div className="col-span-2">

              <Label>Note</Label>

              <Textarea
                rows={2}
                placeholder="Additional notes about this receipt…"
                {...form.register('note')}
                data-testid="stockin-note"
              />

            </div>

            {/* SUMMARY */}
            {selected && (
              <div
                className="col-span-2 rounded-md border border-border bg-zinc-50/70 divide-x divide-border grid grid-cols-2 md:grid-cols-4"
                data-testid="stockin-summary"
              >

                <div className="p-3">

                  <div className="overline text-[10px]">
                    Current
                  </div>

                  <div className="mt-1 font-mono text-sm font-semibold">
                    {formatNumber(
                      selected.currentStock
                    )}

                    <span className="text-muted-foreground font-normal text-xs">
                      {' '}
                      {selected.unit}
                    </span>
                  </div>

                </div>

                <div className="p-3">

                  <div className="overline text-[10px]">
                    After receipt
                  </div>

                  <div className="mt-1 font-mono text-sm font-semibold text-emerald-600">
                    {formatNumber(
                      newStockLevel
                    )}

                    <span className="text-muted-foreground font-normal text-xs">
                      {' '}
                      {selected.unit}
                    </span>
                  </div>

                </div>

                <div className="p-3">

                  <div className="overline text-[10px]">
                    Taxable Amount
                  </div>

                  <div className="mt-1 font-mono text-sm font-semibold">
                    {taxableAmount
                      ? formatINR(
                          taxableAmount
                        )
                      : '—'}
                  </div>

                </div>

                <div className="p-3">

                  <div className="overline text-[10px]">
                    Total After GST
                  </div>

                  <div className="mt-1 font-mono text-sm font-semibold text-emerald-600">
                    {totalAfterGST
                      ? formatINR(
                          totalAfterGST
                        )
                      : '—'}
                  </div>

                </div>

              </div>
            )}

            {/* GST BREAKDOWN */}
            {(baseAmount > 0 ||
              gstPercentage > 0 ||
              cgstPercentage > 0 ||
              transportationCharges > 0) && (

              <div className="col-span-2 rounded-md border border-border bg-white p-4">

                <div className="flex items-center justify-between mb-3">

                  <div className="text-sm font-semibold text-zinc-900">
                    GST Breakdown
                  </div>

                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">

                    {gstType === 'CGST'
                      ? `CGST + SGST`
                      : `${gstType} ${gstPercentage}%`}

                  </Badge>

                </div>

                <div className="space-y-2 text-sm">

                  <div className="flex justify-between">

                    <span className="text-muted-foreground">
                      Quantity
                    </span>

                    <span className="font-mono">
                      {formatNumber(quantity)}
                    </span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-muted-foreground">
                      Purchase price / unit
                    </span>

                    <span className="font-mono">
                      {unitCost
                        ? formatINR(
                            Number(unitCost)
                          )
                        : '—'}
                    </span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-muted-foreground">
                      Purchase amount
                    </span>

                    <span className="font-mono">
                      {formatINR(
                        baseAmount
                      )}
                    </span>

                  </div>

                  {transportation && (
                    <div className="flex justify-between">

                      <span className="text-muted-foreground">
                        Transportation
                      </span>

                      <span className="font-mono">
                        {formatINR(
                          transportationCharges
                        )}
                      </span>

                    </div>
                  )}

                  <div className="flex justify-between">

                    <span className="text-muted-foreground">
                      Taxable amount
                    </span>

                    <span className="font-mono font-medium">
                      {formatINR(
                        taxableAmount
                      )}
                    </span>

                  </div>

                  {/* CGST + SGST */}
                  {gstType === 'CGST' && (
                    <>
                      <div className="flex justify-between">

                        <span className="text-muted-foreground">
                          SGST ({gstPercentage}%)
                        </span>

                        <span className="font-mono">
                          {formatINR(
                            sgstAmount
                          )}
                        </span>

                      </div>

                      <div className="flex justify-between">

                        <span className="text-muted-foreground">
                          CGST ({cgstPercentage}%)
                        </span>

                        <span className="font-mono">
                          {formatINR(
                            cgstAmount
                          )}
                        </span>

                      </div>
                    </>
                  )}

                  {/* OTHER GST TYPES */}
                  {gstType !== 'CGST' && (
                    <div className="flex justify-between">

                      <span className="text-muted-foreground">
                        {gstType} ({gstPercentage}%)
                      </span>

                      <span className="font-mono">
                        {formatINR(
                          gstAmount
                        )}
                      </span>

                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between text-base">

                    <span className="font-semibold text-zinc-900">
                      Total after GST
                    </span>

                    <span className="font-mono font-semibold text-emerald-600">
                      {formatINR(
                        totalAfterGST
                      )}
                    </span>

                  </div>

                </div>

              </div>
            )}

            {/* ACTIONS */}
            <div className="col-span-2 flex items-center justify-between pt-3 border-t border-border">

              <button
                type="button"
                onClick={() => {

                  form.reset({
                    productId: '',
                    supplierId: '',
                    rackNumber: '',
                    location: '',
                    quantity: 1,
                    unitCost: '',
                    gstPercentage: 0,
                    gstType: 'CGST',
                    transportationCharges: '',
                    reference: '',
                    date: today(),
                    note: '',
                  });

                              setTransportation(false);
                  setCategoryId('');

                }}
                className="text-xs text-muted-foreground hover:text-zinc-900 transition-colors duration-150"
                data-testid="stockin-reset"
              >
                Reset form
              </button>

              <Button
                type="submit"
                disabled={
                  mut.isPending ||
                  !productId
                }
                className="bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-600"
                data-testid="stockin-submit"
              >

                <ArrowDownToLine className="w-4 h-4 mr-2" />

                {mut.isPending
                  ? 'Recording…'
                  : 'Record stock in'}

              </Button>

            </div>

          </form>

        </div>

        {/* RIGHT COLUMN */}
        <div className="xl:col-span-2 space-y-6">

          {/* PRODUCT PREVIEW */}
          {selected ? (
            <div
              className="card-flat p-6"
              data-testid="stockin-product-preview"
            >

              <div className="overline">
                Product
              </div>

              <div className="mt-1 flex items-baseline justify-between gap-3">

                <div className="min-w-0">

                  <h3 className="text-lg font-semibold tracking-tight text-zinc-900 truncate">
                    {selected.name}
                  </h3>

                  <div className="text-xs text-muted-foreground font-mono">
                    {selected.sku}
                  </div>

                </div>

                {selected.currentStock <=
                  selected.minStock && (

                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 border font-normal flex items-center gap-1">

                    <AlertTriangle className="w-3 h-3" />

                    Low

                  </Badge>

                )}

              </div>

              <Separator className="my-4" />

              <dl className="space-y-2.5 text-sm">

                <div className="flex justify-between">

                  <dt className="text-muted-foreground">
                    List price
                  </dt>

                  <dd className="font-mono">
                    {formatINR(
                      selected.price
                    )}
                  </dd>

                </div>

                <div className="flex justify-between">

                  <dt className="text-muted-foreground">
                    Minimum stock
                  </dt>

                  <dd className="font-mono">
                    {selected.minStock}{' '}
                    {selected.unit}
                  </dd>

                </div>

                <div className="flex justify-between">

                  <dt className="text-muted-foreground">
                    On hand
                  </dt>

                  <dd
                    className={`font-mono font-semibold ${
                      selected.currentStock <=
                      selected.minStock
                        ? 'text-red-600'
                        : 'text-zinc-900'
                    }`}
                  >
                    {selected.currentStock}{' '}
                    {selected.unit}
                  </dd>

                </div>

              </dl>

              {/* LIVE PURCHASE SUMMARY */}
              {baseAmount > 0 && (
                <>

                  <Separator className="my-4" />

                  <div className="overline mb-2">
                    Current Purchase Summary
                  </div>

                  <div className="space-y-2 text-sm">

                    <div className="flex justify-between">

                      <span className="text-muted-foreground">
                        Purchase amount
                      </span>

                      <span className="font-mono">
                        {formatINR(
                          baseAmount
                        )}
                      </span>

                    </div>

                    {transportation && (
                      <div className="flex justify-between">

                        <span className="text-muted-foreground">
                          Transportation
                        </span>

                        <span className="font-mono">
                          {formatINR(
                            transportationCharges
                          )}
                        </span>

                      </div>
                    )}

                    {gstType === 'CGST' && (
                      <>
                        <div className="flex justify-between">

                          <span className="text-muted-foreground">
                            SGST ({gstPercentage}%)
                          </span>

                          <span className="font-mono">
                            {formatINR(
                              sgstAmount
                            )}
                          </span>

                        </div>

                        <div className="flex justify-between">

                          <span className="text-muted-foreground">
                            CGST ({cgstPercentage}%)
                          </span>

                          <span className="font-mono">
                            {formatINR(
                              cgstAmount
                            )}
                          </span>

                        </div>
                      </>
                    )}

                    {gstType !== 'CGST' && (
                      <div className="flex justify-between">

                        <span className="text-muted-foreground">
                          {gstType} ({gstPercentage}%)
                        </span>

                        <span className="font-mono">
                          {formatINR(
                            gstAmount
                          )}
                        </span>

                      </div>
                    )}

                    <div className="flex justify-between font-semibold">

                      <span>
                        Total after GST
                      </span>

                      <span className="font-mono text-emerald-600">
                        {formatINR(
                          totalAfterGST
                        )}
                      </span>

                    </div>

                  </div>

                </>
              )}

              {selectedSupplier && (
                <>

                  <Separator className="my-4" />

                  <div className="overline mb-2">
                    Receiving from
                  </div>

                  <div className="text-sm font-medium text-zinc-900">
                    {selectedSupplier.name}
                  </div>

                  {selectedSupplier.contact && (
                    <div className="text-xs text-muted-foreground">
                      {selectedSupplier.contact}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground mt-1 space-x-3">

                    {selectedSupplier.phone && (
                      <span>
                        {selectedSupplier.phone}
                      </span>
                    )}

                    {selectedSupplier.email && (
                      <span>
                        {selectedSupplier.email}
                      </span>
                    )}

                  </div>

                </>
              )}

            </div>

          ) : (

            <div
              className="card-flat p-6 border-dashed"
              data-testid="stockin-empty-preview"
            >

              <div className="overline">
                Product
              </div>

              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Select a product to see live stock, cost and vendor details here.
              </p>

              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">

                <TrendingUp className="w-3.5 h-3.5" />

                Tip: choosing a product auto-fills its default vendor and list price.

              </div>

            </div>

          )}

          {/* RECENT STOCK IN */}
          <div
            className="card-flat p-6"
            data-testid="stockin-recent"
          >

            <div className="flex items-center gap-2 mb-3">

              <PackagePlus className="w-4 h-4 text-emerald-600" />

              <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
                Recent inward
              </h2>

            </div>

            {(recent.items || []).length === 0 ? (

              <div className="text-xs text-muted-foreground py-8 text-center">
                No stock-in yet.
              </div>

            ) : (

              <div className="divide-y divide-border">

                {(recent.items || []).map((t) => (

                  <div
                    key={t.id}
                    className="py-3 flex items-start justify-between gap-3"
                  >

                    <div className="min-w-0">

                      <div className="text-sm font-medium text-zinc-900 truncate">
                        {t.product?.name}
                      </div>

                      <div className="text-xs text-muted-foreground truncate">

                        {t.supplier
                          ? `From ${t.supplier.name} · `
                          : ''}

                        {formatDateTime(
                          t.date
                        )}

                      </div>

                      {t.reference && (
                        <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          Ref: {t.reference}
                        </div>
                      )}

                    </div>

                    <div className="text-right shrink-0">

                      <div className="text-sm font-mono font-semibold text-emerald-600">
                        +{t.quantity}
                      </div>

                      {t.unitCost != null && (
                        <>

                          <div className="text-[11px] text-muted-foreground font-mono">

                            {formatINR(
                              t.unitCost
                            )}{' '}

                            / unit

                          </div>

                          <div className="text-[11px] text-muted-foreground font-mono">

                            Base:{' '}

                            {formatINR(
                              t.unitCost *
                                t.quantity
                            )}

                          </div>

                          {t.gstPercentage != null && (
                            <div className="text-[11px] text-muted-foreground font-mono">

                              {t.gstType ||
                                'GST'}{' '}

                              {t.gstPercentage}%:{' '}

                              {formatINR(
                                t.gstAmount ||
                                  0
                              )}

                            </div>
                          )}

                          {t.totalAmount != null && (
                            <div className="text-[11px] font-semibold text-emerald-600 font-mono">

                              Total:{' '}

                              {formatINR(
                                t.totalAmount
                              )}

                            </div>
                          )}

                        </>
                      )}

                    </div>

                  </div>

                ))}

              </div>

            )}

          </div>

        </div>

      </div>

    </div>
  );
}
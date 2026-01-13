import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';
import * as crypto from 'crypto';

// Helper for default UUID
const generateUuid = () => crypto.randomUUID();

// --- Tenants (Multi-tenancy Support) ---
export const tenants = sqliteTable('tenants', {
    id: text('id').primaryKey().$defaultFn(generateUuid),
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone'),
    address: text('address'),
    taxId: text('tax_id'),
    logoUrl: text('logo_url'),
    currency: text('currency').default('EGP').notNull(),
    subscriptionPlan: text('subscription_plan').default('free'),
    subscriptionStartDate: integer('subscription_start_date', { mode: 'timestamp' }),
    nextRenewalDate: integer('next_renewal_date', { mode: 'timestamp' }),
    customerRating: text('customer_rating').default('Normal'), // Enum simulated
    adminNotes: text('admin_notes'),
    activityType: text('activity_type'),
    defaultPrintSales: text('default_print_sales').default('standard').notNull(),
    defaultPrintPOS: text('default_print_pos').default('thermal').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// --- Users ---
export const users = sqliteTable('users', {
    id: text('id').primaryKey().$defaultFn(generateUuid),
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    username: text('username').notNull().unique(),
    fullName: text('full_name').notNull(),
    email: text('email'),
    phone: text('phone'),    // Added
    address: text('address'), // Added
    passwordHash: text('password_hash').notNull(),
    role: text('role').default('CLIENT').notNull(), // Enum simulated
    status: text('status').default('ACTIVE').notNull(), // Enum simulated
    subscriptionEndsAt: integer('subscription_ends_at', { mode: 'timestamp' }),
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const usersRelations = relations(users, ({ one }) => ({
    tenant: one(tenants, {
        fields: [users.tenantId],
        references: [tenants.id],
    }),
}));

// --- Fiscal Years ---
export const fiscalYears = sqliteTable('fiscal_years', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    startDate: text('start_date').notNull(), // ISO Date string
    endDate: text('end_date').notNull(),   // ISO Date string
    isClosed: integer('is_closed', { mode: 'boolean' }).default(false).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const fiscalYearsRelations = relations(fiscalYears, ({ one }) => ({
    tenant: one(tenants, {
        fields: [fiscalYears.tenantId],
        references: [tenants.id],
    }),
}));

// --- Chart of Accounts (Tree Structure) ---
export const accounts = sqliteTable('accounts', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    type: text('type').notNull(), // Enum simulated
    parentId: integer('parent_id'),
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    balance: text('balance').default('0.00'), // Text for precision
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const accountsRelations = relations(accounts, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [accounts.tenantId],
        references: [tenants.id],
    }),
    parent: one(accounts, {
        fields: [accounts.parentId],
        references: [accounts.id],
        relationName: 'parent_child',
    }),
    children: many(accounts, {
        relationName: 'parent_child',
    }),
    journalLines: many(journalLines),
}));

// --- Journal Entries (Double Entry) ---
export const journalEntries = sqliteTable('journal_entries', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    fiscalYearId: integer('fiscal_year_id').references(() => fiscalYears.id).notNull(),
    entryNumber: text('entry_number').notNull(),
    transactionDate: text('transaction_date').notNull(), // ISO Date
    description: text('description'),
    reference: text('reference'),
    currency: text('currency').default('EGP').notNull(),
    exchangeRate: text('exchange_rate').default('1.000000').notNull(),
    status: text('status').default('draft').notNull(), // Enum simulated
    createdBy: text('created_by'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (table) => {
    return {
        tenantDateIdx: index('journal_entries_tenant_date_idx').on(table.tenantId, table.transactionDate),
        entryNumIdx: index('journal_entries_num_idx').on(table.tenantId, table.entryNumber),
    };
});

export const journalEntriesRelations = relations(journalEntries, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [journalEntries.tenantId],
        references: [tenants.id],
    }),
    fiscalYear: one(fiscalYears, {
        fields: [journalEntries.fiscalYearId],
        references: [fiscalYears.id],
    }),
    lines: many(journalLines),
    createdByUser: one(users, {
        fields: [journalEntries.createdBy],
        references: [users.id],
    }),
}));

// --- Journal Lines ---
export const journalLines = sqliteTable('journal_lines', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    journalEntryId: integer('journal_entry_id').references(() => journalEntries.id, { onDelete: 'cascade' }).notNull(),
    accountId: integer('account_id').references(() => accounts.id).notNull(),
    description: text('description'),
    debit: text('debit').default('0.00').notNull(),
    credit: text('credit').default('0.00').notNull(),
}, (table) => {
    return {
        accountEntryIdx: index('journal_lines_acc_entry_idx').on(table.accountId, table.journalEntryId),
    };
});

export const journalLinesRelations = relations(journalLines, ({ one }) => ({
    journalEntry: one(journalEntries, {
        fields: [journalLines.journalEntryId],
        references: [journalEntries.id],
    }),
    account: one(accounts, {
        fields: [journalLines.accountId],
        references: [accounts.id],
    }),
}));

// --- Categories ---
export const categories = sqliteTable('categories', {
    id: integer('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const categoriesRelations = relations(categories, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [categories.tenantId],
        references: [tenants.id],
    }),
    products: many(products),
}));

// --- Units ---
export const units = sqliteTable('units', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(), // e.g., Piece, Box, Kg
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const unitsRelations = relations(units, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [units.tenantId],
        references: [tenants.id],
    }),
    products: many(products),
}));

// --- Products / Inventory ---
export const products = sqliteTable('products', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    sku: text('sku').notNull(), // Internal Code (كود الصنف)
    barcode: text('barcode'),    // Scannable Barcode (الباركود) - Added
    type: text('type').default('goods').notNull(), // Enum simulated
    sellPrice: text('sell_price').default('0.00').notNull(),
    priceWholesale: text('price_wholesale').default('0.00'), // Wholesale Price (جملة)
    priceHalfWholesale: text('price_half_wholesale').default('0.00'), // Half Wholesale (نصف جملة)
    priceSpecial: text('price_special').default('0.00'), // Special Price (خاص)
    buyPrice: text('buy_price').default('0.00').notNull(),
    stockQuantity: text('stock_quantity').default('0.00').notNull(),
    minStock: integer('min_stock').default(0), // حد الطلب - Added
    requiresToken: integer('requires_token', { mode: 'boolean' }).default(false).notNull(),
    categoryId: integer('category_id').references(() => categories.id),
    unitId: integer('unit_id').references(() => units.id), // Added Link to Units
    location: text('location'), // مكان الصنف (Ref) - Added
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const productsRelations = relations(products, ({ one }) => ({
    tenant: one(tenants, {
        fields: [products.tenantId],
        references: [tenants.id],
    }),
    category: one(categories, {
        fields: [products.categoryId],
        references: [categories.id],
    }),
    unit: one(units, {
        fields: [products.unitId],
        references: [units.id],
    }),
}));

// --- Suppliers ---
export const suppliers = sqliteTable('suppliers', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    companyName: text('company_name'),
    email: text('email'),
    phone: text('phone'),
    address: text('address'),
    taxId: text('tax_id'),
    openingBalance: real('opening_balance').default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const suppliersRelations = relations(suppliers, ({ one }) => ({
    tenant: one(tenants, {
        fields: [suppliers.tenantId],
        references: [tenants.id],
    }),
}));


// --- Customers ---
export const customers = sqliteTable('customers', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    companyName: text('company_name'),
    email: text('email'),
    phone: text('phone'),
    address: text('address'),
    taxId: text('tax_id'),
    nationalId: text('national_id'), // رقم البطاقة
    creditLimit: real('credit_limit').default(0), // حد الائتمان
    paymentDay: integer('payment_day'), // يوم الدفع المفضل (1-31)
    openingBalance: real('opening_balance').default(0),
    priceLevel: text('price_level').default('retail').notNull(), // retail, wholesale, half_wholesale, special
    representativeId: integer('representative_id').references(() => representatives.id),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// --- Representatives (المناديب) ---
export const representatives = sqliteTable('representatives', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    phone: text('phone'),
    address: text('address'),
    type: text('type').default('sales').notNull(), // 'sales' or 'delivery'
    salary: text('salary').default('0.00'),
    commissionType: text('commission_type').default('percentage'), // 'percentage' or 'fixed_per_invoice'
    commissionRate: text('commission_rate').default('0.00'),
    notes: text('notes'),
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const representativesRelations = relations(representatives, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [representatives.tenantId],
        references: [tenants.id],
    }),
    invoices: many(invoices),
}));

// --- Installments (جدول الأقساط) ---
export const installments = sqliteTable('installments', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    customerId: integer('customer_id').references(() => customers.id, { onDelete: 'cascade' }).notNull(),
    invoiceId: integer('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }),
    dueDate: text('due_date').notNull(), // ISO Date
    amount: text('amount').notNull(),
    amountPaid: text('amount_paid').default('0.00').notNull(),
    status: text('status').default('pending').notNull(), // pending, paid, overdue, partially_paid
    paidDate: text('paid_date'),
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const installmentsRelations = relations(installments, ({ one }) => ({
    tenant: one(tenants, {
        fields: [installments.tenantId],
        references: [tenants.id],
    }),
    customer: one(customers, {
        fields: [installments.customerId],
        references: [customers.id],
    }),
    invoice: one(invoices, {
        fields: [installments.invoiceId],
        references: [invoices.id],
    }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [customers.tenantId],
        references: [tenants.id],
    }),
    invoices: many(invoices),
}));

// --- Invoices ---
export const invoices = sqliteTable('invoices', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    invoiceNumber: text('invoice_number').notNull(),
    customerId: integer('customer_id', { mode: 'number' }).references(() => customers.id),
    customerName: text('customer_name').notNull(),
    customerTaxId: text('customer_tax_id'),
    issueDate: text('issue_date').notNull(), // ISO Date
    dueDate: text('due_date'), // ISO Date
    currency: text('currency').default('EGP').notNull(),
    exchangeRate: text('exchange_rate').default('1.000000').notNull(),
    subtotal: text('subtotal').notNull(),
    taxTotal: text('tax_total').default('0.00').notNull(),
    totalAmount: text('total_amount').notNull(),
    discountAmount: text('discount_amount').default('0.00').notNull(),
    discountPercent: text('discount_percent').default('0'), // Added
    deliveryFee: text('delivery_fee').default('0.00'), // Added

    paymentMethod: text('payment_method').default('cash').notNull(), // cash, card, other

    // --- AR Fields ---
    paymentStatus: text("payment_status").notNull().default("paid"), // paid, partial, unpaid
    type: text("type").notNull().default("sale"), // sale, return
    priceType: text('price_type').default('retail').notNull(), // retail, wholesale, half_wholesale, special - Added
    storeId: integer('store_id').default(1), // Added Main Store by default

    relatedInvoiceId: text("related_invoice_id"), // for returns, links to original invoice
    notes: text("notes"),
    amountPaid: text('amount_paid').default('0.00').notNull(),

    status: text('status').default('draft').notNull(), // Enum simulated
    tokenNumber: integer('token_number'),
    qrCodeData: text('qr_code_data'),
    createdBy: text('created_by').references(() => users.id),
    // --- Installment Fields ---
    isInstallment: integer('is_installment', { mode: 'boolean' }).default(false),
    installmentDownPayment: text('installment_down_payment').default('0.00'),
    installmentCount: integer('installment_count').default(0),
    installmentInterest: text('installment_interest').default('0.00'), // % or fixed amount
    installmentMonthlyAmount: text('installment_monthly_amount').default('0.00'),
    representativeId: integer('representative_id').references(() => representatives.id),
    shiftId: integer('shift_id').references(() => shifts.id),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const invoiceItems = sqliteTable('invoice_items', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    invoiceId: integer('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }).notNull(),
    productId: integer('product_id').references(() => products.id),
    unitId: integer('unit_id').references(() => units.id), // Added
    storeId: integer('store_id').default(1), // Added (item level store)
    description: text('description').notNull(),
    quantity: text('quantity').notNull(),
    unitPrice: text('unit_price').notNull(),
    discount: text('discount').default('0.00'), // Added (item level discount)
    total: text('total').notNull(),
}, (table) => {
    return {
        invoiceProductIdx: index('invoice_items_invoice_prod_idx').on(table.invoiceId, table.productId),
    };
});

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [invoices.tenantId],
        references: [tenants.id],
    }),
    customer: one(customers, {
        fields: [invoices.customerId],
        references: [customers.id],
    }),
    representative: one(representatives, {
        fields: [invoices.representativeId],
        references: [representatives.id],
    }),
    shift: one(shifts, {
        fields: [invoices.shiftId],
        references: [shifts.id],
    }),
    items: many(invoiceItems),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
    invoice: one(invoices, {
        fields: [invoiceItems.invoiceId],
        references: [invoices.id],
    }),
    product: one(products, {
        fields: [invoiceItems.productId],
        references: [products.id],
    }),
}));

// --- Purchase Invoices ---
export const purchaseInvoices = sqliteTable('purchase_invoices', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    supplierId: integer('supplier_id', { mode: 'number' }).references(() => suppliers.id),
    supplierName: text('supplier_name').notNull(),
    invoiceNumber: text('invoice_number'), // رقم فاتورة المورد
    referenceNumber: text('reference_number'), // رقم داخلي (اختياري)
    issueDate: text('issue_date').notNull(), // ISO Date
    dueDate: text('due_date'), // ISO Date
    currency: text('currency').default('EGP').notNull(),
    exchangeRate: text('exchange_rate').default('1.000000').notNull(),

    subtotal: text('subtotal').notNull(),
    taxTotal: text('tax_total').default('0.00').notNull(),
    totalAmount: text('total_amount').notNull(),

    // Payment Info
    paymentStatus: text("payment_status").notNull().default("unpaid"), // paid, partial, unpaid
    amountPaid: text('amount_paid').default('0.00').notNull(),

    status: text('status').default('draft').notNull(), // draft, posted, void
    type: text("type").notNull().default("purchase"), // purchase, return
    relatedInvoiceId: integer('related_invoice_id'), // links to original purchase invoice
    notes: text("notes"),

    createdBy: text('created_by').references(() => users.id),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const purchaseInvoiceItems = sqliteTable('purchase_invoice_items', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    purchaseInvoiceId: integer('purchase_invoice_id').references(() => purchaseInvoices.id, { onDelete: 'cascade' }).notNull(),
    productId: integer('product_id').references(() => products.id),
    description: text('description').notNull(),
    quantity: text('quantity').notNull(),
    unitCost: text('unit_cost').notNull(), // سعر الشراء
    total: text('total').notNull(),
});

export const purchaseInvoicesRelations = relations(purchaseInvoices, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [purchaseInvoices.tenantId],
        references: [tenants.id],
    }),
    supplier: one(suppliers, {
        fields: [purchaseInvoices.supplierId],
        references: [suppliers.id],
    }),
    items: many(purchaseInvoiceItems),
    createdByUser: one(users, {
        fields: [purchaseInvoices.createdBy],
        references: [users.id],
    }),
}));

export const purchaseInvoiceItemsRelations = relations(purchaseInvoiceItems, ({ one }) => ({
    purchaseInvoice: one(purchaseInvoices, {
        fields: [purchaseInvoiceItems.purchaseInvoiceId],
        references: [purchaseInvoices.id],
    }),
    product: one(products, {
        fields: [purchaseInvoiceItems.productId],
        references: [products.id],
    }),
}));

// --- Financial Vouchers (Receipts & Payments) ---
export const vouchers = sqliteTable('vouchers', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    voucherNumber: text('voucher_number').notNull(),
    type: text('type').notNull(), // 'receipt' (قبض) or 'payment' (صرف)
    date: text('date').notNull(), // ISO Date
    amount: text('amount').notNull(),
    description: text('description'),
    reference: text('reference'), // Manual Ref or Check No

    // Linked Party (Customer or Supplier)
    partyType: text('party_type'), // 'customer', 'supplier', 'other'
    partyId: integer('party_id', { mode: 'number' }), // ID of customer or supplier if applicable

    // Linked Account (Target Account for Expenses/Income)
    accountId: integer('account_id').references(() => accounts.id),

    status: text('status').default('draft').notNull(),
    shiftId: integer('shift_id').references(() => shifts.id),
    createdBy: text('created_by').references(() => users.id),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const vouchersRelations = relations(vouchers, ({ one }) => ({
    tenant: one(tenants, {
        fields: [vouchers.tenantId],
        references: [tenants.id],
    }),
    createdByUser: one(users, {
        fields: [vouchers.createdBy],
        references: [users.id],
    }),
    account: one(accounts, {
        fields: [vouchers.accountId],
        references: [accounts.id],
    }),
    shift: one(shifts, {
        fields: [vouchers.shiftId],
        references: [shifts.id],
    }),
}));

// --- Audit Logs ---
export const auditLogs = sqliteTable('audit_logs', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    userId: text('user_id').references(() => users.id),
    action: text('action').notNull(),
    entity: text('entity').notNull(),
    entityId: text('entity_id').notNull(),
    details: text('details'),
    ipAddress: text('ip_address'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
    tenant: one(tenants, {
        fields: [auditLogs.tenantId],
        references: [tenants.id],
    }),
    user: one(users, {
        fields: [auditLogs.userId],
        references: [users.id],
    }),
}));
// --- Employees ---
export const employees = sqliteTable('employees', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    address: text('address'),
    phone: text('phone'),
    email: text('email'),
    basicSalary: text('basic_salary').default('0.00').notNull(),
    status: text('status').default('active').notNull(), // active, inactive
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const employeesRelations = relations(employees, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [employees.tenantId],
        references: [tenants.id],
    }),
    advances: many(advances),
    payrolls: many(payrolls),
}));

// --- Advances (السلف) ---
export const advances = sqliteTable('advances', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    employeeId: integer('employee_id').references(() => employees.id, { onDelete: 'cascade' }).notNull(),
    date: text('date').notNull(), // ISO Date
    salaryMonth: text('salary_month').notNull(), // "MM/YYYY" or similar
    amount: text('amount').notNull(),
    type: text('type').default('advance').notNull(), // advance (صرف), repayment (استرداد)
    treasuryAccountId: integer('treasury_account_id').references(() => accounts.id),
    status: text('status').default('pending').notNull(), // pending (مفتوحة), deducted (تم الخصم)
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const advancesRelations = relations(advances, ({ one }) => ({
    tenant: one(tenants, {
        fields: [advances.tenantId],
        references: [tenants.id],
    }),
    employee: one(employees, {
        fields: [advances.employeeId],
        references: [employees.id],
    }),
    treasury: one(accounts, {
        fields: [advances.treasuryAccountId],
        references: [accounts.id],
    }),
}));

// --- Payrolls (دفع الرواتب) ---
export const payrolls = sqliteTable('payrolls', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    employeeId: integer('employee_id').references(() => employees.id, { onDelete: 'cascade' }).notNull(),
    paymentDate: text('payment_date').notNull(), // ISO Date
    salaryMonth: text('salary_month').notNull(), // "MM/YYYY"
    basicSalary: text('basic_salary').notNull(),
    incentives: text('incentives').default('0.00'),
    deductions: text('deductions').default('0.00'),
    advanceDeductions: text('advance_deductions').default('0.00'),
    netSalary: text('net_salary').notNull(),
    treasuryAccountId: integer('treasury_account_id').references(() => accounts.id),
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const payrollsRelations = relations(payrolls, ({ one }) => ({
    tenant: one(tenants, {
        fields: [payrolls.tenantId],
        references: [tenants.id],
    }),
    employee: one(employees, {
        fields: [payrolls.employeeId],
        references: [employees.id],
    }),
    treasury: one(accounts, {
        fields: [payrolls.treasuryAccountId],
        references: [accounts.id],
    }),
}));

// --- Attendance (الحضور والانصراف) ---
export const attendance = sqliteTable('attendance', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    employeeId: integer('employee_id').references(() => employees.id, { onDelete: 'cascade' }).notNull(),
    date: text('date').notNull(), // ISO Date
    checkIn: text('check_in'),
    checkOut: text('check_out'),
    status: text('status').default('present').notNull(), // present, absent, leave, late
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const attendanceRelations = relations(attendance, ({ one }) => ({
    tenant: one(tenants, {
        fields: [attendance.tenantId],
        references: [tenants.id],
    }),
    employee: one(employees, {
        fields: [attendance.employeeId],
        references: [employees.id],
    }),
}));

// --- Licensing (Desktop Only) ---
export const licensing = sqliteTable('licensing', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    trialStartDate: integer('trial_start_date', { mode: 'timestamp' }).default(sql`(unixepoch())`),
    isActivated: integer('is_activated', { mode: 'boolean' }).default(false).notNull(),
    activationKey: text('activation_key'),
    machineId: text('machine_id'),
    lastUsedDate: integer('last_used_date', { mode: 'timestamp' }),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// --- Shifts (ورديات الكاشير) ---
export const shifts = sqliteTable('shifts', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    userId: text('user_id').references(() => users.id).notNull(), // Cashier
    shiftNumber: integer('shift_number').notNull(), // 1, 2, 3...

    startTime: integer('start_time', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
    endTime: integer('end_time', { mode: 'timestamp' }),

    startBalance: text('start_balance').default('0.00').notNull(), // رصيد بداية الوردية
    endBalance: text('end_balance').default('0.00'), // الرصيد الفعلي عند الإغلاق (الجرد)

    // System Calculated Totals (للمقارنة عند الإغلاق)
    systemCashBalance: text('system_cash_balance').default('0.00'),
    systemVisaBalance: text('system_visa_balance').default('0.00'),
    systemUnpaidBalance: text('system_unpaid_balance').default('0.00'), // الآجل

    status: text('status').default('open').notNull(), // open, closed
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const shiftsRelations = relations(shifts, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [shifts.tenantId],
        references: [tenants.id],
    }),
    user: one(users, {
        fields: [shifts.userId],
        references: [users.id],
    }),
    invoices: many(invoices),
    vouchers: many(vouchers),
}));

import { pgTable, serial, text, decimal, boolean, timestamp, integer, uuid, date, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- Tenants (Multi-tenancy Support) ---
export const tenants = pgTable('tenants', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone'),
    address: text('address'),
    taxId: text('tax_id'),
    logoUrl: text('logo_url'),
    currency: text('currency').default('EGP').notNull(),
    subscriptionPlan: text('subscription_plan').default('free'),
    subscriptionStartDate: timestamp('subscription_start_date'),
    nextRenewalDate: timestamp('next_renewal_date'),
    customerRating: text('customer_rating', { enum: ['VIP', 'Normal', 'Difficult'] }).default('Normal'),
    adminNotes: text('admin_notes'),
    activityType: text('activity_type'), // e.g. 'Grocery', 'Tech', 'Restaurant'
    defaultPrintSales: text('default_print_sales').default('standard').notNull(),
    defaultPrintPOS: text('default_print_pos').default('thermal').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Users ---
export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    username: text('username').notNull().unique(), // Add username
    fullName: text('full_name').notNull(),
    email: text('email'), // Make email optional if not strictly needed or keep it
    phone: text('phone'),
    address: text('address'),
    passwordHash: text('password_hash').notNull(),
    role: text('role', { enum: ['CLIENT', 'SUPER_ADMIN', 'admin', 'cashier'] }).default('CLIENT').notNull(),
    status: text('status', { enum: ['ACTIVE', 'SUSPENDED'] }).default('ACTIVE').notNull(),
    subscriptionEndsAt: timestamp('subscription_ends_at'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
    return {
        emailIdx: uniqueIndex('email_idx').on(table.email),
    };
});

export const usersRelations = relations(users, ({ one }) => ({
    tenant: one(tenants, {
        fields: [users.tenantId],
        references: [tenants.id],
    }),
}));

// --- Fiscal Years ---
export const fiscalYears = pgTable('fiscal_years', {
    id: serial('id').primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    isClosed: boolean('is_closed').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

export const fiscalYearsRelations = relations(fiscalYears, ({ one }) => ({
    tenant: one(tenants, {
        fields: [fiscalYears.tenantId],
        references: [tenants.id],
    }),
}));

// --- Chart of Accounts (Tree Structure) ---
export const accounts = pgTable('accounts', {
    id: serial('id').primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    type: text('type', { enum: ['asset', 'liability', 'equity', 'revenue', 'expense'] }).notNull(),
    parentId: integer('parent_id'),
    isActive: boolean('is_active').default(true).notNull(),
    balance: decimal('balance', { precision: 20, scale: 2 }).default('0.00'),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
    return {
        codeIdx: uniqueIndex('account_code_idx').on(table.code, table.tenantId),
    };
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
export const journalEntries = pgTable('journal_entries', {
    id: serial('id').primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    fiscalYearId: integer('fiscal_year_id').references(() => fiscalYears.id).notNull(),
    entryNumber: text('entry_number').notNull(),
    transactionDate: date('transaction_date').notNull(),
    description: text('description'),
    reference: text('reference'),
    currency: text('currency').default('EGP').notNull(),
    exchangeRate: decimal('exchange_rate', { precision: 10, scale: 6 }).default('1.000000').notNull(),
    status: text('status', { enum: ['draft', 'posted', 'void'] }).default('draft').notNull(),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
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
export const journalLines = pgTable('journal_lines', {
    id: serial('id').primaryKey(),
    journalEntryId: integer('journal_entry_id').references(() => journalEntries.id, { onDelete: 'cascade' }).notNull(),
    accountId: integer('account_id').references(() => accounts.id).notNull(),
    description: text('description'),
    debit: decimal('debit', { precision: 20, scale: 2 }).default('0.00').notNull(),
    credit: decimal('credit', { precision: 20, scale: 2 }).default('0.00').notNull(),
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
export const categories = pgTable('categories', {
    id: serial('id').primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow(),
});

// --- Units ---
export const units = pgTable('units', {
    id: serial('id').primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(), // e.g., Piece, Box, Kg
    createdAt: timestamp('created_at').defaultNow(),
});

export const unitsRelations = relations(units, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [units.tenantId],
        references: [tenants.id],
    }),
    products: many(products),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [categories.tenantId],
        references: [tenants.id],
    }),
    products: many(products),
}));

// --- Products / Inventory ---
export const products = pgTable('products', {
    id: serial('id').primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    sku: text('sku').notNull(),
    barcode: text('barcode'),
    type: text('type', { enum: ['service', 'goods'] }).default('goods').notNull(),
    sellPrice: decimal('sell_price', { precision: 15, scale: 2 }).default('0.00').notNull(),
    priceWholesale: decimal('price_wholesale', { precision: 15, scale: 2 }).default('0.00'),
    priceHalfWholesale: decimal('price_half_wholesale', { precision: 15, scale: 2 }).default('0.00'),
    priceSpecial: decimal('price_special', { precision: 15, scale: 2 }).default('0.00'),
    buyPrice: decimal('buy_price', { precision: 15, scale: 2 }).default('0.00').notNull(),
    stockQuantity: decimal('stock_quantity', { precision: 15, scale: 2 }).default('0.00').notNull(),
    minStock: integer('min_stock').default(0),
    requiresToken: boolean('requires_token').default(false).notNull(),
    categoryId: integer('category_id').references(() => categories.id),
    unitId: integer('unit_id').references(() => units.id),
    location: text('location'),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
    return {
        skuIdx: uniqueIndex('sku_idx').on(table.sku, table.tenantId),
    };
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
export const suppliers = pgTable('suppliers', {
    id: serial('id').primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    companyName: text('company_name'),
    email: text('email'),
    phone: text('phone'),
    address: text('address'),
    taxId: text('tax_id'),
    openingBalance: decimal('opening_balance').default('0'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const suppliersRelations = relations(suppliers, ({ one }) => ({
    tenant: one(tenants, {
        fields: [suppliers.tenantId],
        references: [tenants.id],
    }),
}));

// --- Customers ---
export const customers = pgTable('customers', {
    id: serial('id').primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    companyName: text('company_name'),
    email: text('email'),
    phone: text('phone'),
    address: text('address'),
    taxId: text('tax_id'),
    nationalId: text('national_id'),
    creditLimit: decimal('credit_limit', { precision: 15, scale: 2 }).default('0.00'),
    paymentDay: integer('payment_day'),
    openingBalance: decimal('opening_balance').default('0'),
    priceLevel: text('price_level').default('retail').notNull(), // retail, wholesale, half_wholesale, special
    representativeId: integer('representative_id').references(() => representatives.id),
    createdAt: timestamp('created_at').defaultNow(),
});

// --- Representatives ---
export const representatives = pgTable('representatives', {
    id: serial('id').primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    phone: text('phone'),
    address: text('address'),
    type: text('type', { enum: ['sales', 'delivery'] }).default('sales').notNull(),
    salary: decimal('salary', { precision: 15, scale: 2 }).default('0.00'),
    commissionType: text('commission_type').default('percentage'), // 'percentage' or 'fixed_per_invoice'
    commissionRate: decimal('commission_rate', { precision: 5, scale: 2 }).default('0.00'),
    notes: text('notes'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

export const representativesRelations = relations(representatives, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [representatives.tenantId],
        references: [tenants.id],
    }),
    invoices: many(invoices),
}));

// --- Installments ---
export const installments = pgTable('installments', {
    id: serial('id').primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    customerId: integer('customer_id').references(() => customers.id, { onDelete: 'cascade' }).notNull(),
    invoiceId: integer('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }),
    dueDate: date('due_date').notNull(),
    amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
    amountPaid: decimal('amount_paid', { precision: 15, scale: 2 }).default('0.00').notNull(),
    status: text('status').default('pending').notNull(), // pending, paid, overdue, partially_paid
    paidDate: date('paid_date'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
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
export const invoices = pgTable('invoices', {
    id: serial('id').primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    invoiceNumber: text('invoice_number').notNull(),
    customerId: integer('customer_id').references(() => customers.id),
    customerName: text('customer_name').notNull(), // Keep as fallback/snapshot
    customerTaxId: text('customer_tax_id'),
    issueDate: date('issue_date').notNull(),
    dueDate: date('due_date'),
    currency: text('currency').default('EGP').notNull(),
    exchangeRate: decimal('exchange_rate', { precision: 10, scale: 6 }).default('1.000000').notNull(),
    subtotal: decimal('subtotal', { precision: 15, scale: 2 }).notNull(),
    taxTotal: decimal('tax_total', { precision: 15, scale: 2 }).default('0.00').notNull(),
    totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull(),
    discountAmount: decimal('discount_amount', { precision: 15, scale: 2 }).default('0.00').notNull(),
    discountPercent: decimal('discount_percent', { precision: 5, scale: 2 }).default('0.00'),
    deliveryFee: decimal('delivery_fee', { precision: 15, scale: 2 }).default('0.00'),
    paymentMethod: text('payment_method').default('cash').notNull(), // cash, card, other
    priceType: text('price_type').default('retail').notNull(),
    storeId: integer('store_id').default(1),

    // --- AR Fields ---
    paymentStatus: text("payment_status").notNull().default("paid"), // paid, partial, unpaid
    type: text("type").notNull().default("sale"), // sale, return
    relatedInvoiceId: text("related_invoice_id"), // for returns, links to original invoice
    notes: text("notes"),
    amountPaid: decimal('amount_paid', { precision: 15, scale: 2 }).default('0.00').notNull(),

    status: text('status', { enum: ['draft', 'issued', 'paid', 'cancelled'] }).default('draft').notNull(),
    tokenNumber: integer('token_number'),
    qrCodeData: text('qr_code_data'),
    createdBy: uuid('created_by').references(() => users.id), // Add user tracking
    // --- Installment Fields ---
    isInstallment: boolean('is_installment').default(false),
    installmentDownPayment: decimal('installment_down_payment', { precision: 15, scale: 2 }).default('0.00'),
    installmentCount: integer('installment_count').default(0),
    installmentInterest: decimal('installment_interest', { precision: 15, scale: 2 }).default('0.00'), // % or fixed amount
    installmentMonthlyAmount: decimal('installment_monthly_amount', { precision: 15, scale: 2 }).default('0.00'),
    representativeId: integer('representative_id').references(() => representatives.id),
    shiftId: integer('shift_id').references(() => shifts.id),
    createdAt: timestamp('created_at').defaultNow(),
});

export const invoiceItems = pgTable('invoice_items', {
    id: serial('id').primaryKey(),
    invoiceId: integer('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }).notNull(),
    productId: integer('product_id').references(() => products.id),
    unitId: integer('unit_id').references(() => units.id),
    storeId: integer('store_id').default(1),
    description: text('description').notNull(),
    quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
    unitPrice: decimal('unit_price', { precision: 15, scale: 2 }).notNull(),
    discount: decimal('discount', { precision: 15, scale: 2 }).default('0.00'),
    total: decimal('total', { precision: 15, scale: 2 }).notNull(),
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
export const purchaseInvoices = pgTable('purchase_invoices', {
    id: serial('id').primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    supplierId: integer('supplier_id').references(() => suppliers.id),
    supplierName: text('supplier_name').notNull(),
    invoiceNumber: text('invoice_number'),
    referenceNumber: text('reference_number'),
    issueDate: date('issue_date').notNull(),
    dueDate: date('due_date'),
    currency: text('currency').default('EGP').notNull(),
    exchangeRate: decimal('exchange_rate', { precision: 10, scale: 6 }).default('1.000000').notNull(),

    subtotal: decimal('subtotal', { precision: 15, scale: 2 }).notNull(),
    taxTotal: decimal('tax_total', { precision: 15, scale: 2 }).default('0.00').notNull(),
    totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull(),

    // Payment Info
    paymentStatus: text("payment_status").notNull().default("unpaid"), // paid, partial, unpaid
    amountPaid: decimal('amount_paid', { precision: 15, scale: 2 }).default('0.00').notNull(),

    status: text('status', { enum: ['draft', 'posted', 'void'] }).default('draft').notNull(),
    type: text("type").notNull().default("purchase"), // purchase, return
    relatedInvoiceId: integer('related_invoice_id'), // links to original purchase invoice
    notes: text("notes"),

    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow(),
});

export const purchaseInvoiceItems = pgTable('purchase_invoice_items', {
    id: serial('id').primaryKey(),
    purchaseInvoiceId: integer('purchase_invoice_id').references(() => purchaseInvoices.id, { onDelete: 'cascade' }).notNull(),
    productId: integer('product_id').references(() => products.id),
    description: text('description').notNull(),
    quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
    unitCost: decimal('unit_cost', { precision: 15, scale: 2 }).notNull(),
    total: decimal('total', { precision: 15, scale: 2 }).notNull(),
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
export const vouchers = pgTable('vouchers', {
    id: serial('id').primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    voucherNumber: text('voucher_number').notNull(),
    type: text('type', { enum: ['receipt', 'payment'] }).notNull(),
    date: date('date').notNull(),
    amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
    description: text('description'),
    reference: text('reference'),

    // Linked Party
    partyType: text('party_type', { enum: ['customer', 'supplier', 'other'] }),
    partyId: integer('party_id'),

    accountId: integer('account_id').references(() => accounts.id),

    status: text('status', { enum: ['draft', 'posted', 'void'] }).default('draft').notNull(),
    shiftId: integer('shift_id').references(() => shifts.id),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow(),
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
export const auditLogs = pgTable('audit_logs', {
    id: serial('id').primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    userId: uuid('user_id').references(() => users.id),
    action: text('action').notNull(),
    entity: text('entity').notNull(),
    entityId: text('entity_id').notNull(),
    details: text('details'),
    ipAddress: text('ip_address'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
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
export const employees = pgTable('employees', {
    id: serial('id').primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    address: text('address'),
    phone: text('phone'),
    email: text('email'),
    basicSalary: decimal('basic_salary', { precision: 15, scale: 2 }).default('0.00').notNull(),
    status: text('status').default('active').notNull(), // active, inactive
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const employeesRelations = relations(employees, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [employees.tenantId],
        references: [tenants.id],
    }),
    advances: many(advances),
    payrolls: many(payrolls),
}));

// --- Advances ---
export const advances = pgTable('advances', {
    id: serial('id').primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    employeeId: integer('employee_id').references(() => employees.id, { onDelete: 'cascade' }).notNull(),
    date: date('date').notNull(),
    salaryMonth: text('salary_month').notNull(),
    amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
    type: text('type').default('advance').notNull(), // advance, repayment
    treasuryAccountId: integer('treasury_account_id').references(() => accounts.id),
    status: text('status').default('pending').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
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

// --- Payrolls ---
export const payrolls = pgTable('payrolls', {
    id: serial('id').primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    employeeId: integer('employee_id').references(() => employees.id, { onDelete: 'cascade' }).notNull(),
    paymentDate: date('payment_date').notNull(),
    salaryMonth: text('salary_month').notNull(),
    basicSalary: decimal('basic_salary', { precision: 15, scale: 2 }).notNull(),
    incentives: decimal('incentives', { precision: 15, scale: 2 }).default('0.00'),
    deductions: decimal('deductions', { precision: 15, scale: 2 }).default('0.00'),
    advanceDeductions: decimal('advance_deductions', { precision: 15, scale: 2 }).default('0.00'),
    netSalary: decimal('net_salary', { precision: 15, scale: 2 }).notNull(),
    treasuryAccountId: integer('treasury_account_id').references(() => accounts.id),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
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

// --- Attendance ---
export const attendance = pgTable('attendance', {
    id: serial('id').primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    employeeId: integer('employee_id').references(() => employees.id, { onDelete: 'cascade' }).notNull(),
    date: date('date').notNull(),
    checkIn: text('check_in'),
    checkOut: text('check_out'),
    status: text('status').default('present').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
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

// --- Shifts (ورديات الكاشير) ---
export const shifts = pgTable('shifts', {
    id: serial('id').primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    userId: uuid('user_id').references(() => users.id).notNull(), // Cashier
    shiftNumber: integer('shift_number').notNull(), // 1, 2, 3...

    startTime: timestamp('start_time').defaultNow().notNull(),
    endTime: timestamp('end_time'),

    startBalance: decimal('start_balance', { precision: 15, scale: 2 }).default('0.00').notNull(), // رصيد بداية الوردية
    endBalance: decimal('end_balance', { precision: 15, scale: 2 }).default('0.00'), // الرصيد الفعلي عند الإغلاق (الجرد)

    // System Calculated Totals (للمقارنة عند الإغلاق)
    systemCashBalance: decimal('system_cash_balance', { precision: 15, scale: 2 }).default('0.00'),
    systemVisaBalance: decimal('system_visa_balance', { precision: 15, scale: 2 }).default('0.00'),
    systemUnpaidBalance: decimal('system_unpaid_balance', { precision: 15, scale: 2 }).default('0.00'), // الآجل

    status: text('status').default('open').notNull(), // open, closed
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
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

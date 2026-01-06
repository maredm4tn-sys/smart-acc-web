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

// --- Products / Inventory ---
export const products = pgTable('products', {
    id: serial('id').primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    sku: text('sku').notNull(),
    type: text('type', { enum: ['service', 'goods'] }).default('goods').notNull(),
    sellPrice: decimal('sell_price', { precision: 15, scale: 2 }).default('0.00').notNull(),
    buyPrice: decimal('buy_price', { precision: 15, scale: 2 }).default('0.00').notNull(),
    stockQuantity: decimal('stock_quantity', { precision: 15, scale: 2 }).default('0.00').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
    return {
        skuIdx: uniqueIndex('sku_idx').on(table.sku, table.tenantId),
    };
});

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
    createdAt: timestamp('created_at').defaultNow(),
});

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

    // --- AR Fields ---
    paymentStatus: text('payment_status', { enum: ['paid', 'unpaid', 'partial'] }).default('paid').notNull(), // Default 'paid' for legacy
    amountPaid: decimal('amount_paid', { precision: 15, scale: 2 }).default('0.00').notNull(),

    status: text('status', { enum: ['draft', 'issued', 'paid', 'cancelled'] }).default('draft').notNull(),
    qrCodeData: text('qr_code_data'),
    createdBy: uuid('created_by').references(() => users.id), // Add user tracking
    createdAt: timestamp('created_at').defaultNow(),
});

export const invoiceItems = pgTable('invoice_items', {
    id: serial('id').primaryKey(),
    invoiceId: integer('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }).notNull(),
    productId: integer('product_id').references(() => products.id),
    description: text('description').notNull(),
    quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
    unitPrice: decimal('unit_price', { precision: 15, scale: 2 }).notNull(),
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

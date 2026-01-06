import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
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
export const products = sqliteTable('products', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    sku: text('sku').notNull(),
    type: text('type').default('goods').notNull(), // Enum simulated
    sellPrice: text('sell_price').default('0.00').notNull(),
    buyPrice: text('buy_price').default('0.00').notNull(),
    stockQuantity: text('stock_quantity').default('0.00').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

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
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

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
    customerId: integer('customer_id').references(() => customers.id),
    customerName: text('customer_name').notNull(),
    customerTaxId: text('customer_tax_id'),
    issueDate: text('issue_date').notNull(), // ISO Date
    dueDate: text('due_date'), // ISO Date
    currency: text('currency').default('EGP').notNull(),
    exchangeRate: text('exchange_rate').default('1.000000').notNull(),
    subtotal: text('subtotal').notNull(),
    taxTotal: text('tax_total').default('0.00').notNull(),
    totalAmount: text('total_amount').notNull(),

    // --- AR Fields ---
    paymentStatus: text('payment_status').default('paid').notNull(), // Enum simulated
    amountPaid: text('amount_paid').default('0.00').notNull(),

    status: text('status').default('draft').notNull(), // Enum simulated
    qrCodeData: text('qr_code_data'),
    createdBy: text('created_by').references(() => users.id),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const invoiceItems = sqliteTable('invoice_items', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    invoiceId: integer('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }).notNull(),
    productId: integer('product_id').references(() => products.id),
    description: text('description').notNull(),
    quantity: text('quantity').notNull(),
    unitPrice: text('unit_price').notNull(),
    total: text('total').notNull(),
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

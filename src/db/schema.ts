import * as schemaSqlite from './schema.sqlite';
import * as schemaPg from './schema.pg';

// Logic to determine which schema to use
// We default to SQLite unless we are on Vercel or have Postgres explicitly configured
// AND strictly NOT in desktop mode.
const isDesktop = process.env.NEXT_PUBLIC_APP_MODE === 'desktop';
const isVercel = !!process.env.VERCEL;
const hasPostgres = !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);

// Priority: Desktop -> SQLite
// Vercel -> Postgres
// Local Web -> SQLite (default) unless POSTGRES_URL is set? No, let's keep local web simple with SQLite for now to match desktop dev.
// But if user wants to debug Vercel locally, they might set POSTGRES_URL.

const usePg = !isDesktop && (isVercel || hasPostgres);

export const tenants = usePg ? schemaPg.tenants : schemaSqlite.tenants;
export const users = usePg ? schemaPg.users : schemaSqlite.users;
export const fiscalYears = usePg ? schemaPg.fiscalYears : schemaSqlite.fiscalYears;
export const accounts = usePg ? schemaPg.accounts : schemaSqlite.accounts;
export const journalEntries = usePg ? schemaPg.journalEntries : schemaSqlite.journalEntries;
export const journalLines = usePg ? schemaPg.journalLines : schemaSqlite.journalLines;
export const categories = usePg ? schemaPg.categories : schemaSqlite.categories;
export const products = usePg ? schemaPg.products : schemaSqlite.products;
export const suppliers = usePg ? schemaPg.suppliers : schemaSqlite.suppliers;
export const customers = usePg ? schemaPg.customers : schemaSqlite.customers;
export const invoices = usePg ? schemaPg.invoices : schemaSqlite.invoices;
export const invoiceItems = usePg ? schemaPg.invoiceItems : schemaSqlite.invoiceItems;
export const purchaseInvoices = usePg ? schemaPg.purchaseInvoices : schemaSqlite.purchaseInvoices;
export const purchaseInvoiceItems = usePg ? schemaPg.purchaseInvoiceItems : schemaSqlite.purchaseInvoiceItems;
export const vouchers = usePg ? schemaPg.vouchers : schemaSqlite.vouchers;
export const auditLogs = usePg ? schemaPg.auditLogs : schemaSqlite.auditLogs;
export const licensing = usePg ? null : (schemaSqlite as any).licensing;
export const installments = usePg ? schemaPg.installments : schemaSqlite.installments;
export const employees = usePg ? schemaPg.employees : schemaSqlite.employees;
export const advances = usePg ? schemaPg.advances : schemaSqlite.advances;
export const payrolls = usePg ? schemaPg.payrolls : schemaSqlite.payrolls;
export const attendance = usePg ? schemaPg.attendance : schemaSqlite.attendance;
export const representatives = usePg ? schemaPg.representatives : schemaSqlite.representatives;
export const units = usePg ? schemaPg.units : schemaSqlite.units;

// Relations
export const usersRelations = usePg ? schemaPg.usersRelations : schemaSqlite.usersRelations;
// ...
export const installmentsRelations = usePg ? schemaPg.installmentsRelations : schemaSqlite.installmentsRelations;
export const employeesRelations = usePg ? schemaPg.employeesRelations : schemaSqlite.employeesRelations;
export const advancesRelations = usePg ? schemaPg.advancesRelations : schemaSqlite.advancesRelations;
export const payrollsRelations = usePg ? schemaPg.payrollsRelations : schemaSqlite.payrollsRelations;
export const attendanceRelations = usePg ? schemaPg.attendanceRelations : schemaSqlite.attendanceRelations;
export const representativesRelations = usePg ? schemaPg.representativesRelations : schemaSqlite.representativesRelations;
export const unitsRelations = usePg ? schemaPg.unitsRelations : schemaSqlite.unitsRelations;
export const fiscalYearsRelations = usePg ? schemaPg.fiscalYearsRelations : schemaSqlite.fiscalYearsRelations;
export const accountsRelations = usePg ? schemaPg.accountsRelations : schemaSqlite.accountsRelations;
export const journalEntriesRelations = usePg ? schemaPg.journalEntriesRelations : schemaSqlite.journalEntriesRelations;
export const journalLinesRelations = usePg ? schemaPg.journalLinesRelations : schemaSqlite.journalLinesRelations;
export const customersRelations = usePg ? schemaPg.customersRelations : schemaSqlite.customersRelations;
export const suppliersRelations = usePg ? schemaPg.suppliersRelations : schemaSqlite.suppliersRelations;
export const invoicesRelations = usePg ? schemaPg.invoicesRelations : schemaSqlite.invoicesRelations;
export const invoiceItemsRelations = usePg ? schemaPg.invoiceItemsRelations : schemaSqlite.invoiceItemsRelations;
export const purchaseInvoicesRelations = usePg ? schemaPg.purchaseInvoicesRelations : schemaSqlite.purchaseInvoicesRelations;
export const purchaseInvoiceItemsRelations = usePg ? schemaPg.purchaseInvoiceItemsRelations : schemaSqlite.purchaseInvoiceItemsRelations;
export const vouchersRelations = usePg ? schemaPg.vouchersRelations : schemaSqlite.vouchersRelations;
export const auditLogsRelations = usePg ? schemaPg.auditLogsRelations : schemaSqlite.auditLogsRelations;
export const categoriesRelations = usePg ? schemaPg.categoriesRelations : schemaSqlite.categoriesRelations;
export const productsRelations = usePg ? schemaPg.productsRelations : schemaSqlite.productsRelations;
export const shifts = usePg ? schemaPg.shifts : schemaSqlite.shifts;
export const shiftsRelations = usePg ? schemaPg.shiftsRelations : schemaSqlite.shiftsRelations;

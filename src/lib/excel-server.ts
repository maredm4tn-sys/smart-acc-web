import * as XLSX from "xlsx";

export function generateExcelBuffer(data: any[], sheetName: string = "Sheet1"): Buffer {
    if (!data || data.length === 0) {
        return Buffer.from("");
    }

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Auto-width (basic)
    const maxWidth = 50;
    const colWidths = Object.keys(data[0]).map(key => {
        return { wch: Math.min(maxWidth, Math.max(key.length + 5, 15)) }; // Min 15, Max 50
    });
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Write to Buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    return buffer;
}

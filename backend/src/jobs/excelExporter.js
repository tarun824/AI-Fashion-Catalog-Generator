import path from "path";
import { fileURLToPath } from "url";
import { mkdir } from "fs/promises";
import ExcelJS from "exceljs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXPORT_DIR = path.join(__dirname, "../../tmp/exports");

const ensureExportDir = async () => {
  await mkdir(EXPORT_DIR, { recursive: true });
  return EXPORT_DIR;
};

export const buildExcelForJob = async (jobSnapshot) => {
  const dir = await ensureExportDir();
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Fashion Catalog");

  sheet.columns = [
    { header: "#", key: "index", width: 6 },
    { header: "File Name", key: "filename", width: 40 },
    { header: "Status", key: "status", width: 18 },
    { header: "Generated Description", key: "description", width: 80 },
    { header: "Error", key: "error", width: 40 },
    { header: "Metadata", key: "metadata", width: 40 },
  ];

  jobSnapshot.images.forEach((image, index) => {
    sheet.addRow({
      index: index + 1,
      filename: image.filename,
      status: image.status,
      description: image.description,
      error: image.error,
      metadata: JSON.stringify(image.metadata ?? {}, null, 0),
    });
  });

  sheet.getRow(1).font = { bold: true };
  sheet.eachRow((row) => {
    row.alignment = { vertical: "middle", wrapText: true };
  });

  const filename = `fashion-job-${jobSnapshot.id}-${Date.now()}.xlsx`;
  const filePath = path.join(dir, filename);
  await workbook.xlsx.writeFile(filePath);
  return filePath;
};


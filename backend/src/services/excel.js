import ExcelJS from "exceljs";

export const buildWorkbookBuffer = async (job) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Fashion Catalog");

  sheet.columns = [
    { header: "#", key: "index", width: 6 },
    { header: "Filename", key: "filename", width: 32 },
    { header: "Status", key: "status", width: 16 },
    { header: "Tokens", key: "tokens", width: 12 },
    { header: "Duration (ms)", key: "duration", width: 16 },
    { header: "Generated Copy", key: "description", width: 80 },
  ];

  const sortedResults = job.results
    .map((result) => {
      const meta = job.files.find((file) => file.id === result.fileId);
      return {
        ...result,
        order: meta?.order ?? 0,
        filename: meta?.originalName ?? "Unknown",
        status: meta?.status ?? "completed",
      };
    })
    .sort((a, b) => a.order - b.order);

  sortedResults.forEach((result, index) => {
    sheet.addRow({
      index: index + 1,
      filename: result.filename,
      status: result.status,
      tokens: result.tokens ?? "—",
      duration: result.durationMs ?? "—",
      description: result.description ?? "",
    });
  });

  if (job.errors.length > 0) {
    sheet.addRow([]);
    sheet.addRow(["Errors"]);
    job.errors.forEach((errorDetail, errorIndex) => {
      const meta = job.files.find((file) => file.id === errorDetail.fileId);
      sheet.addRow([
        `${errorIndex + 1}`,
        meta?.originalName ?? "Unknown",
        "failed",
        "",
        "",
        errorDetail.error,
      ]);
    });
  }

  return workbook.xlsx.writeBuffer();
};

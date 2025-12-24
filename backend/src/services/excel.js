import ExcelJS from "exceljs";

const DESCRIPTION_LINE_COUNT = Number(
  process.env.EXPORT_DESCRIPTION_LINES ?? 4
);

const parseDescription = (description) => {
  if (!description) {
    return {
      name: "",
      lines: Array.from({ length: DESCRIPTION_LINE_COUNT }, () => ""),
    };
  }

  const lines = description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let productName = "";
  const remaining = [];

  lines.forEach((line) => {
    const normalized = line.toLowerCase();
    if (!productName && normalized.startsWith("name:")) {
      productName = line.split(/name:/i)[1]?.trim() ?? "";
      return;
    }
    if (normalized.startsWith("description")) {
      return;
    }
    remaining.push(line.replace(/^[-•]\s*/, ""));
  });

  while (remaining.length < DESCRIPTION_LINE_COUNT) {
    remaining.push("");
  }

  return {
    name: productName || remaining.shift() || "",
    lines: remaining.slice(0, DESCRIPTION_LINE_COUNT),
  };
};

export const buildWorkbookBuffer = async (job) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Fashion Catalog");

  sheet.columns = [
    { key: "frame", width: 38 },
    { key: "details", width: 100 },
  ];

  const sortedResults = job.results
    .map((result) => {
      const meta = job.files.find((file) => file.id === result.fileId);
      return {
        ...result,
        order: meta?.order ?? 0,
        filename: meta?.originalName ?? "Unknown",
      };
    })
    .sort((a, b) => a.order - b.order);

  sortedResults.forEach((result, index) => {
    const parsed = parseDescription(result.description);
    const frameLabel = result.filename || `Image ${index + 1}`;

    sheet.addRow({
      frame: frameLabel,
      details: `Name: ${parsed.name || "—"}`,
    });
    sheet.addRow({ frame: "", details: "" });
    sheet.addRow({ frame: "", details: "Description (4 lines):" });
    parsed.lines.forEach((line) => {
      sheet.addRow({ frame: "", details: line || "" });
    });
    sheet.addRow({ frame: "", details: "" });
  });

  if (job.errors.length > 0) {
    sheet.addRow({ frame: "Errors", details: "" });
    job.errors.forEach((errorDetail) => {
      const meta = job.files.find((file) => file.id === errorDetail.fileId);
      sheet.addRow({
        frame: meta?.originalName ?? "Unknown",
        details: `Failed: ${errorDetail.error}`,
      });
      sheet.addRow({ frame: "", details: "" });
    });
  }

  return workbook.xlsx.writeBuffer();
};

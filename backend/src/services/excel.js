import ExcelJS from "exceljs";

const DESCRIPTION_LINE_COUNT = Number(
  process.env.EXPORT_DESCRIPTION_LINES ?? 4
);
const IMAGE_ROW_HEIGHT = Number(process.env.EXPORT_IMAGE_ROW_HEIGHT ?? 160);
const IMAGE_ROW_SPAN = Number(process.env.EXPORT_IMAGE_ROW_SPAN ?? 8);

const MIME_EXTENSION_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
};

const getImageExtension = (mimeType = "") =>
  MIME_EXTENSION_MAP[mimeType.toLowerCase()] ?? null;

const addImageRow = (sheet, frameLabel) => {
  const row = sheet.addRow({ frame: frameLabel, label: "", value: "" });
  row.height = IMAGE_ROW_HEIGHT;
  return row;
};

const embedImage = (workbook, sheet, rowNumber, fileMeta) => {
  if (!fileMeta || !Buffer.isBuffer(fileMeta.buffer)) {
    return false;
  }
  const extension = getImageExtension(fileMeta.mimeType);
  if (!extension) {
    return false;
  }
  try {
    const imageId = workbook.addImage({
      buffer: fileMeta.buffer,
      extension,
    });
    const rowSpan = Math.max(IMAGE_ROW_SPAN, 2);
    sheet.addImage(imageId, {
      tl: { col: 0, row: rowNumber - 1 },
      br: { col: 1, row: rowNumber - 1 + rowSpan },
      editAs: "oneCell",
    });
    return true;
  } catch (error) {
    console.warn(`Unable to embed image "${fileMeta.originalName}":`, error);
    return false;
  }
};

const stripMarkdown = (text = "") =>
  text
    .replace(/^\s*\*\*/g, "")
    .replace(/\*\*\s*$/g, "")
    .trim();

const removePrefix = (text = "", pattern) =>
  stripMarkdown(text.replace(pattern, "")).trim();

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
    if (!productName && normalized.startsWith("name")) {
      productName = removePrefix(line, /^\**\s*(saree\s+)?name[:\-]?\s*/i);
      return;
    }
    if (normalized.startsWith("description")) {
      return;
    }
    remaining.push(stripMarkdown(line.replace(/^[-•]\s*/, "")));
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
    { key: "label", width: 30 },
    { key: "value", width: 100 },
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
    const meta = job.files.find((file) => file.id === result.fileId);
    const frameLabel =
      meta?.originalName || result.filename || `Image ${index + 1}`;

    const imageRow = addImageRow(sheet, frameLabel);
    sheet.addRow({
      frame: "",
      label: "Name",
      value: parsed.name || "—",
    });
    sheet.addRow({ frame: "", label: "", value: "" });
    sheet.addRow({ frame: "", label: "Description (4 lines):", value: "" });
    parsed.lines.forEach((line) => {
      sheet.addRow({ frame: "", label: "", value: line || "" });
    });
    sheet.addRow({ frame: "", label: "", value: "" });

    const inserted = embedImage(workbook, sheet, imageRow.number, meta);
    if (!inserted) {
      imageRow.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
    }
  });

  if (job.errors.length > 0) {
    sheet.addRow({ frame: "Errors", label: "", value: "" });
    job.errors.forEach((errorDetail) => {
      const meta = job.files.find((file) => file.id === errorDetail.fileId);
      sheet.addRow({
        frame: meta?.originalName ?? "Unknown",
        label: "Failed",
        value: errorDetail.error,
      });
      sheet.addRow({ frame: "", label: "", value: "" });
    });
  }

  return workbook.xlsx.writeBuffer();
};

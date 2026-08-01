import EXIF from "exif-js";

/**
 * Parse EXIF data from an image file
 * @param {File} file - Image file
 * @returns {Promise<Object|null>} EXIF data or null
 */
const getExifData = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        EXIF.getData(img, function () {
          const exifData = EXIF.getAllTags(this);
          resolve(exifData);
        });
      };
      img.onerror = () => resolve(null);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
};

/**
 * Parse EXIF timestamp to Date object
 * @param {Object} exifData - EXIF data
 * @returns {Date|null} Parsed date or null
 */
const parseExifTimestamp = (exifData) => {
  if (!exifData) return null;

  // Try different EXIF date fields
  const dateStr =
    exifData.DateTimeOriginal ||
    exifData.DateTime ||
    exifData.DateTimeDigitized;

  if (!dateStr) return null;

  // EXIF date format: "YYYY:MM:DD HH:mm:ss"
  try {
    const [datePart, timePart] = dateStr.split(" ");
    const [year, month, day] = datePart.split(":");
    const [hour, minute, second] = timePart.split(":");
    return new Date(year, month - 1, day, hour, minute, second);
  } catch (error) {
    console.warn("Failed to parse EXIF date:", dateStr);
    return null;
  }
};

/**
 * Group images by EXIF timestamps (within 30 seconds)
 * @param {File[]} files - Array of image files
 * @returns {Promise<Object>} { groups: Array, ungrouped: Array }
 */
export const groupImagesByExif = async (files) => {
  const groups = [];
  const ungrouped = [];
  const TIME_THRESHOLD_MS = 30000; // 30 seconds

  // Parse EXIF data for all files
  const filesWithExif = await Promise.all(
    files.map(async (file) => {
      const exifData = await getExifData(file);
      const timestamp = parseExifTimestamp(exifData);
      return { file, exifData, timestamp };
    }),
  );

  // Sort by timestamp
  const sortedFiles = filesWithExif
    .filter((f) => f.timestamp)
    .sort((a, b) => a.timestamp - b.timestamp);

  // Files without EXIF go to ungrouped
  filesWithExif
    .filter((f) => !f.timestamp)
    .forEach((f) => ungrouped.push(f.file));

  // Group by time proximity
  let currentGroup = null;

  sortedFiles.forEach((fileData) => {
    if (!currentGroup) {
      // Start new group
      currentGroup = {
        groupId: `exif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        files: [fileData.file],
        timestamp: fileData.timestamp,
        suggestedName: generateSuggestedName(fileData.file.name),
      };
    } else {
      // Check if within threshold of current group
      const timeDiff = Math.abs(fileData.timestamp - currentGroup.timestamp);
      if (timeDiff <= TIME_THRESHOLD_MS) {
        // Add to current group
        currentGroup.files.push(fileData.file);
      } else {
        // Save current group and start new one
        if (currentGroup.files.length > 1) {
          groups.push(currentGroup);
        } else {
          ungrouped.push(currentGroup.files[0]);
        }
        currentGroup = {
          groupId: `exif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          files: [fileData.file],
          timestamp: fileData.timestamp,
          suggestedName: generateSuggestedName(fileData.file.name),
        };
      }
    }
  });

  // Add last group
  if (currentGroup) {
    if (currentGroup.files.length > 1) {
      groups.push(currentGroup);
    } else {
      ungrouped.push(currentGroup.files[0]);
    }
  }

  return { groups, ungrouped };
};

/**
 * Extract base pattern from filename (e.g., "IMG_101" from "IMG_101_1.jpg")
 * @param {string} filename - Filename
 * @returns {string|null} Base pattern or null
 */
const extractFilenamePattern = (filename) => {
  const nameWithoutExt = filename.replace(/\.[^.]+$/, "");

  // Patterns to match:
  // - IMG_101_1, IMG_101_2 → IMG_101
  // - product-123-a, product-123-b → product-123
  // - shirt_1, shirt_2 → shirt
  // - photo (1), photo (2) → photo

  const patterns = [
    /^(.+?)[-_](\d+)$/i, // ends with _1, _2, -1, -2
    /^(.+?)\s*\((\d+)\)$/i, // ends with (1), (2)
    /^(.+?)[-_]([a-z])$/i, // ends with _a, _b, -a, -b
  ];

  for (const pattern of patterns) {
    const match = nameWithoutExt.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
};

/**
 * Group images by filename patterns
 * @param {File[]} files - Array of image files
 * @returns {Object} { groups: Array, ungrouped: Array }
 */
export const groupImagesByFilename = (files) => {
  const patternMap = new Map();
  const ungrouped = [];

  files.forEach((file) => {
    const pattern = extractFilenamePattern(file.name);

    if (pattern) {
      if (!patternMap.has(pattern)) {
        patternMap.set(pattern, []);
      }
      patternMap.get(pattern).push(file);
    } else {
      ungrouped.push(file);
    }
  });

  // Convert map to groups array (only include groups with 2+ files)
  const groups = [];
  patternMap.forEach((files, pattern) => {
    if (files.length > 1) {
      groups.push({
        groupId: `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        files,
        suggestedName: generateSuggestedName(pattern),
      });
    } else {
      ungrouped.push(...files);
    }
  });

  return { groups, ungrouped };
};

/**
 * Generate suggested product name from filename
 * @param {string} filename - Filename
 * @returns {string} Suggested name
 */
const generateSuggestedName = (filename) => {
  // Remove extension
  let name = filename.replace(/\.[^.]+$/, "");

  // Remove common prefixes/suffixes
  name = name
    .replace(/^(IMG|DSC|DCIM|Photo|Picture)[-_]?/gi, "")
    .replace(/[-_](\d+|[a-z])$/i, "")
    .replace(/\s*\(\d+\)$/, "");

  // Replace underscores/dashes with spaces
  name = name.replace(/[-_]+/g, " ");

  // Capitalize words
  name = name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  // Truncate if too long
  if (name.length > 50) {
    name = name.substring(0, 50).trim();
  }

  return name || "Product";
};

/**
 * Auto-group images using EXIF first, fallback to filename
 * @param {File[]} files - Array of image files
 * @returns {Promise<Object>} { groups: Array, ungrouped: Array }
 */
export const autoGroupImages = async (files) => {
  // Try EXIF grouping first
  const exifResult = await groupImagesByExif(files);

  // If EXIF found groups, use those
  if (exifResult.groups.length > 0) {
    // Try filename grouping on ungrouped files
    const filenameResult = groupImagesByFilename(exifResult.ungrouped);

    return {
      groups: [...exifResult.groups, ...filenameResult.groups],
      ungrouped: filenameResult.ungrouped,
      method: "exif+filename",
    };
  }

  // Otherwise, use filename grouping on all files
  const filenameResult = groupImagesByFilename(files);

  return {
    groups: filenameResult.groups,
    ungrouped: filenameResult.ungrouped,
    method: "filename",
  };
};

/**
 * Calculate statistics for grouped images
 * @param {Object} groupingResult - Result from autoGroupImages
 * @returns {Object} Statistics
 */
export const calculateGroupingStats = (groupingResult) => {
  const { groups, ungrouped } = groupingResult;

  const totalImages =
    groups.reduce((sum, g) => sum + g.files.length, 0) + ungrouped.length;
  const groupedImages = groups.reduce((sum, g) => sum + g.files.length, 0);
  const groupCount = groups.length;

  return {
    totalImages,
    groupedImages,
    ungroupedImages: ungrouped.length,
    groupCount,
    averageImagesPerGroup:
      groupCount > 0 ? (groupedImages / groupCount).toFixed(1) : 0,
    groupingRate:
      totalImages > 0 ? ((groupedImages / totalImages) * 100).toFixed(1) : 0,
  };
};

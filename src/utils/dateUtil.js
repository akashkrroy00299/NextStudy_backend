import { Temporal } from "@js-temporal/polyfill";

/**
 * Format date to dd.mm.yyyy using Temporal API
 * @param {Date | string} date 
 * @returns {string} Formatted as dd.mm.yyyy
 */
export const formatDateDDMMYYYY = (date) => {
    if (!date) return "";
    
    try {
        const isoString = date instanceof Date ? date.toISOString() : date;
        const plainDate = Temporal.PlainDate.from(isoString.split("T")[0]);
        
        return `${String(plainDate.day).padStart(2, "0")}.${String(plainDate.month).padStart(2, "0")}.${plainDate.year}`;
    } catch (error) {
        console.error("Error formatting date:", error);
        return "";
    }
};

/**
 * Format datetime to dd.mm.yyyy HH:mm:ss using Temporal API
 * @param {Date | string} date 
 * @returns {string} Formatted as dd.mm.yyyy HH:mm:ss
 */
export const formatDateTimeDDMMYYYY = (date) => {
    if (!date) return "";
    
    try {
        const isoString = date instanceof Date ? date.toISOString() : date;
        const instant = Temporal.Instant.from(isoString);
        const zonedDT = instant.toZonedDateTimeISO("UTC");
        
        return `${String(zonedDT.day).padStart(2, "0")}.${String(zonedDT.month).padStart(2, "0")}.${zonedDT.year} ${String(zonedDT.hour).padStart(2, "0")}:${String(zonedDT.minute).padStart(2, "0")}:${String(zonedDT.second).padStart(2, "0")}`;
    } catch (error) {
        console.error("Error formatting datetime:", error);
        return "";
    }
};

/**
 * Convert Temporal.PlainDate to JavaScript Date object (at midnight UTC)
 * @param {Temporal.PlainDate} plainDate 
 * @returns {Date}
 */
export const plainDateToDate = (plainDate) => {
    if (!plainDate) return null;
    try {
        return new Date(plainDate.toString() + "T00:00:00Z");
    } catch (error) {
        console.error("Error converting plainDate to Date:", error);
        return null;
    }
};

/**
 * Get today's PlainDate in the user's timezone, falling back to Asia/Kolkata
 * @param {string} timezone
 * @returns {Temporal.PlainDate}
 */
export const safePlainDateISO = (timezone) => {
  try {
    return Temporal.Now.plainDateISO(timezone);
  } catch (err) {
    console.warn(`Invalid timezone "${timezone}", falling back to Asia/Kolkata`);
    return Temporal.Now.plainDateISO('Asia/Kolkata');
  }
};

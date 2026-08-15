export const officeRows = [
  ["ID", "Client", "Workstream", "Owner", "Start", "Due", "Stage", "Priority", "Budget", "Actual", "Variance", "Complete", "Risk", "Next action", "Updated", "Notes"],
  ["OPS-042", "Northstar", "Q3 campaign", "J. Park", "2026-08-03", "2026-08-28", "In progress", "High", "48,000", "31,840", "-16,160", "66%", "Amber", "Content review", "2026-08-15", "Scope locked"],
  ["OPS-043", "Lumen", "Onboarding", "M. Kim", "2026-08-04", "2026-08-22", "In progress", "High", "36,500", "22,100", "-14,400", "61%", "Green", "Approve scripts", "2026-08-15", "Legal clear"],
  ["OPS-044", "Vector", "Site migration", "S. Lee", "2026-08-05", "2026-09-02", "In progress", "Medium", "72,000", "28,800", "-43,200", "40%", "Amber", "Confirm redirect map", "2026-08-14", "Vendor pending"],
  ["OPS-045", "Harbor", "Retail rollout", "E. Choi", "2026-08-06", "2026-08-26", "Review", "High", "54,000", "44,280", "-9,720", "82%", "Amber", "Sign store list", "2026-08-15", "18 locations"],
  ["OPS-046", "Atlas", "Research panel", "D. Han", "2026-08-06", "2026-09-09", "In progress", "Medium", "28,000", "9,240", "-18,760", "33%", "Green", "Reconcile responses", "2026-08-14", "Wave 1 live"],
  ["OPS-047", "Cedar", "Pricing audit", "Y. Song", "2026-08-07", "2026-08-21", "Blocked", "High", "19,500", "10,920", "-8,580", "56%", "Red", "Resolve tax logic", "2026-08-15", "Finance review"],
  ["OPS-048", "Solace", "CRM cleanup", "H. Lim", "2026-08-07", "2026-08-29", "In progress", "Medium", "24,000", "13,920", "-10,080", "58%", "Green", "Merge duplicate accounts", "2026-08-15", "Batch 3"],
  ["OPS-049", "Meridian", "Launch assets", "A. Jung", "2026-08-08", "2026-08-25", "Review", "High", "41,000", "35,670", "-5,330", "87%", "Amber", "Approve final copy", "2026-08-15", "Two comments"],
  ["OPS-050", "Willow", "Channel plan", "K. Yoon", "2026-08-09", "2026-09-04", "In progress", "Medium", "33,000", "15,180", "-17,820", "46%", "Green", "Book media slots", "2026-08-14", "Rates received"],
  ["OPS-051", "Kite", "Partner portal", "R. Oh", "2026-08-10", "2026-09-11", "In progress", "Low", "61,000", "18,300", "-42,700", "30%", "Amber", "Test SSO flow", "2026-08-15", "Build 0.7"],
  ["OPS-052", "Fieldwork", "Supplier RFP", "N. Seo", "2026-08-11", "2026-08-27", "Review", "High", "17,000", "12,750", "-4,250", "75%", "Green", "Score proposals", "2026-08-15", "Five bids"],
  ["OPS-053", "Orbit", "Data taxonomy", "I. Kwon", "2026-08-12", "2026-09-05", "In progress", "Medium", "39,000", "17,550", "-21,450", "45%", "Amber", "Map legacy fields", "2026-08-15", "Workshop Tuesday"],
  ["OPS-054", "Ridge", "Billing handoff", "C. Moon", "2026-08-12", "2026-08-24", "Blocked", "High", "22,000", "15,400", "-6,600", "70%", "Red", "Confirm PO owner", "2026-08-15", "Awaiting response"],
  ["OPS-055", "Lattice", "Support playbook", "T. Baek", "2026-08-13", "2026-09-01", "In progress", "Medium", "26,000", "8,060", "-17,940", "31%", "Green", "Draft escalation tree", "2026-08-14", "First pass"],
  ["OPS-056", "Aster", "Forecast model", "B. Shin", "2026-08-13", "2026-08-30", "Review", "High", "47,500", "33,250", "-14,250", "70%", "Amber", "Validate assumptions", "2026-08-15", "CFO review"],
  ["OPS-057", "Canopy", "Email migration", "P. Cho", "2026-08-14", "2026-09-12", "In progress", "Medium", "31,000", "7,440", "-23,560", "24%", "Green", "Schedule pilot", "2026-08-15", "2,400 users"],
  ["OPS-058", "Juniper", "Packaging update", "G. Ryu", "2026-08-14", "2026-08-23", "Review", "High", "18,000", "15,840", "-2,160", "88%", "Amber", "Release print files", "2026-08-15", "Press slot held"],
  ["OPS-059", "Clover", "Inventory sync", "W. Jang", "2026-08-15", "2026-09-06", "In progress", "Medium", "44,000", "11,000", "-33,000", "25%", "Green", "Validate SKUs", "2026-08-15", "API stable"],
  ["OPS-060", "Ember", "Training cohort", "F. Yoo", "2026-08-15", "2026-09-03", "In progress", "Low", "14,500", "4,060", "-10,440", "28%", "Green", "Confirm attendees", "2026-08-15", "Roster at 34"],
  ["OPS-061", "Summit", "Renewal deck", "L. Hong", "2026-08-15", "2026-08-27", "Review", "High", "29,000", "20,300", "-8,700", "70%", "Amber", "Incorporate feedback", "2026-08-15", "Meeting Friday"],
  ["OPS-062", "Mosaic", "Accessibility audit", "J. Heo", "2026-08-16", "2026-09-10", "In progress", "Medium", "35,000", "7,000", "-28,000", "20%", "Green", "Run keyboard tests", "2026-08-15", "Audit started"],
  ["OPS-063", "Pioneer", "Contract archive", "S. Ahn", "2026-08-16", "2026-08-31", "In progress", "Low", "12,000", "3,000", "-9,000", "25%", "Green", "Tag executed docs", "2026-08-15", "Folder created"],
  ["OPS-064", "Narrow", "Executive brief", "M. Bae", "2026-08-16", "2026-08-22", "Review", "High", "16,000", "13,280", "-2,720", "83%", "Amber", "Approve summary", "2026-08-15", "Draft shared"],
  ["OPS-065", "Beacon", "Capacity plan", "V. Min", "2026-08-16", "2026-09-08", "In progress", "Medium", "27,500", "6,875", "-20,625", "25%", "Green", "Confirm staffing", "2026-08-15", "Draft forecast"],
] as const;

const stages = ["In progress", "Review", "Blocked", "Ready"] as const;
const priorities = ["High", "Medium", "Low"] as const;
const risks = ["Green", "Amber", "Red"] as const;
const clients = [
  "Aster", "Beacon", "Canopy", "Delta", "Ember", "Fieldwork", "Harbor", "Juniper",
  "Kite", "Lattice", "Meridian", "Northstar", "Orbit", "Pioneer", "Ridge", "Solace",
] as const;
const workstreams = [
  "Campaign plan", "Data migration", "Forecast model", "Launch assets", "Partner portal",
  "Pricing audit", "Research panel", "Retail rollout", "Support playbook", "Training cohort",
  "Vendor review", "Workflow redesign",
] as const;
const owners = [
  "A. Jung", "B. Shin", "C. Moon", "D. Han", "E. Choi", "F. Yoo", "G. Ryu", "H. Lim",
  "I. Kwon", "J. Park", "K. Yoon", "L. Hong", "M. Kim", "N. Seo", "P. Cho", "S. Lee",
] as const;
const nextActions = [
  "Confirm dependencies",
  "Review latest draft",
  "Reconcile open items",
  "Schedule owner check-in",
  "Validate final figures",
  "Publish revised plan",
] as const;
const notes = [
  "Owner notified",
  "Awaiting approval",
  "Numbers refreshed",
  "Dependency logged",
  "Review booked",
  "No blockers reported",
] as const;

function pick<T>(items: readonly T[], tick: number, rowIndex: number, columnIndex: number) {
  return items[(tick + rowIndex * 7 + columnIndex * 11) % items.length]!;
}

function formatAmount(value: number) {
  return value.toLocaleString("en-US");
}

function formatDate(day: number) {
  return `2026-08-${String(day).padStart(2, "0")}`;
}

export function getOfficeRowsForWord(tick: number) {
  return officeRows.map((row, rowIndex) => {
    if (rowIndex === 0) return row;

    const budget = 12_000 + ((tick * 11 + rowIndex * 29) % 144) * 500;
    const completion = 18 + ((tick * 7 + rowIndex * 13) % 77);
    const actual =
      Math.round(
        (budget * completion * (82 + ((tick * 5 + rowIndex * 3) % 28))) / 100_000,
      ) * 10;
    const updateHour = 9 + ((tick * 3 + rowIndex) % 10);
    const updateMinute = (tick * 11 + rowIndex * 7) % 60;

    return [
      `OPS-${String(100 + ((tick * 17 + rowIndex * 29) % 900)).padStart(3, "0")}`,
      pick(clients, tick, rowIndex, 1),
      pick(workstreams, tick, rowIndex, 2),
      pick(owners, tick, rowIndex, 3),
      formatDate(3 + ((tick + rowIndex * 5) % 13)),
      formatDate(20 + ((tick * 3 + rowIndex * 7) % 10)),
      pick(stages, tick, rowIndex, 6),
      pick(priorities, tick, rowIndex, 7),
      formatAmount(budget),
      formatAmount(actual),
      formatAmount(actual - budget),
      `${completion}%`,
      pick(risks, tick, rowIndex, 12),
      pick(nextActions, tick, rowIndex, 13),
      `${String(updateHour).padStart(2, "0")}:${String(updateMinute).padStart(2, "0")}`,
      pick(notes, tick, rowIndex, 15),
    ];
  });
}

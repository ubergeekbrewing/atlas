import type { LabAbnormalEntry, LabResultFlag } from "./types";

/** Rows from your report — applied with the draw date you pick in the Labs tab. */
export function labPanelTemplateRows(): Omit<LabAbnormalEntry, "id" | "drawDate">[] {
  const row = (testName: string, value: string, flag: LabResultFlag, notes = "") => ({
    testName,
    value,
    flag,
    notes,
  });
  return [
    row("BUN/Creat ratio", "9.2", "L"),
    row("Triglycerides", "258", "H"),
    row("Non-HDL cholesterol", "156", "H"),
    row("LDL cholesterol", "104", "H"),
    row("VLDL, calculated", "52", "H"),
    row("Trig/HDL ratio", "6.29", "H"),
    row("Lymphs, absolute count", "3.06", "H"),
    row("ANA screen", "Positive", "P"),
    row("ANA titer (IFA)", "1:160", "H"),
    row("25-OH vitamin D", "13.0", "L"),
  ];
}

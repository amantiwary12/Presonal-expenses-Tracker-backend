import XLSX from "xlsx";

export const parseExcelFile = (buffer) => {

  const workbook = XLSX.read(
    buffer,
    { type: "buffer" }
  );

  const sheetName =
    workbook.SheetNames[0];

  const sheet =
    workbook.Sheets[sheetName];

  const data =
    XLSX.utils.sheet_to_json(sheet);

  return data;

};
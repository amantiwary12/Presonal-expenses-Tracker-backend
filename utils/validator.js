export const validateRow = (row) => {

  const errors = [];

  if (!row.Amount) {
    errors.push("Amount missing");
  }

  if (isNaN(row.Amount)) {
    errors.push("Amount must be number");
  }

  if (!row.Category) {
    errors.push("Category missing");
  }

  if (!row.Date) {
    errors.push("Date missing");
  }

  return errors;

};
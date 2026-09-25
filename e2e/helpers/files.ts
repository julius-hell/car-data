export const pdf = (name = "report.pdf") => ({
  name,
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n"),
});

export const textFile = (name = "notes.txt") => ({
  name,
  mimeType: "text/plain",
  buffer: Buffer.from("not a document"),
});

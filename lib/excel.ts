type ExcelValue = string | number | boolean | null | undefined;

function escapeXml(value: ExcelValue) {
  const text = value === null || value === undefined ? "" : String(value);
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function cell(value: ExcelValue) {
  const type = typeof value === "number" ? "Number" : "String";
  return `<Cell><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
}

function headerCell(value: ExcelValue) {
  return `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}

function columnWidth(header: string, rows: Record<string, ExcelValue>[]) {
  const longest = rows.reduce((max, row) => {
    const value = row[header] === null || row[header] === undefined ? "" : String(row[header]);
    return Math.max(max, value.length);
  }, header.length);

  return Math.min(Math.max(longest * 7 + 22, 90), 260);
}

export function downloadExcel(filename: string, sheetName: string, rows: Record<string, ExcelValue>[]) {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const columns = headers.map((header) => `<Column ss:Width="${columnWidth(header, rows)}"/>`).join("");
  const worksheetRows = [
    `<Row ss:Height="24">${headers.map((header) => headerCell(header)).join("")}</Row>`,
    ...rows.map((row) => `<Row>${headers.map((header) => cell(row[header])).join("")}</Row>`)
  ].join("");

  const workbook = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11"/>
    </Style>
    <Style ss:ID="Header">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1F2937"/>
      </Borders>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#0F766E" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="${escapeXml(sheetName)}">
    <Table>${columns}${worksheetRows}</Table>
    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
      <FreezePanes/>
      <FrozenNoSplit/>
      <SplitHorizontal>1</SplitHorizontal>
      <TopRowBottomPane>1</TopRowBottomPane>
      <ActivePane>2</ActivePane>
    </WorksheetOptions>
  </Worksheet>
</Workbook>`;

  const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
} from "docx";

export async function exportNoticeToDocx(
  fullText: string,
  metadata: {
    act: string;
    sections: string[];
    noticeSentDate: string;
    waitingPeriodEnd: string;
    complaintDeadline: string;
  }
): Promise<Buffer> {
  const lines = fullText.split("\n").filter((l) => l.trim() !== "");

  const paragraphs: Paragraph[] = [];

  // Title paragraph
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "LEGAL NOTICE",
          bold: true,
          size: 28,
          color: "1a1a2e",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      border: {
        bottom: {
          color: "b8860b",
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
    })
  );

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Under Section 138 & 142 of the ${metadata.act}`,
          italics: true,
          size: 20,
          color: "666666",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Body paragraphs
  for (const line of lines) {
    const isTitle = line.toUpperCase() === line && line.length > 10;
    const isEmpty = line.trim() === "";

    if (isEmpty) {
      paragraphs.push(new Paragraph({ text: "" }));
      continue;
    }

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: line,
            bold: isTitle,
            size: isTitle ? 22 : 20,
            font: "Times New Roman",
          }),
        ],
        alignment: isTitle ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
        spacing: { after: 160, line: 360 },
      })
    );
  }

  // Deadline table
  paragraphs.push(
    new Paragraph({
      text: "",
      spacing: { before: 400 },
    })
  );

  const deadlineTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "KEY DEADLINES", bold: true, size: 18 })],
              }),
            ],
            shading: { type: ShadingType.CLEAR, fill: "1a47f5", color: "ffffff" },
            columnSpan: 2,
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Notice Sent Date", bold: true, size: 18 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: metadata.noticeSentDate, size: 18 })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "15-Day Wait Ends", bold: true, size: 18 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: metadata.waitingPeriodEnd, size: 18 })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Complaint Must Be Filed By", bold: true, size: 18, color: "cc0000" })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: metadata.complaintDeadline, bold: true, size: 18, color: "cc0000" })] })],
          }),
        ],
      }),
    ],
  });

  paragraphs.push(
    new Paragraph({
      children: [],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: [...paragraphs, deadlineTable],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

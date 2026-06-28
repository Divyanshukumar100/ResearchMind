import { jsPDF } from "jspdf";
import pptxgen from "pptxgenjs";

interface ReportSection {
  title: string;
  type: "intro" | "finding" | "conclusion" | "sources" | "general";
  content: string[];
}

/**
 * Parses the custom markdown report structure into clean semantic sections
 */
function parseReport(markdownText: string): ReportSection[] {
  const lines = markdownText.split("\n");
  const sections: ReportSection[] = [];
  let currentSection: ReportSection | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect headers
    if (trimmed.startsWith("# ") || trimmed.startsWith("## ")) {
      if (currentSection) {
        sectionsHelper.appendSection(sections, currentSection);
      }
      
      const title = trimmed.replace(/^##?\s+/, "");
      let type: ReportSection["type"] = "general";
      const lowerTitle = title.toLowerCase();

      if (lowerTitle.includes("introduction")) {
        type = "intro";
      } else if (lowerTitle.includes("finding") || lowerTitle.includes("key finding")) {
        type = "finding";
      } else if (lowerTitle.includes("conclusion")) {
        type = "conclusion";
      } else if (lowerTitle.includes("sources") || lowerTitle.includes("references")) {
        type = "sources";
      }

      currentSection = {
        title,
        type,
        content: []
      };
    } else {
      if (!currentSection) {
        currentSection = {
          title: "Executive Summary",
          type: "intro",
          content: []
        };
      }
      currentSection.content.push(trimmed);
    }
  }

  if (currentSection) {
    sectionsHelper.appendSection(sections, currentSection);
  }

  // Fallback if no sections parsed
  if (sections.length === 0) {
    sections.push({
      title: "Research Intelligence Report",
      type: "general",
      content: lines.map(l => l.trim()).filter(l => l !== "")
    });
  }

  return sections;
}

// Custom polyfill helper for appendSection
// (avoiding any prototype modifications or missing helper errors)
const sectionsHelper = {
  appendSection: (list: ReportSection[], sec: ReportSection) => {
    // Filter out empty content-less placeholder headers if any
    if (sec.content.length > 0 || sec.title !== "") {
      list.push(sec);
    }
  }
};

/**
 * Generates and downloads a beautifully styled PDF document
 */
export function exportToPDF(topic: string, markdownText: string) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const sections = parseReport(markdownText);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = 30;

  // Add a helper for text wrapping and automatic pagination
  const addTextWithPageFlow = (text: string, fontSize: number, fontStyle: "normal" | "bold" | "italic", colorHex: string, leading: number = 7) => {
    doc.setFont("helvetica", fontStyle);
    doc.setFontSize(fontSize);
    doc.setTextColor(colorHex);

    const lines = doc.splitTextToSize(text, contentWidth);
    for (const line of lines) {
      if (yPosition + leading > pageHeight - margin) {
        doc.addPage();
        yPosition = 25;
        // Footer signature
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor("#888888");
        doc.text("ResearchMind Intel Engine", margin, pageHeight - 10);
        
        doc.setFont("helvetica", fontStyle);
        doc.setFontSize(fontSize);
        doc.setTextColor(colorHex);
      }
      doc.text(line, margin, yPosition);
      yPosition += leading;
    }
  };

  // ----------------------------------------
  // Cover Page Banner
  // ----------------------------------------
  // Aesthetic background accent
  doc.setFillColor("#111115");
  doc.rect(0, 0, pageWidth, 55, "F");

  // Accent highlight border
  doc.setFillColor("#ff8c32");
  doc.rect(0, 53, pageWidth, 2, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor("#ffffff");
  doc.text("RESEARCHMIND INTEL REPORT", margin, 26);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor("#aaaaaa");
  doc.text(`TOPIC: ${topic.toUpperCase()}`, margin, 38);

  // Generation timestamp
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor("#888888");
  doc.text(`Compiled on: ${new Date().toLocaleDateString()}`, margin, 46);

  yPosition = 70;

  // Render parsed sections
  sections.forEach((sec) => {
    // Add extra space before headers
    yPosition += 4;

    // Header styling
    if (yPosition + 15 > pageHeight - margin) {
      doc.addPage();
      yPosition = 25;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor("#ff8c32"); // Clean orange brand accent
    doc.text(sec.title, margin, yPosition);
    yPosition += 2;

    // Simple divider line under section headers
    doc.setDrawColor("#e5e7eb");
    doc.setLineWidth(0.2);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    // Paragraphs content
    sec.content.forEach((paragraph) => {
      let cleanPara = paragraph;
      let isListItem = false;
      let fontStyle: "normal" | "bold" | "italic" = "normal";

      // Detect list bullets
      if (cleanPara.startsWith("- ") || cleanPara.startsWith("* ")) {
        cleanPara = "•  " + cleanPara.substring(2);
        isListItem = true;
      }

      // Stripping simple markdown elements for clean PDF look
      cleanPara = cleanPara.replace(/\*\*([^*]+)\*\*/g, "$1");
      cleanPara = cleanPara.replace(/\*([^*]+)\*/g, "$1");

      const fontSize = isListItem ? 10 : 10.5;
      const leading = isListItem ? 5.5 : 6.5;
      const color = isListItem ? "#4b5563" : "#1f2937";

      addTextWithPageFlow(cleanPara, fontSize, fontStyle, color, leading);
      yPosition += 3.5; // Padding between paragraphs
    });

    yPosition += 5; // Section buffer spacing
  });

  // Footer on first page
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor("#888888");
  doc.text("ResearchMind Intel Engine", margin, pageHeight - 10);

  doc.save(`ResearchMind_Report_${topic.replace(/\s+/g, "_")}.pdf`);
}

/**
 * Generates and downloads a beautifully formatted PowerPoint slideshow deck
 */
export function exportToPPTX(topic: string, markdownText: string) {
  const pptx = new pptxgen();
  const sections = parseReport(markdownText);

  // Set presentation-wide master layouts
  pptx.defineLayout({ name: "WIDESCREEN", width: 13.33, height: 7.5 });
  pptx.layout = "WIDESCREEN";

  // ----------------------------------------
  // Slide 1: Title & Cover Slide (Stunning Premium Theme)
  // ----------------------------------------
  const titleSlide = pptx.addSlide();
  
  // Background solid slate
  titleSlide.background = { color: "111115" };

  // Subtle orange geometric bottom accent banner
  titleSlide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 7.2,
    w: 13.33,
    h: 0.3,
    fill: { color: "ff8c32" }
  });

  // Logo text
  titleSlide.addText("🤖 RESEARCHMIND SYSTEM INTEL", {
    x: 1.0,
    y: 1.5,
    w: 10,
    h: 0.5,
    fontSize: 14,
    color: "ff8c32",
    fontFace: "Calibri",
    bold: true
  });

  // Title text
  titleSlide.addText(topic.toUpperCase(), {
    x: 1.0,
    y: 2.2,
    w: 11,
    h: 2.2,
    fontSize: 34,
    color: "ffffff",
    fontFace: "Arial",
    bold: true,
    margin: 0
  });

  // Compiler timestamp
  titleSlide.addText(`Multi-Agent Deep Research Briefing\nCompiled on: ${new Date().toLocaleDateString()}`, {
    x: 1.0,
    y: 4.8,
    w: 10,
    h: 1.0,
    fontSize: 12,
    color: "9999aa",
    fontFace: "Calibri",
    italic: true
  });


  // ----------------------------------------
  // Slide 2+: Content Slides
  // ----------------------------------------
  sections.forEach((sec, idx) => {
    // Create new slide for each section heading
    const slide = pptx.addSlide();
    slide.background = { color: "ffffff" };

    // Header background accent bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 1.2,
      fill: { color: "1a1a24" }
    });

    // Brand mark top right
    slide.addText("ResearchMind BRIEFING", {
      x: 10.0,
      y: 0.45,
      w: 2.8,
      h: 0.4,
      fontSize: 10,
      color: "ff8c32",
      align: "right",
      bold: true
    });

    // Slide Header Title
    slide.addText(`${idx + 1}. ${sec.title}`, {
      x: 0.8,
      y: 0.35,
      w: 9.0,
      h: 0.6,
      fontSize: 20,
      color: "ffffff",
      bold: true
    });

    // Content area formatting
    let contentY = 1.8;
    const itemsList: { text: string; options: any }[] = [];

    sec.content.forEach((para) => {
      let text = para;
      let isBullet = false;

      if (text.startsWith("- ") || text.startsWith("* ")) {
        text = text.substring(2);
        isBullet = true;
      }

      // Cleanup Markdown bold patterns
      text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
      text = text.replace(/\*([^*]+)\*/g, "$1");

      if (isBullet) {
        itemsList.push({
          text: text,
          options: { bullet: true, color: "444444", fontSize: 13, fontFace: "Calibri", margin: 4 }
        });
      } else {
        itemsList.push({
          text: text,
          options: { bullet: false, color: "111111", fontSize: 14, fontFace: "Calibri", margin: 6, lineSpacing: 1.2 }
        });
      }
    });

    // Render paragraphs cleanly as stacked textbox
    if (itemsList.length > 0) {
      slide.addText(itemsList, {
        x: 0.8,
        y: contentY,
        w: 11.7,
        h: 4.8,
        valign: "top"
      });
    }

    // Slide Footer numbering
    slide.addText(`Slide ${idx + 2} of ${sections.length + 1}`, {
      x: 10.5,
      y: 7.0,
      w: 2.0,
      h: 0.3,
      fontSize: 9,
      color: "888888",
      align: "right"
    });
  });

  // Build presentation and trigger file download
  pptx.writeFile({ fileName: `ResearchMind_Briefing_${topic.replace(/\s+/g, "_")}.pptx` });
}

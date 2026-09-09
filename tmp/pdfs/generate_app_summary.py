from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path("/Users/coremobile/Desktop/todo-list-project")
OUTPUT = ROOT / "output" / "pdf" / "todo-app-summary.pdf"


def p(text, style):
    return Paragraph(text, style)


def bullet_list(items, style, left_indent=14):
    return ListFlowable(
        [ListItem(Paragraph(item, style)) for item in items],
        bulletType="bullet",
        start="circle",
        leftIndent=left_indent,
        bulletFontSize=7,
    )


def section(title, body, title_style, body_style):
    parts = [Paragraph(title, title_style), Spacer(1, 0.05 * inch)]
    if isinstance(body, list):
        parts.append(bullet_list(body, body_style))
    else:
        parts.append(Paragraph(body, body_style))
    return parts


def build_pdf():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=landscape(letter),
        leftMargin=0.45 * inch,
        rightMargin=0.45 * inch,
        topMargin=0.4 * inch,
        bottomMargin=0.35 * inch,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "Title",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=21,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#475569"),
        spaceAfter=8,
    )
    section_style = ParagraphStyle(
        "Section",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=12,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=2,
        spaceAfter=2,
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8.2,
        leading=10.2,
        textColor=colors.HexColor("#111827"),
        spaceAfter=2,
    )
    note_style = ParagraphStyle(
        "Note",
        parent=body_style,
        fontSize=7.5,
        leading=9,
        textColor=colors.HexColor("#475569"),
    )

    left_column = []
    left_column.extend(
        section(
            "What It Is",
            "A static browser-based to-do list app with a dashboard-style layout. "
            "It lets users add, edit, delete, and complete tasks in the page, with task data saved in browser localStorage.",
            section_style,
            body_style,
        )
    )
    left_column.append(Spacer(1, 0.08 * inch))
    left_column.extend(
        section(
            "Who It's For",
            "Primary persona: a browser user who wants a lightweight personal task tracker without sign-in or a backend. "
            "This is inferred from the single-user UI and local-only storage.",
            section_style,
            body_style,
        )
    )
    left_column.append(Spacer(1, 0.08 * inch))
    left_column.extend(
        section(
            "What It Does",
            [
                "Shows a three-panel layout with a left navigation sidebar, central task list, and right-side task detail form.",
                "Lets the user add a task from the main input field and Add button.",
                "Loads saved tasks from localStorage on page load.",
                "Marks tasks complete or pending with a checkbox and line-through styling.",
                "Allows task text edits unless a task is marked COMPLETED.",
                "Deletes tasks and rerenders the list immediately.",
                "Includes extra task-detail inputs on the right panel, but repo wiring for those fields was not found.",
            ],
            section_style,
            body_style,
        )
    )

    right_column = []
    right_column.extend(
        section(
            "How It Works",
            [
                "UI layer: `index.html` defines the structure and includes Tailwind CSS from a CDN plus Flowbite JS from a CDN.",
                "App logic: `script.js` queries `#input-box`, `#input-button`, and `#list-container`, then attaches load, click, and change handlers.",
                "Data model: tasks are stored in browser localStorage under `todoLists` as objects with `id`, `list`, and `status`.",
                "Data flow: load -> read localStorage -> render `<li>` items; user action -> update array in localStorage -> call `render()` -> rebuild visible list.",
                "Services/backend: Not found in repo. No server code, API calls, database config, or auth flow were found.",
            ],
            section_style,
            body_style,
        )
    )
    right_column.append(Spacer(1, 0.08 * inch))
    right_column.extend(
        section(
            "How To Run",
            [
                "Open [repo]/index.html in a web browser.",
                "Keep internet access enabled so the Tailwind and Flowbite CDN assets can load.",
                "Type a task in the main input and click Add.",
                "Reopen the same browser later to see tasks restored from localStorage.",
                "Minimal setup docs, package manifest, and local dev server instructions: Not found in repo.",
            ],
            section_style,
            body_style,
        )
    )
    right_column.append(Spacer(1, 0.12 * inch))
    right_column.append(
        p(
            "Repo evidence used: `index.html`, `script.js`, and the unused snippet in `test.text`. "
            "Architecture statements above are limited to what those files show.",
            note_style,
        )
    )

    table = Table(
        [[left_column, right_column]],
        colWidths=[4.95 * inch, 4.55 * inch],
        hAlign="LEFT",
    )
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#f8fafc")),
                ("BACKGROUND", (1, 0), (1, 0), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.7, colors.HexColor("#e2e8f0")),
            ]
        )
    )

    story = [
        p("TO-DO List App Summary", title_style),
        p(
            "One-page overview generated from repository evidence only.",
            subtitle_style,
        ),
        table,
    ]
    doc.build(story)
    return OUTPUT


if __name__ == "__main__":
    print(build_pdf())

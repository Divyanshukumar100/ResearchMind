Here is a refined version of the project documentation, optimized for clarity and impact:

# ResearchMind: Multi-Agent Analytical Research Platform

ResearchMind is a sophisticated, full-stack application that leverages the Google Gemini API to simulate a multi-agent orchestration pipeline. The platform automates the research lifecycle—including search grounding, web scraping, report drafting, and automated peer review—to generate professionally formatted reports with integrated PDF export capabilities.

---

##  Highlighting ResearchMind on Your Resume

Use these bullet points to effectively showcase the project in your **Projects** or **Experience** section:

* **Full-Stack Agentic Orchestration:** Built a multi-agent system using React, Tailwind CSS, Express, and Node.js to automate complex workflows, including specialized Explorer, Reader, Writer, and Critic agents.


* **Advanced LLM Integration:** Leveraged the `@google/genai` SDK to implement dynamic feedback loops, enabling Gemini models to iteratively refine research reports through automated peer evaluation.


* **High-Fidelity UI/UX:** Developed a responsive, professional "Day Mode" interface featuring live pipeline orchestration visualization, fluid transitions with Motion, and a dual-tab architecture.


* **Client-Side Automation:** Engineered a document compilation engine using `jsPDF` to render structured data into polished, corporate-ready PDF reports.



---

## Environment Configuration

To run the application, you must configure your local environment variables:

1. **Initialize Configuration:** Copy the template file by running `cp .env.example .env` in your project root.


2. **Set Credentials:** Open your new `.env` file and input your specific Google Gemini API key:
```env
GEMINI_API_KEY="your key..."
APP_URL="http://localhost:3000"

```



---

##  Deployment Instructions

### Local Development

To launch the development server, follow these steps:

* **Install Dependencies:** Execute `npm install` in the project root.


* **Start Server:** Run `npm run dev` and navigate to `http://localhost:3000` in your web browser.



### Windows Compatibility Workaround

If you encounter a `TypeError [ERR_INVALID_URL_SCHEME]` while running the development server on Windows, use the following production-bundle workaround for stability:

1. **Build the Project:** Run `npm run build` to compile the TypeScript server into a native `dist/server.cjs` bundle.


2. **Launch:** Execute `npm start` to run the production server natively on `http://localhost:3000`.



---

*Would you like assistance drafting a README file for this project's GitHub repository based on these sections?*
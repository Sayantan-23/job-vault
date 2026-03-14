Here is the complete, technology-agnostic project plan. This document focuses purely on **features, architecture, and user experience**, making it perfect for design documents or sharing with other stakeholders regardless of the tools used to build it.

---

# Project Specification: The "Ghost-Proof" Job Application & AI Assistant

## 1. Executive Summary

A comprehensive job application management system designed to solve two major pain points: **information loss** (expired job postings) and **application fatigue** (customizing cover letters). The system acts as a personal "career vault," automatically preserving job descriptions and using that data to generate tailored application materials.

## 2. Core Modules

### A. The Capture Engine (Browser Plugin)

* **Role:** The entry point for data collection. It lives on external job boards (e.g., LinkedIn, Indeed, Company Careers pages).
* **Key Features:**
* **One-Click Capture:** Automatically detects and extracts the Job Title, Company Name, Location, and full Job Description text.
* **Duplicate Detection:** Checks against the database to warn the user if they have already applied to this specific role.
* **Snapshot Status:** Visual confirmation that the job description has been successfully secured in the vault.



### B. The Vault (Central Dashboard)

* **Role:** The command center where users manage their pipeline.
* **Key Features:**
* **Kanban Pipeline:** A drag-and-drop board to move applications through stages (Wishlist → Applied → Interviewing → Offer → Rejected).
* **The "Frozen" View:** A dedicated reading mode that displays the *saved* version of the job description, ensuring the user can always read the requirements even if the original URL returns a 404 error.
* **Ghost Meter:** A dynamic indicator for each application showing days since the last interaction, automatically flagging roles that have likely "ghosted" the user.



### C. The Intelligence Engine (AI & Parsing)

* **Role:** The automation layer that processes text to save time.
* **Key Features:**
* **Resume Parser:** Accepts PDF/DOCX uploads, strips away formatting, and extracts raw text (Skills, Experience, Education) to create a "Master Profile" for the user.
* **Contextual Writer:** Generates custom cover letters by analyzing the overlap between the *Master Profile* and the specific *Saved Job Description*.
* **Gap Analysis:** (Future Scope) Highlights missing keywords in the user's resume compared to the job description.



---

## 3. Data Architecture (Conceptual)

### User Entity

* **Credentials:** Login information.
* **Master Resume:** The raw, parsed text of the user's resume.
* **Preferences:** Target job titles, salary expectations, and preferred locations.

### Job Entity

* **Metadata:** Role, Company, Location, Salary Range, Date Applied.
* **Source Data:** The original URL and the date it was captured.
* **The Snapshot:** A rich-text or HTML blob of the full job description.
* **Status:** Current stage in the hiring pipeline.
* **Generated Assets:** Links to specific cover letters created for this role.

### Application Timeline

* **Event Log:** A history of actions (e.g., "Applied on Jan 1", "Follow-up email sent on Jan 5", "Status changed to Interview on Jan 10").

---

## 4. User Workflows

### Workflow 1: Onboarding

1. User creates an account.
2. User navigates to "Profile Settings."
3. User uploads their current Resume (PDF/DOCX).
4. **System Action:** The system reads the file, extracts the text, and displays a preview for the user to verify.
5. User confirms: "This is my Master Profile."

### Workflow 2: Tracking a Job

1. User browses a job board and finds an interesting role.
2. User opens the **Browser Plugin**.
3. Plugin auto-fills the details (Title, Company, etc.).
4. User clicks "Track Application."
5. **System Action:**
* Creates a new database record.
* Captures the full text of the page immediately.
* (Optional) Takes a visual screenshot for archival.



### Workflow 3: The "AI Assistant" (Cover Letter)

1. User opens the **Vault Dashboard** and clicks on a specific job.
2. User sees the "Frozen" job description on the screen.
3. User clicks the **"Draft Cover Letter"** button.
4. **System Action:**
* Retrieves the User's Master Resume text.
* Retrieves the Saved Job Description text.
* Sends both to the Generative AI Service with a prompt to "match skills and write a persuasive letter."


5. System displays the draft in a text editor.
6. User edits the draft and saves it or exports it to PDF.

---

## 5. UI/UX Design Requirements

### General Aesthetic

* **Theme:** Professional, clean, and distraction-free. Dark mode support is essential.
* **Typography:** High legibility sans-serif for UI elements; Monospace for data fields (dates, salary).

### Dashboard Layout

* **Header:** Global search bar (search by company or tech stack keyword).
* **Main View:** Toggle between "Board View" (Kanban) and "List View" (Excel-style).
* **Cards:** Job cards must show the "Ghost Meter" (e.g., a color-coded bar indicating time passed) and a "Snapshot Saved" icon.

### Job Detail View

* **Split-Screen Interface:**
* **Left Panel:** Job Description (The Snapshot). This should look like a document.
* **Right Panel:** Action Tools. Timeline of events, Notes section, and the "AI Assistant" tab for generating cover letters.



---

## 6. Automation & Background Logic

* **Ghost Detection:** A daily scheduled task runs to check the "Date Applied" vs. "Current Date." If the difference exceeds 14 days with no status change, the job is visually flagged as "At Risk/Ghosted."
* **Link Rot Checker:** (Optional) A background process occasionally checks the original URL. If the URL returns a 404, the UI updates to say "Original Link Expired – Using Snapshot."

## 7. Success Metrics

* **User Efficiency:** Time saved per application (measured by cover letter generation speed).
* **Data Integrity:** Percentage of tracked jobs where the description is successfully retrieved after the original post is deleted.
* **Organization:** Reduction in "forgotten" applications.
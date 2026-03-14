# Frontend Plan 10 — Secondary Public Pages (FAQ, About, Contact, Privacy, Terms)

## Overview

Build the secondary public pages for JobVault. These are simpler content pages that use the `web` layout (WebNavbar + WebFooter from Plan 09) with glassmorphism styling, SEO meta tags, and basic scroll-reveal animations.

---

## Dependencies

- FE-01 (Project Setup) — complete
- FE-09 (Public Core) — WebNavbar, WebFooter, web layout, `useScrollReveal` composable must be built first

---

## File Structure

```
frontend/app/pages/web/
├── faq.vue             # Replace placeholder
├── about.vue           # Replace placeholder
├── contact.vue         # Replace placeholder
├── privacy.vue         # Replace placeholder
└── terms.vue           # Replace placeholder
```

---

## Shared Page Structure

All secondary pages follow this pattern:

```vue
<script setup lang="ts">
definePageMeta({ layout: 'web' });

useSeoMeta({
  title: 'Page Title - JobVault',
  description: 'Page description for SEO.',
  ogTitle: 'Page Title - JobVault',
  ogDescription: 'Page description for social sharing.',
});

// Optional: scroll reveal animations
const { reveal } = useScrollReveal();
onMounted(() => {
  reveal('.page-heading', { direction: 'up' });
  reveal('.page-content', { direction: 'up', delay: 0.2 });
});
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
    <!-- Page heading -->
    <div class="page-heading text-center mb-12">
      <h1 class="text-3xl sm:text-4xl font-bold text-highlighted mb-4">
        Page Title
      </h1>
      <p class="text-lg text-muted max-w-2xl mx-auto">
        Page subtitle / description
      </p>
    </div>

    <!-- Glass card wrapper -->
    <div class="page-content rounded-2xl border border-white/20 dark:border-gray-700/30
                bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg p-6 sm:p-8
                shadow-lg shadow-black/5">
      <!-- Page-specific content -->
    </div>
  </div>
</template>
```

---

## Pages

### 1. FAQ Page (`pages/web/faq.vue`)

- **Heading**: "Frequently Asked Questions"
- **Subtext**: "Everything you need to know about JobVault."
- **Component**: `UAccordion` inside a glass card wrapper
- **8 Q&A items**:

| # | Question | Answer (placeholder) |
|---|----------|---------------------|
| 1 | What is JobVault? | JobVault is a free job application tracker that helps you manage your entire job search pipeline. Track applications with a Kanban board, preserve job postings before they expire, detect employer ghosting, and generate AI-powered cover letters. |
| 2 | Is JobVault free to use? | Yes, JobVault is completely free. All features — including AI cover letter generation, job scraping, ghost detection, and timeline tracking — are available at no cost. |
| 3 | How does ghost detection work? | JobVault automatically tracks the number of days since your last interaction with each application. Jobs are classified as "safe" (under 7 days), "warming" (7-14 days), or "ghost risk" (14+ days). You'll get alerts when applications go silent. |
| 4 | How does AI cover letter generation work? | Upload your resume and select a job from your pipeline. Our AI analyzes both documents and generates a tailored cover letter that highlights relevant experience and matches the job requirements. You can edit, export, and regenerate as needed. |
| 5 | Is my data secure? | Absolutely. All data is encrypted in transit and at rest. We never share or sell your personal information. Your job search data is yours — you can export or delete it at any time. |
| 6 | Can I import existing applications? | Currently, you can add jobs by pasting a URL (we'll scrape and preserve the listing) or by manual entry. Bulk import from spreadsheets is on our roadmap. |
| 7 | What browsers are supported? | JobVault works in all modern browsers: Chrome, Firefox, Safari, and Edge. We also have a Chrome extension (coming soon) for saving jobs directly from job boards. |
| 8 | How do I delete my account? | You can delete your account from the Settings page. This will permanently remove all your data including saved jobs, cover letters, and profile information. This action cannot be undone. |

- **SEO**:
  ```typescript
  useSeoMeta({
    title: 'FAQ - JobVault',
    description: 'Frequently asked questions about JobVault. Learn about ghost detection, AI cover letters, data security, and more.',
    ogTitle: 'FAQ - JobVault',
    ogDescription: 'Find answers to common questions about JobVault.',
  });
  ```

---

### 2. About Page (`pages/web/about.vue`)

- **Heading**: "About JobVault"
- **Subtext**: "Built by job seekers, for job seekers."

**Mission section** (glass card):
- 2-3 paragraphs:
  - "The modern job search is broken. You apply to dozens of positions, carefully craft each application, and then... silence. Companies ghost candidates with alarming regularity, job postings vanish without a trace, and keeping track of where you applied becomes a full-time job in itself."
  - "JobVault was born from this frustration. We built a tool that puts job seekers back in control. Our platform preserves job descriptions before they disappear, tracks exactly which companies have gone silent, and uses AI to help you put your best foot forward with every application."
  - "Whether you're a fresh graduate or a seasoned professional, JobVault gives you the visibility and tools to run a smarter, more organized job search."

**Our Values section** — 3 glass cards in `grid grid-cols-1 md:grid-cols-3 gap-6`:

| # | Icon | Title | Description |
|---|------|-------|-------------|
| 1 | `i-lucide-eye` | Transparency | Your job search data is yours. We believe in full visibility into your pipeline — no hidden statuses, no black boxes. |
| 2 | `i-lucide-shield` | Privacy | Your data is encrypted and never shared. We don't sell your information or track your browsing habits. |
| 3 | `i-lucide-sparkle` | Simplicity | Powerful features wrapped in an intuitive interface. No learning curve, no clutter — just the tools you need. |

- Card style: same glassmorphism as feature cards with icon wrapper

- **SEO**:
  ```typescript
  useSeoMeta({
    title: 'About - JobVault',
    description: 'Learn about JobVault\'s mission to ghost-proof your job search. Built by job seekers, for job seekers.',
    ogTitle: 'About - JobVault',
    ogDescription: 'Built by job seekers, for job seekers. Learn about our mission.',
  });
  ```

---

### 3. Contact Page (`pages/web/contact.vue`)

- **Heading**: "Get in Touch"
- **Subtext**: "Have questions, feedback, or partnership inquiries? We'd love to hear from you."

**Two-column layout** (`grid grid-cols-1 lg:grid-cols-2 gap-8`):

**Left column** — Contact form in a glass card (UI only, no backend):
- Name: `UInput icon="i-lucide-user" placeholder="Your name" size="lg"`
- Email: `UInput type="email" icon="i-lucide-mail" placeholder="your@email.com" size="lg"`
- Subject: `USelect` with items: General Inquiry, Bug Report, Feature Request, Partnership
- Message: `UTextarea placeholder="Tell us what's on your mind..." rows="5"`
- Submit: `UButton label="Send Message" class="btn-gradient" block`
- On submit: `useToastNotify().info('Thanks for reaching out! Our contact form will be connected soon.')`
- Use `UForm` with basic validation (name, email required)

**Right column** — Contact info + social links:
- **Email section**: `i-lucide-mail` icon + "hello@jobvault.app" (placeholder)
- **Response time**: "We typically respond within 24 hours."
- **Social links** (stacked, with labels):
  - Facebook (`i-simple-icons-facebook`) — `href="#"`
  - LinkedIn (`i-simple-icons-linkedin`) — `href="#"`
  - Instagram (`i-simple-icons-instagram`) — `href="#"`
  - YouTube (`i-simple-icons-youtube`) — `href="#"`
- Each social link: `flex items-center gap-3 text-muted hover:text-highlighted transition-colors`

- **SEO**:
  ```typescript
  useSeoMeta({
    title: 'Contact - JobVault',
    description: 'Get in touch with the JobVault team. Questions, feedback, bug reports, or partnership inquiries welcome.',
    ogTitle: 'Contact - JobVault',
    ogDescription: 'Reach out to the JobVault team.',
  });
  ```

---

### 4. Privacy Policy Page (`pages/web/privacy.vue`)

- **Heading**: "Privacy Policy"
- **Subtext**: "Last updated: March 2026"
- **Wrapper**: glass card with `prose dark:prose-invert max-w-none` for readable long-form text

**6 sections:**

1. **Information We Collect** — We collect information you provide directly: name, email address, and job application data you enter into JobVault. We also collect usage data such as page views and feature interactions to improve the service.

2. **How We Use Your Information** — Your information is used solely to provide and improve JobVault's services. This includes powering features like AI cover letter generation, ghost detection, and timeline tracking. We never use your data for advertising.

3. **Data Storage & Security** — Your data is stored in encrypted databases hosted on secure cloud infrastructure. All data transmission uses HTTPS encryption. We implement industry-standard security measures to protect against unauthorized access.

4. **Third-Party Services** — JobVault uses select third-party services: Google OAuth for authentication, Cloudinary for file storage, and Google Gemini for AI features. These services have their own privacy policies and are bound by data processing agreements.

5. **Your Rights** — You have the right to access, export, or delete your data at any time through the Settings page. You can also request a copy of all data we store about you by contacting us.

6. **Contact Us** — If you have questions about this privacy policy, please contact us at privacy@jobvault.app.

- **SEO**:
  ```typescript
  useSeoMeta({
    title: 'Privacy Policy - JobVault',
    description: 'JobVault privacy policy. Learn how we collect, use, and protect your data.',
    ogTitle: 'Privacy Policy - JobVault',
    ogDescription: 'Learn how JobVault handles your data.',
  });
  ```

---

### 5. Terms & Conditions Page (`pages/web/terms.vue`)

- **Heading**: "Terms & Conditions"
- **Subtext**: "Last updated: March 2026"
- **Wrapper**: glass card with `prose dark:prose-invert max-w-none`

**8 sections:**

1. **Acceptance of Terms** — By accessing or using JobVault, you agree to be bound by these Terms & Conditions. If you do not agree, please do not use the service.

2. **Use of Service** — JobVault is provided as a free job application tracking tool. You may use it for personal, non-commercial purposes. You agree not to misuse the service, attempt to gain unauthorized access, or use automated systems to scrape or overload the platform.

3. **User Accounts** — You are responsible for maintaining the confidentiality of your account credentials. You must provide accurate information during registration and keep your profile up to date. You are responsible for all activity under your account.

4. **Intellectual Property** — JobVault and its original content, features, and functionality are owned by JobVault and protected by applicable intellectual property laws. Job descriptions scraped and stored are retained for your personal use only.

5. **Limitation of Liability** — JobVault is provided "as is" without warranties of any kind. We are not liable for any loss of data, missed job opportunities, or damages arising from your use of the service.

6. **Termination** — We reserve the right to suspend or terminate your account at our discretion if you violate these terms. You may delete your account at any time through the Settings page.

7. **Changes to Terms** — We may update these terms from time to time. Continued use of JobVault after changes constitutes acceptance of the updated terms. We will notify users of significant changes via email or in-app notification.

8. **Contact Us** — For questions about these terms, please contact us at legal@jobvault.app.

- **SEO**:
  ```typescript
  useSeoMeta({
    title: 'Terms & Conditions - JobVault',
    description: 'JobVault terms and conditions of service. Read our terms of use, liability limitations, and user responsibilities.',
    ogTitle: 'Terms & Conditions - JobVault',
    ogDescription: 'JobVault terms of service.',
  });
  ```

---

## Styling Guidelines

### Glass card for content pages

```
rounded-2xl border border-white/20 dark:border-gray-700/30
bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg
p-6 sm:p-8 shadow-lg shadow-black/5
```

### Prose styling for legal pages

```html
<div class="prose dark:prose-invert max-w-none
            prose-headings:text-highlighted prose-headings:font-semibold
            prose-p:text-muted prose-a:text-primary">
```

### Section spacing

- Page container: `mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8`
- Heading: `text-3xl sm:text-4xl font-bold text-highlighted text-center mb-4`
- Subtext: `text-lg text-muted text-center max-w-2xl mx-auto mb-12`

---

## Implementation Order

1. `pages/web/faq.vue` — FAQ with UAccordion
2. `pages/web/about.vue` — About with mission + values
3. `pages/web/contact.vue` — Contact form + social links
4. `pages/web/privacy.vue` — Privacy policy
5. `pages/web/terms.vue` — Terms and conditions

---

## Acceptance Criteria

- [ ] FAQ page renders with UAccordion containing 8 Q&A items
- [ ] FAQ accordion items expand/collapse correctly
- [ ] About page has mission text and 3 values cards
- [ ] Contact page has a form (name, email, subject, message) with validation
- [ ] Contact form shows toast on submit (no backend)
- [ ] Contact page shows social media links
- [ ] Privacy policy page has 6 sections with proper headings
- [ ] Terms page has 8 sections with proper headings
- [ ] Legal pages use prose styling for readable text
- [ ] All pages use `layout: 'web'` and have `useSeoMeta()`
- [ ] All pages render correctly in light and dark modes
- [ ] All pages are responsive (mobile, tablet, desktop)
- [ ] No auth middleware blocks access to any page
- [ ] Basic scroll-reveal animations work on page headings and content cards

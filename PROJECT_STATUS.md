# Project Status

## Overview

This project is a Next.js prototype for a role-based productivity and project management experience. It currently combines an animated landing page, client-side authentication screens, a worker workspace, and a manager dashboard.

## Implemented Features

### Landing experience

- Full-screen scroll-driven inversion animation.
- Expanding black circle that transitions between the opening and content sections.
- Scroll-reveal animation for the closing content section.
- Responsive typography and layout for desktop and mobile screens.
- `Get started` call to action that opens the authentication flow.

### Authentication

- Full-screen authentication view with animated transitions.
- Sign in form with email and password validation.
- Sign up form with name, email, password, terms acceptance, and avatar upload/preview support.
- Forgot-password form and reset-success state.
- Password visibility toggle.
- Worker and Manager role selector.
- Google sign-in button UI.
- Escape-key support for closing the authentication view before login.
- Demo login validation using the included credentials:
  - Email: `lav@gmail.com`
  - Password: `123456`

### Worker workspace

- Worker login routes to a dark workspace layout.
- Collapsible sidebar navigation.
- User profile area with avatar, fallback initials, role, and email.
- Profile settings and preferences menu items in the profile dropdown.
- Logout action returns to the unauthenticated landing experience.
- AI-style chat workspace with:
  - Auto-resizing message textarea.
  - Enter-to-submit behavior.
  - Attachment, project, and send controls.
  - Quick actions for cloning a screenshot, importing from Figma, uploading a project, creating a landing page, and creating a sign-up form.

### Manager workspace

- Manager login routes to a project management workspace.
- Shared collapsible sidebar with active navigation state.
- Home view containing the project Kanban board.
- Analytics view accessible from the sidebar.
- Logout action returns to the unauthenticated landing experience.

### Kanban project board

- `To Do`, `In Progress`, and `Done` columns.
- Pre-populated example project cards.
- Drag-and-drop cards between columns.
- Add cards to a column.
- Delete cards.
- Card metadata for tags, priority, dates, avatars, comments, attachments, and task progress.
- Animated card and interaction states.

### Analytics dashboard

- Responsive bento-style analytics layout.
- Weekly Traffic bar chart with animated bars and hover percentages.
- System Health radar chart with interactive metric points and values.
- System Load donut chart with animated slices, hover expansion, and dimmed inactive slices.
- Responsive one-column and two-column layouts.
- Brutalist visual treatment with high-contrast borders, shadows, and colored data visualizations.

## Technical Work Completed

- Next.js App Router structure is in place.
- React 19 and TypeScript are configured.
- Tailwind CSS v4 is configured through PostCSS.
- Framer Motion is used for page, chart, and component animations.
- React Hook Form and Zod are used for form state and validation.
- Radix UI primitives are used for accessible interface building blocks.
- Lucide React is used for interface icons.
- Shared UI components include buttons, inputs, labels, cards, avatars, checkboxes, collapsibles, dropdown menus, navigation, resizable panels, scroll areas, separators, sheets, and textareas.
- The application runs locally with `npm run dev` at `http://localhost:3000`.

## Current State

The project is a functional front-end prototype. The major role-based flows and interactive UI surfaces are wired together in the browser, but there is no backend or database integration yet.

Authentication is simulated in the client, and only the demo credentials are accepted. Board changes, authentication state, and chat input are held in React state and are lost when the page is refreshed. The chat interface currently provides the composer and quick-action UI; it does not send requests to an AI service.

## Known Issues and Follow-up Work

- Connect authentication to a real identity provider or backend API.
- Persist users, sessions, projects, cards, and analytics data.
- Implement real AI chat responses and project generation actions.
- Make profile settings, preferences, product categories, and user navigation functional.
- Add card reordering within a column and richer card editing.
- Replace static analytics data with API-backed metrics.
- Add automated tests for authentication, role routing, Kanban actions, and responsive behavior.
- Review the Framer Motion SVG chart color animation warning caused by animating between the named color `white` and hexadecimal colors; use consistently animatable color values.

## Useful Commands

```bash
npm run dev      # Start the development server
npm run lint     # Run ESLint
npm run build    # Create a production build
npm run start    # Start the production server
```

## Main Entry Points

- `app/page.tsx` - Application home page.
- `demo.tsx` - Demo component wrapper.
- `components/ui/inversion-circle-scroll-animation.tsx` - Landing animation, authentication modal, and role routing.
- `components/ui/auth-form-1.tsx` - Authentication forms and validation.
- `components/ui/sidenavbar.tsx` - Authenticated workspace navigation.
- `components/ui/kanban-board.tsx` - Manager project board.
- `components/ui/bento-dashboard.tsx` - Manager analytics dashboard.
- `components/ui/v0-ai-chat.tsx` - Worker chat workspace.

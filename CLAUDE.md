# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EPGAS Analytics is a Next.js-based web application for generating automated reports for the electricity and gas industry. The application features an AI-powered chat interface that allows users to upload CSV data and receive formatted HTML reports analyzing energy market data.

## Development Commands

- **Development server**: `pnpm dev` or `npm run dev`
- **Build**: `pnpm build` or `npm run build`
- **Production server**: `pnpm start` or `npm run start`
- **Lint**: `pnpm lint` or `npm run lint`

## Technology Stack

- **Framework**: Next.js 15.2.4 with App Router
- **Language**: TypeScript
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with Tailwind CSS v4
- **Package Manager**: pnpm (preferred, as evidenced by pnpm-lock.yaml)
- **Fonts**: Geist Sans and Geist Mono
- **Icons**: Lucide React
- **Theming**: next-themes for dark/light mode support

## Code Architecture

### App Structure (Next.js App Router)
- `app/layout.tsx` - Root layout with Japanese locale and Geist fonts
- `app/page.tsx` - Main application component (EPGASAnalytics)
- `app/globals.css` - Global styles and Tailwind imports

### Component Organization
- `components/ui/` - Reusable UI components (Button, Textarea, etc.)
- `components/theme-provider.tsx` - Theme provider wrapper for next-themes
- `lib/utils.ts` - Utility functions (primarily the `cn` function for class merging)

### Key Application Features
- **Chat Interface**: Real-time streaming chat simulation for AI interactions
- **File Upload**: CSV data upload functionality
- **Report Generation**: HTML report preview with iframe rendering
- **Responsive Design**: Mobile-first with adaptive UI (chat/preview view switching)
- **Export Options**: HTML download and PDF conversion (placeholder)

## Configuration Files

- `tsconfig.json` - TypeScript configuration with `@/*` path alias
- `next.config.mjs` - Next.js config with ESLint/TypeScript build error ignoring
- `components.json` - shadcn/ui configuration with "new-york" style
- `postcss.config.mjs` - PostCSS configuration for Tailwind
- Package management uses pnpm with lockfile

## Development Notes

### Component Patterns
- Uses TypeScript with strict typing
- Components follow React functional component patterns with hooks
- UI components are built on Radix UI primitives via shadcn/ui
- Styling uses Tailwind CSS with the `cn()` utility for conditional classes

### State Management
- Local React state with useState for chat messages and UI state
- No external state management library (Redux, Zustand, etc.)

### Styling Approach
- Tailwind CSS with CSS variables for theming
- Component variants using class-variance-authority
- Mobile-responsive design with sm:, md: breakpoints

### Key File Locations
- Static assets in `public/` including sample report HTML
- Component library in `components/ui/`
- Main application logic in `app/page.tsx:EPGASAnalytics`
- Utility functions in `lib/utils.ts:cn`

## Project Context

This is a v0.app generated project (as indicated in README.md) for Japanese electricity and gas industry analytics. The application simulates AI-powered report generation with a focus on Japanese market data visualization and CSV data processing.
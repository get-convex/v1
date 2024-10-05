![hero](image.png)


<p align="center">
	<h1 align="center"><b>Create v1</b></h1>
<p align="center">
    An open-source starter kit based on an <a href="https://v1.run">open-source starter kit</a> by <a href="https://midday.ai">Midday</a>. Ported to <a href="https://convex.dev">Convex</a>.
    <br />
    <br />
    <a href="https://v1-convex.vercel.app"><strong>Website</strong></a> ·
    <a href="https://github.com/get-convex/v1-convex/issues"><strong>Issues</strong></a> ·
    <a href="#whats-included"><strong>What's included</strong></a> ·
    <a href="#prerequisites"><strong>Prerequisites</strong></a> ·
    <a href="#getting-started"><strong>Getting Started</strong></a> ·
    <a href="#how-to-use"><strong>How to use</strong></a>
  </p>
</p>

Everything you need to build a production ready SaaS, it's an opinionated stack
using Convex and the latest Next.js framework, a monorepo with a focus on code
reuse and best practices that will grow with your business.

## What's included

[Convex](https://convex.dev/) - Authentication, database, storage, background jobs, validated server actions, cache, rate limiting<br>
[Next.js](https://nextjs.org/) - Framework<br>
[Turborepo](https://turbo.build) - Build system<br>
[Biome](https://biomejs.dev) - Linter, formatter<br>
[TailwindCSS](https://tailwindcss.com/) - Styling<br>
[Shadcn](https://ui.shadcn.com/) - UI components<br>
[TypeScript](https://www.typescriptlang.org/) - Type safety<br>
[React Email](https://react.email/) - Email templates<br>
[Resend](https://resend.com/) - Email delivery<br>
[i18n](https://next-international.vercel.app/) - Internationalization<br>
[Sentry](https://sentry.io/) - Error handling/monitoring<br>
[Dub](https://dub.sh/) - Sharable links<br>
[OpenPanel](https://openpanel.dev/) - Analytics<br>
[Polar](https://polar.sh) - Billing (coming soon)<br>
[nuqs](https://nuqs.47ng.com/) - Type-safe search params state manager<br>
[next-themes](https://next-themes-example.vercel.app/) - Theme manager<br>

## Directory Structure

```
.
├── apps                         # App workspace
│    ├── app                     # App - your product
│    ├── web                     # Marketing site
│    └── ...
├── packages                     # Shared packages between apps
│    ├── analytics               # OpenPanel analytics
│    ├── backend                 # Convex (API, Auth, Database, Storage, Background Jobs, Validated Server Actions, Cache, Rate Limiting)
│    ├── email                   # React email library
│    ├── logger                  # Logger library
│    └── ui                      # Shared UI components (Shadcn)
├── tooling                      # are the shared configuration that are used by the apps and packages
│    └── typescript              # Shared TypeScript configuration
├── .cursorrules                 # Cursor rules specific to this project
├── biome.json                   # Biome configuration
├── turbo.json                   # Turbo configuration
├── LICENSE
└── README.md
```

## Prerequisites

Bun<br>
Dub<br>
Resend<br>
Sentry<br>
OpenPanel<br>

## Getting Started

Follow these steps to set up your project:

1. Clone the repository:
   ```bash
   bunx degit get-convex/v1 v1
   cd v1
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Initialize git repository:
   ```bash
   git init && git commit -am 'initial commit'
   ```

4. Set up Convex backend:
   ```bash
   cd packages/backend
   npm run setup
   ```
   This will create a new Convex project. It will fail after project creation due to missing environment variables, which is expected at this stage.

5. Set up authentication:
   ```bash
   npx @convex-dev/auth
   ```
   Follow the prompts to configure authentication for your project.

6. Return to the root directory and run the setup script:
   ```bash
   cd ../..
   bun run setup-env
   ```
   This script will guide you through setting up various services and environment variables.

7. Copy Convex environment variables:
   - Copy the contents of `packages/backend/.env`
   - Paste these variables into the environment variables panel in your Convex dashboard

8. Start the development server from either bun or turbo:

```bash
bun dev // starts everything in development mode
bun dev:web // starts the web app in development mode
bun dev:app // starts the app in development mode
bun dev:convex // starts the convex api in development mode
bun dev:email // starts the email app in development mode
```

#!/usr/bin/env node

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { program } from "commander";
import inquirer from "inquirer";

async function main() {
  program
    .name("create-v1")
    .description("Create a new v1 project")
    .argument("[project-directory]", "directory to create the project in")
    .action(async (projectDirectory) => {
      const answers = await inquirer.prompt([
        {
          type: "input",
          name: "projectName",
          message: "What is your project named?",
          default: projectDirectory || "my-v1-project",
        },
        // Add more prompts as needed
      ]);

      const projectDir = path.resolve(process.cwd(), answers.projectName);

      console.log(`Creating a new v1 project in ${projectDir}...`);

      // Clone the repository
      execSync(`bunx degit get-convex/v1 ${projectDir}`);

      // Change to project directory
      process.chdir(projectDir);

      // Install dependencies
      console.log("Installing dependencies...");
      execSync("bun install", { stdio: "inherit" });

      // Initialize git repository
      console.log("Initializing git repository...");
      execSync('git init && git add . && git commit -m "Initial commit"', {
        stdio: "inherit",
      });

      // Set up Convex backend
      console.log("Setting up Convex backend...");
      process.chdir("packages/backend");
      execSync("npm run setup", { stdio: "inherit" });

      // Set up authentication
      console.log("Setting up authentication...");
      execSync("npx @convex-dev/auth", { stdio: "inherit" });

      // Run the setup-env script
      console.log("Setting up environment variables...");
      process.chdir("../..");
      execSync("bun run setup-env", { stdio: "inherit" });

      console.log("Project setup complete!");
      console.log("To start your development server:");
      console.log(`  cd ${answers.projectName}`);
      console.log("  bun dev");
    });

  await program.parseAsync(process.argv);
}

main().catch(console.error);

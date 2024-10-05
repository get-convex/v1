#!/usr/bin/env node

import { execSync } from "node:child_process";
import path from "node:path";
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
      execSync(`bunx degit erquhart/v1-convex ${projectDir}`, {
        stdio: "inherit",
      });

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
      try {
        execSync("npm run setup", { stdio: "inherit" });
      } catch (error) {
        console.error(
          "Convex setup command failed. This error is expected during initial setup. Continuing...",
        );
      }

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

main().catch((error) => {
  console.error("An error occurred during project setup:");
  console.error(error);
  process.exit(1);
});

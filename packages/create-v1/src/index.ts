#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { program } from "commander";
import dotenv from "dotenv";
import inquirer from "inquirer";

interface EnvVariable {
  name: string;
  envFiles: string[];
  details: string;
  required?: boolean;
  defaultValue?: string;
}

interface SetupStep {
  title: string;
  instructions: string;
  variables: EnvVariable[];
  additionalInstructions?: string[];
}

interface SetupConfig {
  introMessage: string;
  steps: SetupStep[];
}

function loadConfig(projectDir: string): SetupConfig {
  const configPath = path.join(projectDir, "setup-config.json");
  const configContent = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(configContent) as SetupConfig;
}

function getExistingValue(envFiles: string[], key: string): string | undefined {
  for (const envFile of envFiles) {
    try {
      const envContent = fs.readFileSync(envFile, "utf-8");
      const envConfig = dotenv.parse(envContent);
      if (envConfig[key]) {
        return envConfig[key];
      }
    } catch (error) {
      // File doesn't exist or can't be read, continue to the next file
    }
  }
  return undefined;
}

function updateEnvFile(filePath: string, key: string, value: string): void {
  let content = "";
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    // File doesn't exist, we'll create it
  }

  const envConfig = dotenv.parse(content);
  envConfig[key] = value;

  const newContent = Object.entries(envConfig)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  fs.writeFileSync(filePath, newContent);
}

async function setupEnvironment(projectDir: string): Promise<void> {
  const config = loadConfig(projectDir);

  console.log(chalk.yellow(config.introMessage));
  console.log(chalk.dim("Press Ctrl+C at any time to exit\n"));

  for (const [index, step] of config.steps.entries()) {
    console.log(chalk.bold.blue(`\nStep ${index + 1}: ${step.title}`));
    console.log(step.instructions);

    if (step.additionalInstructions) {
      console.log(chalk.yellow("\nAdditional Instructions:"));
      for (const instruction of step.additionalInstructions) {
        console.log(chalk.yellow(`- ${instruction}`));
      }
      console.log();
    }

    for (const variable of step.variables) {
      console.log(chalk.dim(`\n${variable.details}`));
      const existingValue = getExistingValue(
        variable.envFiles.map((file) => path.join(projectDir, file)),
        variable.name,
      );
      const defaultValue = existingValue || variable.defaultValue;
      const requiredText = variable.required === false ? " (optional)" : "";
      const answer = await inquirer.prompt([
        {
          type: "input",
          name: "value",
          message: `Enter ${chalk.bold(variable.name)}${requiredText}:`,
          default: defaultValue,
        },
      ]);

      if (answer.value || variable.required !== false) {
        for (const envFile of variable.envFiles) {
          updateEnvFile(
            path.join(projectDir, envFile),
            variable.name,
            answer.value,
          );
        }
      }
    }

    console.log(chalk.green("✔ Step completed"));
  }

  console.log(
    chalk.bold.green(
      "\nSetup complete! Environment variables have been updated.",
    ),
  );
}

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
        console.log(
          "Convex setup command failed. This error is expected during initial setup. Continuing...",
        );
      }

      // Set up authentication
      console.log("Setting up authentication...");
      execSync("npx @convex-dev/auth --skip-git-check", { stdio: "inherit" });

      // Run the environment setup
      console.log("Setting up environment variables...");
      process.chdir("../..");
      await setupEnvironment(projectDir);

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

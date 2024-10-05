#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { program } from "commander";
import dotenv from "dotenv";
import inquirer from "inquirer";
import ora from "ora";

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

  console.log(
    chalk.bold.cyan("\n🚀 Welcome to the v1 Environment Setup Wizard"),
  );
  console.log(chalk.dim(config.introMessage));
  console.log(chalk.dim("Press Ctrl+C at any time to exit\n"));

  for (const [index, step] of config.steps.entries()) {
    console.log(chalk.bold.blue(`\n📍 Step ${index + 1}: ${step.title}`));
    console.log(chalk.white(step.instructions));

    if (step.additionalInstructions) {
      console.log(chalk.yellow("\nℹ️  Additional Instructions:"));
      for (const instruction of step.additionalInstructions) {
        console.log(chalk.yellow(`  • ${instruction}`));
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

    console.log(chalk.green("✅ Step completed"));
  }

  console.log(
    chalk.bold.green(
      "\n🎉 Setup complete! Environment variables have been updated.",
    ),
  );
}

async function createNewProject(projectName: string): Promise<void> {
  const projectDir = path.resolve(process.cwd(), projectName);

  console.log(
    chalk.bold.cyan(`\n🚀 Creating a new v1 project in ${projectDir}...\n`),
  );

  const tasks = [
    {
      title: "Cloning repository",
      task: () =>
        execSync(`bunx degit erquhart/v1-convex ${projectDir}`, {
          stdio: "ignore",
        }),
    },
    {
      title: "Installing dependencies",
      task: () => {
        process.chdir(projectDir);
        execSync("bun install", { stdio: "ignore" });
      },
    },
    {
      title: "Initializing git repository",
      task: () =>
        execSync('git init && git add . && git commit -m "Initial commit"', {
          stdio: "ignore",
        }),
    },
    {
      title: "Setting up Convex backend",
      task: () => {
        process.chdir("packages/backend");
        try {
          execSync("npm run setup", { stdio: "ignore" });
        } catch (error) {
          console.log(
            chalk.yellow(
              "\nℹ️  Convex setup command failed. This error is expected during initial setup. Continuing...",
            ),
          );
        }
      },
    },
    {
      title: "Setting up authentication",
      task: () =>
        execSync("npx @convex-dev/auth --skip-git-check", { stdio: "ignore" }),
    },
  ];

  for (const task of tasks) {
    const spinner = ora(task.title).start();
    try {
      await task.task();
      spinner.succeed();
    } catch (error) {
      spinner.fail();
      console.error(chalk.red(`Error during ${task.title.toLowerCase()}:`));
      console.error(error);
      process.exit(1);
    }
  }

  // Return to project root
  process.chdir("../..");

  // Setup environment variables
  await setupEnvironment(projectDir);

  console.log(chalk.bold.green("\n🎉 Project setup complete!"));
  console.log(chalk.cyan("\nTo start your development server:"));
  console.log(chalk.white(`  cd ${projectName}`));
  console.log(chalk.white("  bun dev"));
}

async function main() {
  console.log(chalk.bold.cyan("\n🌟 Welcome to Create v1"));

  program
    .name("create-v1")
    .description("Create a new v1 project or manage environment variables")
    .argument("[project-name]", "Name of the new project")
    .action(async (projectName) => {
      if (!projectName) {
        const { action } = await inquirer.prompt([
          {
            type: "list",
            name: "action",
            message: "What would you like to do?",
            choices: [
              { name: "Create a new v1 project", value: "create" },
              {
                name: "Manage environment variables for an existing project",
                value: "env",
              },
            ],
          },
        ]);

        if (action === "create") {
          const { projectName } = await inquirer.prompt([
            {
              type: "input",
              name: "projectName",
              message: "What is your project named?",
              default: "my-v1-project",
            },
          ]);
          await createNewProject(projectName);
        } else {
          // Manage environment variables for an existing project
          const currentDir = process.cwd();
          if (!fs.existsSync(path.join(currentDir, "setup-config.json"))) {
            console.error(
              chalk.red(
                "Error: This doesn't appear to be a v1 project directory.",
              ),
            );
            console.error(
              chalk.red(
                "Please run this command from the root of your v1 project.",
              ),
            );
            process.exit(1);
          }
          await setupEnvironment(currentDir);
        }
      } else {
        // If a project name is provided, create a new project
        await createNewProject(projectName);
      }
    });

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  console.error(chalk.red("\n❌ An error occurred during project setup:"));
  console.error(error);
  process.exit(1);
});

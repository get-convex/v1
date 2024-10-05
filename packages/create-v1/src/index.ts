#!/usr/bin/env node

import { type ExecException, exec, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import boxen from "boxen";
import chalk from "chalk";
import { program } from "commander";
import dotenv from "dotenv";
import inquirer from "inquirer";
import ora, { type Ora } from "ora";
import wrapAnsi from "wrap-ansi";

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

function printBox(title: string, content: string) {
  const wrapped = wrapAnsi(content, 60);
  console.log(
    boxen(wrapped, {
      title,
      titleAlignment: "center",
      padding: 1,
      margin: 1,
      borderColor: "cyan",
    }),
  );
}

function createLogger() {
  let enabled = true;
  return {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    log: (...args: any[]) => {
      if (enabled) {
        console.log(...args);
      }
    },
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    error: (...args: any[]) => {
      if (enabled) {
        console.error(...args);
      }
    },
    setEnabled: (value: boolean) => {
      enabled = value;
    },
  };
}

const logger = createLogger();

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

  logger.log(
    chalk.bold.cyan(`\n🚀 Creating a new v1 project in ${projectDir}...\n`),
  );

  const tasks = [
    {
      title: "Cloning repository",
      task: () =>
        new Promise<void>((resolve, reject) => {
          exec(
            `bunx degit erquhart/v1-convex ${projectDir}`,
            (error: ExecException | null) => {
              if (error) reject(error);
              else resolve();
            },
          );
        }),
    },
    {
      title: "Installing dependencies",
      task: () =>
        new Promise<void>((resolve, reject) => {
          process.chdir(projectDir);
          exec("bun install", (error: ExecException | null) => {
            if (error) reject(error);
            else resolve();
          });
        }),
    },
    {
      title: "Initializing git repository",
      task: () =>
        new Promise<void>((resolve, reject) => {
          exec(
            'git init && git add . && git commit -m "Initial commit"',
            (error: ExecException | null) => {
              if (error) reject(error);
              else resolve();
            },
          );
        }),
    },
    {
      title: "Setting up Convex backend",
      task: async (spinner: Ora) => {
        process.chdir("packages/backend");
        printBox(
          "🔧 Convex Setup",
          "You'll now be guided through the Convex project setup process. This will create a new Convex project or link to an existing one.",
        );

        spinner.stop();
        return new Promise<void>((resolve, reject) => {
          const child = spawn("npm", ["run", "setup"], {
            stdio: "inherit",
            shell: true,
          });

          child.on("exit", (code) => {
            if (code === 0 || code === 1) {
              logger.log(
                chalk.yellow(
                  "\nNote: The Convex setup process exited as expected. This is normal at this stage due to missing environment variables.",
                ),
              );
              resolve();
            } else {
              reject(new Error(`Convex setup exited with code ${code}`));
            }
          });

          child.on("error", (error) => {
            reject(error);
          });
        });
      },
    },
    {
      title: "Setting up authentication",
      task: async (spinner: Ora) => {
        printBox(
          "🔐 Authentication Setup",
          "You'll now be guided through the authentication setup process. This will configure authentication for your Convex project.",
        );

        spinner.stop();
        return new Promise<void>((resolve, reject) => {
          const child = spawn("npx", ["@convex-dev/auth", "--skip-git-check"], {
            stdio: "inherit",
            shell: true,
          });

          child.on("exit", (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(
                new Error(`Authentication setup failed with code ${code}`),
              );
            }
          });

          child.on("error", (error) => {
            reject(error);
          });
        });
      },
    },
  ];

  for (const task of tasks) {
    const spinner = ora(task.title).start();
    try {
      logger.setEnabled(false);
      await task.task(spinner);
      logger.setEnabled(true);
      spinner.succeed();
    } catch (error) {
      logger.setEnabled(true);
      spinner.fail();
      logger.error(chalk.red(`Error during ${task.title.toLowerCase()}:`));
      logger.error(error);
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
    .action(async (projectName: string | undefined) => {
      if (!projectName) {
        const { action } = await inquirer.prompt<{ action: string }>([
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
          const { projectName } = await inquirer.prompt<{
            projectName: string;
          }>([
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

#!/usr/bin/env node

import { type ExecException, exec, execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import boxen from "boxen";
import chalk from "chalk";
import { program } from "commander";
import dotenv from "dotenv";
import inquirer from "inquirer";
import ora, { type Ora } from "ora";
import wrapAnsi from "wrap-ansi";

interface EnvVariable {
  name: string;
  projects: string[]; // Changed from envFiles to projects
  details: string;
  required?: boolean;
  defaultValue?: string;
  template?: string;
}

interface SetupStep {
  title: string;
  instructions: string;
  variables: EnvVariable[];
  additionalInstructions?: string[];
}

interface Project {
  id: string;
  envFile?: string;
  exportCommand?: string;
  importCommand?: string;
}

interface SetupConfig {
  introMessage: string;
  projects: Project[];
  steps: SetupStep[];
}

interface Values {
  convexUrl: string;
  convexSiteUrl: string;
}

function loadConfig(configPath: string): SetupConfig {
  console.log("Loading config from:", configPath);
  const configContent = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(configContent) as SetupConfig;
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

async function getExistingValue(
  projects: Project[],
  key: string,
): Promise<string | undefined> {
  for (const project of projects) {
    if (project.envFile) {
      const value = getEnvFileValue(project.envFile, key);
      if (value) return value;
    } else if (project.importCommand) {
      try {
        const value = execSync(project.importCommand.replace("{{name}}", key), {
          encoding: "utf-8",
        }).trim();
        if (value) return value;
      } catch (error) {
        console.error(`Failed to import value for ${key} from ${project.id}`);
      }
    }
  }
  return undefined;
}

function getEnvFileValue(envFile: string, key: string): string | undefined {
  try {
    const envContent = fs.readFileSync(envFile, "utf-8");
    const envConfig = dotenv.parse(envContent);
    return envConfig[key];
  } catch (error) {
    // File doesn't exist or can't be read
    return undefined;
  }
}

async function updateProjectValue(
  project: Project,
  key: string,
  value: string,
): Promise<void> {
  if (project.envFile) {
    updateEnvFile(project.envFile, key, value);
  } else if (project.exportCommand) {
    try {
      execSync(
        project.exportCommand
          .replace("{{name}}", key)
          .replace("{{value}}", value),
        { stdio: "inherit" },
      );
    } catch (error) {
      console.error(`Failed to export value for ${key} to ${project.id}`);
    }
  }
}

async function setupEnvironment(
  projectDir: string,
  values: Values,
  configPath: string,
): Promise<void> {
  const config = loadConfig(configPath);

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
      const existingValue = await getExistingValue(
        config.projects,
        variable.name,
      );
      let templateValue = "";
      if (variable.template) {
        templateValue = variable.template.replace(
          /{{(\w+)}}/g,
          (_, key) => values[key as keyof Values] || "",
        );
      }
      const defaultValue =
        existingValue || templateValue || variable.defaultValue;
      const requiredText = variable.required === false ? " (optional)" : "";
      const defaultValueText = defaultValue ? ` (${defaultValue})` : "";
      const answer = await inquirer.prompt([
        {
          type: "input",
          name: "value",
          message: `Enter ${chalk.bold(variable.name)}${requiredText}:`,
          default: defaultValue,
        },
      ]);

      const value = answer.value;

      if (value || variable.required !== false) {
        for (const projectId of variable.projects) {
          const project = config.projects.find((p) => p.id === projectId);
          if (project) {
            await updateProjectValue(project, variable.name, value);
          }
        }
        console.log(chalk.green(`✅ Set ${variable.name}`));
      } else {
        console.log(chalk.yellow(`⚠️ Skipped ${variable.name}`));
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

async function createNewProject(
  projectName: string,
  useDevConfig: boolean,
  devConfigPath?: string,
): Promise<void> {
  const projectDir = path.join(process.cwd(), projectName);
  const values: Values = {
    convexUrl: "",
    convexSiteUrl: "",
  };

  console.log(chalk.cyan(`\nCreating a new v1 project in ${projectDir}`));

  const tasks = [
    {
      title: "Creating project directory",
      task: () => fs.mkdirSync(projectDir, { recursive: true }),
    },
    {
      title: "Cloning v1 repository",
      task: () =>
        new Promise<void>((resolve, reject) => {
          exec(
            "git clone https://github.com/get-convex/v1.git .",
            { cwd: projectDir },
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
      title: "Retrieving Convex URL",
      task: async (spinner: Ora) => {
        spinner.stop();
        return new Promise<void>((resolve, reject) => {
          exec("npx convex function-spec", (error, stdout, stderr) => {
            if (error) {
              reject(
                new Error(`Failed to retrieve Convex URL: ${error.message}`),
              );
              return;
            }
            try {
              const functionSpec = JSON.parse(stdout);
              const convexUrl = functionSpec.url;
              if (!convexUrl) {
                reject(
                  new Error("Convex URL not found in function-spec output"),
                );
                return;
              }

              values.convexUrl = convexUrl;
              values.convexSiteUrl = convexUrl.replace(
                "convex.cloud",
                "convex.site",
              );

              console.log(
                chalk.green("\nConvex URLs have been retrieved and stored."),
              );
              resolve();
            } catch (parseError) {
              reject(
                new Error(
                  `Failed to parse function-spec output: ${(parseError as Error).message}`,
                ),
              );
            }
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
  let configPath: string;
  if (useDevConfig && devConfigPath) {
    configPath = devConfigPath;
  } else {
    configPath = path.join(projectDir, "setup-config.json");
  }

  if (!fs.existsSync(configPath)) {
    console.error(
      chalk.red(`Error: setup-config.json not found at ${configPath}`),
    );
    process.exit(1);
  }

  await setupEnvironment(projectDir, values, configPath);

  console.log(chalk.bold.green("\n🎉 Project setup complete!"));
  console.log(chalk.cyan("\nTo start your development server:"));
  console.log(chalk.white(`  cd ${projectName}`));
  console.log(chalk.white("  bun dev"));
}

async function main() {
  console.log(chalk.bold.cyan("\n🌟 Welcome to Create v1"));

  const currentFileUrl = import.meta.url;
  const currentFilePath = fileURLToPath(currentFileUrl);
  const currentDir = dirname(currentFilePath);

  program
    .name("create-v1")
    .description("Create a new v1 project or manage environment variables")
    .argument("[project-name]", "Name of the new project")
    .option("--dev", "Use development mode with local config")
    .action(
      async (projectName: string | undefined, options: { dev?: boolean }) => {
        const useDevConfig = options.dev ?? false;
        let devConfigPath: string | undefined;

        if (useDevConfig) {
          devConfigPath = path.join(process.cwd(), "setup-config.json");
          console.log(chalk.yellow("\n⚠️ Using development configuration"));
          console.log(chalk.yellow(`Config path: ${devConfigPath}`));

          if (!fs.existsSync(devConfigPath)) {
            console.error(
              chalk.red(
                `Error: setup-config.json not found at ${devConfigPath}`,
              ),
            );
            process.exit(1);
          }
        }

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
            await createNewProject(projectName, useDevConfig, devConfigPath);
          } else {
            // Manage environment variables for an existing project
            const configPath = useDevConfig
              ? devConfigPath!
              : path.join(process.cwd(), "setup-config.json");

            if (!fs.existsSync(configPath)) {
              console.error(
                chalk.red(
                  `Error: setup-config.json not found at ${configPath}`,
                ),
              );
              process.exit(1);
            }

            await setupEnvironment(
              process.cwd(),
              {
                convexUrl: "",
                convexSiteUrl: "",
              },
              configPath,
            );
          }
        } else {
          // If a project name is provided, create a new project
          await createNewProject(projectName, useDevConfig, devConfigPath);
        }
      },
    );

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  console.error(chalk.red("\n❌ An error occurred during project setup:"));
  console.error(error);
  process.exit(1);
});

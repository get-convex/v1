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
  projects: string[];
  details: string;
  required?: boolean;
  defaultValue?: string;
  template?: string;
  info?: string[]; // Changed from alerts to info
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
  ignoreLogs?: string[]; // Add this line
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
  try {
    const configContent = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(configContent) as SetupConfig;

    if (!Array.isArray(config.projects)) {
      throw new Error("Config file is missing the 'projects' array");
    }

    return config;
  } catch (error) {
    console.error(
      chalk.red(`Error loading config file: ${(error as Error).message}`),
    );
    process.exit(1);
  }
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
  variable: EnvVariable,
  projectDir: string,
): Promise<string | undefined> {
  for (const projectId of variable.projects) {
    const project = projects.find((p) => p.id === projectId);
    if (!project) continue;

    if (project.envFile) {
      const envFilePath = path.join(projectDir, project.envFile);
      const value = getEnvFileValue(envFilePath, variable.name);
      if (value) return value;
    } else if (project.importCommand) {
      try {
        const convexDir = path.join(projectDir, "packages", "backend");
        const value = execSync(
          project.importCommand.replace("{{name}}", variable.name),
          {
            encoding: "utf-8",
            cwd: convexDir,
          },
        ).trim();

        if (value) return value;
      } catch (error) {
        console.error(chalk.red(`Error: ${(error as Error).message}`));
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
  projectDir: string,
): Promise<string | undefined> {
  if (project.envFile) {
    const envFilePath = path.join(projectDir, project.envFile);
    const relativePath = path.relative(process.cwd(), envFilePath);
    updateEnvFile(envFilePath, key, value);
    return relativePath;
  }
  if (project.exportCommand) {
    try {
      const convexDir = path.join(projectDir, "packages", "backend");
      execSync(
        project.exportCommand
          .replace("{{name}}", key)
          .replace("{{value}}", value),
        { stdio: "inherit", cwd: convexDir },
      );
    } catch (error) {
      console.error(`Failed to export value for ${key} to ${project.id}`);
      console.error(`Error: ${(error as Error).message}`);
    }
  }
  return undefined;
}

async function getConvexUrls(projectDir: string): Promise<{
  convexUrl: string;
  convexSiteUrl: string;
}> {
  const convexDir = path.join(projectDir, "packages", "backend");

  if (!fs.existsSync(convexDir)) {
    console.error(
      chalk.red(
        `Error: 'packages/backend' directory not found in ${projectDir}`,
      ),
    );
    return { convexUrl: "", convexSiteUrl: "" };
  }

  try {
    console.log(chalk.dim("Executing 'npx convex function-spec'..."));
    const stdout = execSync("npx convex function-spec", {
      encoding: "utf-8",
      cwd: convexDir,
    }).trim();
    console.log(chalk.dim("Raw output from convex function-spec:"));
    console.log(chalk.dim(stdout));

    // Use a regular expression to extract the URL
    const urlMatch = stdout.match(/"url"\s*:\s*"(https:\/\/[^"]+)"/);
    if (!urlMatch) {
      throw new Error("Convex URL not found in function-spec output");
    }

    const convexUrl = urlMatch[1]!;
    const convexSiteUrl = convexUrl.replace("convex.cloud", "convex.site");
    console.log(chalk.green("Successfully retrieved Convex URLs:"));
    console.log(chalk.green(`  convexUrl: ${convexUrl}`));
    console.log(chalk.green(`  convexSiteUrl: ${convexSiteUrl}`));
    return { convexUrl, convexSiteUrl };
  } catch (error) {
    console.error(
      chalk.red(`Failed to retrieve Convex URLs: ${(error as Error).message}`),
    );
    return { convexUrl: "", convexSiteUrl: "" };
  }
}

// Add this utility function
function shouldIgnoreLog(message: string, ignoreLogs: string[] = []): boolean {
  return ignoreLogs.some((prefix) => message.startsWith(prefix));
}

async function setupEnvironment(
  projectDir: string,
  values: Values,
  configPath: string,
): Promise<void> {
  const config = loadConfig(configPath);

  // Create a custom console logger
  const customConsole = {
    log: (message: string) => {
      if (
        !config.projects.some((p) => shouldIgnoreLog(message, p.ignoreLogs))
      ) {
        console.log(message);
      }
    },
    error: (message: string) => {
      if (
        !config.projects.some((p) => shouldIgnoreLog(message, p.ignoreLogs))
      ) {
        console.error(message);
      }
    },
  };

  // Rest of the function remains the same, but use customConsole instead of console
  customConsole.log(
    chalk.bold.cyan("\n🚀 Welcome to the v1 Environment Setup Wizard"),
  );
  customConsole.log(chalk.dim(config.introMessage));
  customConsole.log(chalk.dim("Press Ctrl+C at any time to exit\n"));

  // If convexUrl or convexSiteUrl are not set, try to retrieve them
  if (!values.convexUrl || !values.convexSiteUrl) {
    const { convexUrl, convexSiteUrl } = await getConvexUrls(projectDir);
    values.convexUrl = convexUrl;
    values.convexSiteUrl = convexSiteUrl;
  }

  for (const [index, step] of config.steps.entries()) {
    customConsole.log(chalk.bold.blue(`\n📍 Step ${index + 1}: ${step.title}`));
    customConsole.log(chalk.white(step.instructions));

    if (step.additionalInstructions) {
      customConsole.log(chalk.yellow("\nℹ️  Additional Instructions:"));
      for (const instruction of step.additionalInstructions) {
        customConsole.log(chalk.yellow(`  • ${instruction}`));
      }
      customConsole.log("");
    }

    for (const variable of step.variables) {
      customConsole.log(chalk.cyan(`\n${variable.details}`));

      if (variable.info) {
        for (const infoItem of variable.info) {
          const processedInfo = infoItem.replace(
            /\{\{(\w+)\}\}/g,
            (_, key) => values[key as keyof Values] || `[${key} not set]`,
          );
          customConsole.log(
            boxen(chalk.blue(processedInfo), {
              padding: 0.5,
              margin: 0.5,
              borderColor: "blue",
              borderStyle: "round",
              title: "ℹ️  Info",
              titleAlignment: "center",
            }),
          );
        }
      }

      const existingValue = await getExistingValue(
        config.projects,
        variable,
        projectDir,
      );
      const defaultValue =
        existingValue ||
        (variable.template
          ? variable.template.replace(
              /\{\{(\w+)\}\}/g,
              (_, key) => values[key as keyof Values] || "",
            )
          : variable.defaultValue);
      const requiredText = variable.required === false ? " (optional)" : "";
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
        const updatedFiles: string[] = [];
        for (const projectId of variable.projects) {
          const project = config.projects.find((p) => p.id === projectId);
          if (project) {
            const updatedFile = await updateProjectValue(
              project,
              variable.name,
              value,
              projectDir,
            );
            if (updatedFile) {
              updatedFiles.push(updatedFile);
            }
          }
        }
        if (updatedFiles.length > 0) {
          customConsole.log(chalk.green(`✅ Set ${variable.name} in:`));
          for (const file of updatedFiles) {
            customConsole.log(chalk.green(`   - ${file}`));
          }
        } else {
          customConsole.log(chalk.green(`✅ Set ${variable.name}`));
        }
      } else {
        customConsole.log(chalk.yellow(`⚠️ Skipped ${variable.name}`));
      }
    }

    customConsole.log(chalk.green("✅ Step completed"));
  }

  customConsole.log(
    chalk.bold.green(
      "\n🎉 Setup complete! Environment variables have been updated.",
    ),
  );
}

async function promptToContinue(message: string): Promise<void> {
  await inquirer.prompt([
    {
      type: "input",
      name: "continue",
      message: `${message}\nPress Enter to continue...`,
    },
  ]);
}

async function createNewProject(
  projectName: string,
  useDevConfig: boolean,
  devConfigPath?: string,
  projectPath?: string,
): Promise<void> {
  const projectDir = projectPath || path.resolve(process.cwd(), projectName);
  const convexDir = path.join(projectDir, "packages", "backend");
  const values: Values = {
    convexUrl: "",
    convexSiteUrl: "",
  };
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
          exec(
            "bun install",
            { cwd: projectDir },
            (error: ExecException | null) => {
              if (error) reject(error);
              else resolve();
            },
          );
        }),
    },
    {
      title: "Initializing git repository",
      task: () =>
        new Promise<void>((resolve, reject) => {
          exec(
            'git init && git add . && git commit -m "Initial commit"',
            { cwd: projectDir },
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
        spinner.stop();
        await promptToContinue(
          "You'll now be guided through the Convex project setup process. This will create a new Convex project or link to an existing one.",
        );

        return new Promise<void>((resolve, reject) => {
          const child = spawn("npm", ["run", "setup"], {
            stdio: ["inherit", "pipe", "pipe"],
            shell: true,
            cwd: convexDir,
          });

          let output = "";

          child.stdout?.on("data", (data) => {
            output += data.toString();
            process.stdout.write(data);
          });

          child.stderr?.on("data", (data) => {
            output += data.toString();
            process.stderr.write(data);

            if (
              data
                .toString()
                .includes("✖ Error: Unable to push deployment config")
            ) {
              console.log(
                chalk.yellow(
                  "\nDetected expected error. Stopping Convex setup...",
                ),
              );
              child.kill();
              resolve();
            }
          });

          child.on("exit", (code) => {
            if (code === 0 || code === null) {
              resolve();
            } else {
              console.log(
                chalk.yellow(
                  "\nNote: The Convex setup process exited as expected. This is normal at this stage due to missing environment variables.",
                ),
              );
              resolve();
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
          exec(
            "npx convex function-spec",
            { cwd: convexDir },
            (error, stdout, stderr) => {
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
                    `Failed to parse function-spec output: ${
                      (parseError as Error).message
                    }`,
                  ),
                );
              }
            },
          );
        });
      },
    },
    {
      title: "Setting up authentication",
      task: async (spinner: Ora) => {
        spinner.stop();
        await promptToContinue(
          "You'll now be guided through the authentication setup process. This will configure authentication for your Convex project.",
        );

        return new Promise<void>((resolve, reject) => {
          const child = spawn("npx", ["@convex-dev/auth", "--skip-git-check"], {
            stdio: "inherit",
            shell: true,
            cwd: convexDir,
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
    {
      title: "Setting up environment variables",
      task: async (spinner: Ora) => {
        spinner.stop();
        const configPath =
          useDevConfig && devConfigPath
            ? devConfigPath
            : path.join(projectDir, "setup-config.json");

        if (!fs.existsSync(configPath)) {
          throw new Error(`setup-config.json not found at ${configPath}`);
        }

        await setupEnvironment(projectDir, values, configPath);
      },
    },
    {
      title: "Seeding the database",
      task: async () => {
        return new Promise<void>((resolve, reject) => {
          exec("npm run seed", { cwd: convexDir }, (error) => {
            if (error) {
              reject(
                new Error(`Failed to seed the database: ${error.message}`),
              );
            } else {
              resolve();
            }
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

  console.log(chalk.bold.green("\n🎉 Project setup complete!"));
  console.log(chalk.cyan("\nTo start your development server:"));
  console.log(chalk.white(`  cd ${path.relative(process.cwd(), projectDir)}`));
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
    .argument("[project-directory]", "Directory for the project")
    .option("--dev", "Use development mode with local config")
    .action(
      async (
        projectDirectory: string | undefined,
        options: { dev?: boolean },
      ) => {
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
          let projectName: string;
          let projectPath: string;

          if (projectDirectory) {
            projectPath = path.resolve(process.cwd(), projectDirectory);
            projectName = path.basename(projectPath);
          } else {
            const { inputProjectName } = await inquirer.prompt<{
              inputProjectName: string;
            }>([
              {
                type: "input",
                name: "inputProjectName",
                message: "What is your project named?",
                default: "my-v1-project",
              },
            ]);
            projectName = inputProjectName;
            projectPath = path.resolve(process.cwd(), projectName);
          }

          await createNewProject(
            projectName,
            useDevConfig,
            devConfigPath,
            projectPath,
          );
        } else {
          // Manage environment variables for an existing project
          const projectDir = projectDirectory
            ? path.resolve(process.cwd(), projectDirectory)
            : process.cwd();

          const configPath = useDevConfig
            ? devConfigPath!
            : path.join(projectDir, "setup-config.json");

          if (!fs.existsSync(configPath)) {
            console.error(
              chalk.red(`Error: setup-config.json not found at ${configPath}`),
            );
            process.exit(1);
          }

          const { convexUrl, convexSiteUrl } = await getConvexUrls(projectDir);
          if (!convexUrl || !convexSiteUrl) {
            console.log(
              chalk.yellow(
                "\nWarning: Failed to retrieve Convex URLs automatically.",
              ),
            );
            console.log(
              chalk.yellow(
                "You may need to enter them manually during the setup process.",
              ),
            );
          }
          await setupEnvironment(
            projectDir,
            { convexUrl, convexSiteUrl },
            configPath,
          );
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

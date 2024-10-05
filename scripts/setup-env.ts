import { promises as fs } from "node:fs";
import path from "node:path";
import readline from "node:readline";
import chalk from "chalk";
import dotenv from "dotenv";
import ora from "ora";

interface EnvVariable {
  name: string;
  envFiles: string[];
}

interface SetupStep {
  title: string;
  instructions: string;
  variables: EnvVariable[];
}

interface SetupConfig {
  introMessage: string;
  steps: SetupStep[];
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(chalk.cyan(query), resolve));
}

async function loadConfig(): Promise<SetupConfig> {
  const spinner = ora("Loading configuration...").start();
  const configPath = path.join(process.cwd(), "setup-config.json");
  try {
    const configContent = await fs.readFile(configPath, "utf-8");
    spinner.succeed("Configuration loaded");
    return JSON.parse(configContent) as SetupConfig;
  } catch (error) {
    spinner.fail("Failed to load configuration");
    throw error;
  }
}

async function updateEnvFile(
  filePath: string,
  key: string,
  value: string,
): Promise<void> {
  const spinner = ora(`Updating ${filePath}...`).start();
  try {
    let envContent = "";
    try {
      envContent = await fs.readFile(filePath, "utf-8");
    } catch (error) {
      // File doesn't exist, we'll create it
    }

    const envConfig = dotenv.parse(envContent);
    envConfig[key] = value;

    const updatedEnvContent = Object.entries(envConfig)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    await fs.writeFile(filePath, updatedEnvContent);
    spinner.succeed(`Updated ${filePath}`);
  } catch (error) {
    spinner.fail(`Failed to update ${filePath}`);
    throw error;
  }
}

async function runSetup(): Promise<void> {
  console.clear();
  console.log(chalk.bold.green("Welcome to the Create v1 Setup Wizard\n"));

  const config = await loadConfig();

  console.log(chalk.yellow(config.introMessage));
  console.log(chalk.dim("Press Ctrl+C at any time to exit\n"));

  for (const [index, step] of config.steps.entries()) {
    console.log(chalk.bold.blue(`\nStep ${index + 1}: ${step.title}`));
    console.log(chalk.italic(step.instructions));

    for (const variable of step.variables) {
      const value = await question(`Enter ${chalk.bold(variable.name)}: `);
      for (const envFile of variable.envFiles) {
        await updateEnvFile(envFile, variable.name, value);
      }
    }

    console.log(chalk.green("✔ Step completed"));
  }

  console.log(
    chalk.bold.green(
      "\nSetup complete! Environment variables have been updated.",
    ),
  );
  console.log(chalk.yellow("You can now start your development server."));
  rl.close();
}

runSetup().catch((error) => {
  console.error(chalk.red("An error occurred during setup:"));
  console.error(error);
  process.exit(1);
});

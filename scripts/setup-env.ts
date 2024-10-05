import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import chalk from "chalk";
import dotenv from "dotenv";

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

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(chalk.cyan(query), (answer) => {
      resolve(answer);
    });
  });
}

function loadConfig(): SetupConfig {
  const configPath = path.join(process.cwd(), "setup-config.json");
  const configContent = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(configContent) as SetupConfig;
}

function updateEnvFile(filePath: string, key: string, value: string): void {
  let envContent = "";
  envContent = fs.readFileSync(filePath, "utf-8");

  const envConfig = dotenv.parse(envContent);
  envConfig[key] = value;

  const updatedEnvContent = Object.entries(envConfig)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  fs.writeFileSync(filePath, updatedEnvContent);
}

async function runSetup(): Promise<void> {
  console.clear();
  console.log(chalk.bold.green("Welcome to the Create v1 Setup Wizard\n"));

  const config = loadConfig();

  console.log(chalk.yellow(config.introMessage));
  console.log(chalk.dim("Press Ctrl+C at any time to exit\n"));

  for (const [index, step] of config.steps.entries()) {
    console.log(chalk.bold.blue(`\nStep ${index + 1}: ${step.title}`));
    console.log(chalk.italic(step.instructions));

    for (const variable of step.variables) {
      const value = await question(`Enter ${chalk.bold(variable.name)}: `);
      for (const envFile of variable.envFiles) {
        updateEnvFile(envFile, variable.name, value);
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
}

runSetup()
  .then(() => {
    rl.close();
    process.exit(0);
  })
  .catch((error) => {
    console.error(chalk.red("An error occurred during setup:"));
    console.error(error);
    rl.close();
    process.exit(1);
  });

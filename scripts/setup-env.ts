import { promises as fs } from "fs";
import path from "path";
import readline from "readline";
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

async function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function loadConfig(): Promise<SetupConfig> {
  const configPath = path.join(process.cwd(), "setup-config.json");
  const configContent = await fs.readFile(configPath, "utf-8");
  return JSON.parse(configContent) as SetupConfig;
}

async function updateEnvFile(
  filePath: string,
  key: string,
  value: string,
): Promise<void> {
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
}

async function runSetup(): Promise<void> {
  const config = await loadConfig();

  console.log(config.introMessage);

  for (const step of config.steps) {
    console.log(`\n${step.title}`);
    console.log(step.instructions);

    for (const variable of step.variables) {
      const value = await question(`Enter ${variable.name}: `);
      for (const envFile of variable.envFiles) {
        await updateEnvFile(envFile, variable.name, value);
      }
    }
  }

  console.log("\nSetup complete! Environment variables have been updated.");
  rl.close();
}

runSetup().catch(console.error);

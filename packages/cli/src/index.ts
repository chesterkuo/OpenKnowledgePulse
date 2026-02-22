#!/usr/bin/env bun
import { Command } from "commander";
import { authCommand } from "./commands/auth.js";
import { contributeCommand } from "./commands/contribute.js";
import { installCommand } from "./commands/install.js";
import { searchCommand } from "./commands/search.js";
import { securityCommand } from "./commands/security.js";
import { validateCommand } from "./commands/validate.js";

const program = new Command();

program
  .name("kp")
  .description("KnowledgePulse CLI — Search, install, and contribute knowledge")
  .version("0.1.0");

program.addCommand(searchCommand);
program.addCommand(installCommand);
program.addCommand(validateCommand);
program.addCommand(contributeCommand);
program.addCommand(authCommand);
program.addCommand(securityCommand);

program.parse();

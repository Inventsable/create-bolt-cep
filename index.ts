#!/usr/bin/env node

import * as fs from "fs-extra";
import * as path from "path";
import * as c from "colors/safe";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
const argv = yargs(hideBin(process.argv)).argv;

const frameworks = [
  { name: "react", pretty: "React" },
  { name: "vue", pretty: "Vue" },
  { name: "svelte", pretty: "Svelte" },
];

const slugify = (...args: string[]): string => {
  const value = args.join(" ");
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, "-");
};

const div = () =>
  console.info(c.grey("--------------------------------------------------"));
const space = () => console.info("");

const replaceInFile = (
  fullPath: string,
  items: [findStr: string | RegExp, replaceStr: string][]
) => {
  const fileIn = fs.readFileSync(fullPath, { encoding: "utf-8" });
  fs.unlinkSync(fullPath);
  let fileOut = fileIn;
  items.map((item) => {
    fileOut = fileOut.replace(item[0], item[1]);
  });
  fs.writeFileSync(fullPath, fileOut, { encoding: "utf-8" });
};

const init = async () => {
  space();
  console.log(c.green("Create Bolt: CEP"));
  console.log(c.cyan("by Hyper Brew | https://hyperbrew.co"));
  space();
  div();
  space();
  const dir = process.cwd();
  //@ts-ignore
  const templateStr = argv["template"];
  //@ts-ignore
  const name = argv["_"].pop();

  const template = frameworks.find((f) => f.name === templateStr);

  if (template && name?.length > 0) {
    const dest = path.join(dir, name);
    let localBolt = path.join(__dirname, "node_modules", "bolt-cep");
    let globalBolt = path.join(__dirname, "..", "bolt-cep");
    let bolt = fs.existsSync(localBolt) ? localBolt : globalBolt;
    const isSymlink = fs.lstatSync(bolt).isSymbolicLink();
    bolt = isSymlink ? fs.realpathSync(bolt) : bolt;
    fs.mkdirSync(dest);

    // Get Unused Packages
    const unused = frameworks
      .filter((item) => item.name !== template.name)
      .map((i) => i.name);

    let ignoreItems = [
      ".git",
      "node_modules",
      "dist",
      "cep.config.debug.ts",
      "tsconfig.json",
      "vite.config.ts",
      "package.json",
    ];

    unused.map((item) => {
      ignoreItems.push(`vite.config.${item}.ts`);
      ignoreItems.push(`package.${item}.json`);
      ignoreItems.push(`tsconfig.${item}.json`);
    });

    fs.readdirSync(bolt).map((item) => {
      if (!ignoreItems.includes(item)) {
        const srcItem = path.join(bolt, item);
        if (item === `vite.config.${template.name}.ts`) {
          fs.copySync(srcItem, path.join(dest, `vite.config.ts`));
        } else if (item === `package.${template.name}.json`) {
          fs.copySync(srcItem, path.join(dest, `package.json`));
        } else if (item === `tsconfig.${template.name}.json`) {
          fs.copySync(srcItem, path.join(dest, `tsconfig.json`));
        } else {
          fs.copySync(srcItem, path.join(dest, item));
        }
      }
    });
    const jsFolder = path.join(dest, "src", "js");

    // Remove Placeholder
    const tempMain = path.join(jsFolder, "main");
    if (fs.existsSync(tempMain)) {
      fs.rmSync(tempMain, { recursive: true });
    } else {
      console.error("TEMP MAIN doesn't exist");
    }

    // Move Template
    const templateFolder = path.join(jsFolder, `template-${template.name}`);
    const newName = path.join(jsFolder, `main`);
    if (fs.existsSync(templateFolder)) {
      fs.renameSync(templateFolder, newName);
    }

    // Delete Extra Templates
    fs.readdirSync(jsFolder).map((extraTemplate) => {
      if (extraTemplate.indexOf("template-") === 0) {
        fs.rmSync(path.join(jsFolder, extraTemplate), { recursive: true });
      }
    });

    // Remove Debug Lines from config
    replaceInFile(path.join(dest, "cep.config.ts"), [
      [/.*(\/\/ BOLT-CEP-DEBUG-ONLY).*/g, ""],
      // Replace default "Bolt CEP" entries with user-provided extension name
      [/(?<=displayName:\s\")[^\"]*(?=\")/gim, name],
      [/(?<=panelDisplayName:\s\")[^\"]*(?=\")/gim, name],
      [/(?<=id:\s\"com\.)[^\"]*(?=\.cep\")/gim, slugify(name)],
    ]);

    // Add .gitignore
    fs.writeFileSync(
      path.join(dest, ".gitignore"),
      ["node_modules", "dist", ".DS_Store"].join("\r"),
      { encoding: "utf-8" }
    );

    div();
    console.log(
      c.cyan(`New Bolt CEP generated with ${template.pretty}`),
      c.green(name)
    );
    div();
    console.log(c.cyan(`Path :: ${dest}`));
    div();
    div();
  } else {
    console.error(c.red("Incorrect Command"));
    space();
    console.info(c.cyan("EXAMPLES:"));
    div();
    console.info(
      c.cyan(`(e.g. "yarn create bolt-cep my-app --template react")`)
    );
    console.info(
      c.cyan(`(e.g. "yarn create bolt-cep my-cool-app --template vue")`)
    );
    div();
  }
};

init();

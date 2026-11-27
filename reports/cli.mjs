import { parseArgs } from "node:util";
import {
  catalog,
  readJson,
  sampleFile,
  selectDefinition,
  validateSnapshot,
} from "./catalog.mjs";
import { writeGallery } from "./gallery.mjs";
import { buildReport } from "./model.mjs";
import { captureGitHub } from "./sources/github.mjs";
import { writerFor } from "./writers/index.mjs";

const usage = `Usage: node reports/cli.mjs <command>

  list                                      List bundled definitions
  gallery [--input SNAPSHOT.json]           Create a browsable local directory
  render ID|FILE.json [--input SNAPSHOT.json | --github OWNER/REPO]
                                            Write the selected document to stdout
  capture OWNER/REPO [--days N]             Write a public GitHub snapshot to stdout

The default input is the bundled synthetic rollout. Coverage defaults to seven days for capture.`;
const string = { type: "string" };

async function main([command, ...args]) {
  if (!command || command === "--help") return console.log(usage);
  const options = {
    list: {},
    gallery: { input: string },
    render: { input: string, github: string },
    capture: { days: string },
  };
  if (!Object.hasOwn(options, command)) throw new Error(usage);
  const { values, positionals } = parseArgs({
    args,
    options: options[command],
    allowPositionals: true,
  });
  const required = command === "capture" || command === "render" ? 1 : 0;
  if (positionals.length !== required) throw new Error(usage);
  const [name] = positionals;
  if (command === "list") {
    console.log("ID\tLANGUAGE\tREADER\tFORMAT\tTITLE");
    for (const { id, definition: r } of catalog())
      console.log([id, r.language, r.reader, r.format, r.title].join("\t"));
    return;
  }
  if (command === "capture") {
    const days = Number(values.days ?? 7);
    if (!Number.isInteger(days) || days < 1 || days > 90)
      throw new Error("--days must be an integer from 1 to 90.");
    console.log(
      JSON.stringify(
        validateSnapshot(await captureGitHub(name, days)),
        null,
        2,
      ),
    );
    return;
  }
  if (command === "gallery") {
    console.log(
      writeGallery(
        catalog(),
        validateSnapshot(readJson(values.input ?? sampleFile)),
      ),
    );
    return;
  }
  if (values.github !== undefined && values.input !== undefined)
    throw new Error("Choose one input source.");
  const definition = selectDefinition(name);
  const snapshot =
    values.github === undefined
      ? readJson(values.input ?? sampleFile)
      : await captureGitHub(values.github, definition.periodDays);
  const model = buildReport(definition, validateSnapshot(snapshot));
  process.stdout.write(writerFor(definition.format).render(model));
}

try {
  await main(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { compile, optimize } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";

const frontendDir = import.meta.dir;
const backendPublicDir = join(frontendDir, "..", "backend", "public");
const assetsDir = join(backendPublicDir, "assets");
const srcDir = join(frontendDir, "src");
const mainEntry = join(srcDir, "main.tsx");
const stylesEntry = join(srcDir, "styles.css");

async function run(command: string, args: string[]) {
  const proc = Bun.spawn([command, ...args], {
    cwd: frontendDir,
    stdout: "inherit",
    stderr: "inherit"
  });
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${code}`);
  }
}

async function buildCss() {
  const css = await readFile(stylesEntry, "utf8");
  const compiler = await compile(css, {
    base: dirname(stylesEntry),
    from: stylesEntry,
    shouldRewriteUrls: true,
    onDependency: () => {}
  });
  const sources = (
    compiler.root === "none"
      ? []
      : compiler.root === null
        ? [{ base: frontendDir, pattern: "**/*", negated: false }]
        : [{ ...compiler.root, negated: false }]
  ).concat(compiler.sources);
  const scanner = new Scanner({ sources });
  const cssOutput = compiler.build(scanner.scan());
  const optimized = optimize(cssOutput, { file: stylesEntry, minify: true }).code;
  await writeFile(join(assetsDir, "app.css"), optimized);
}

async function buildJs() {
  const result = await Bun.build({
    entrypoints: [mainEntry],
    outdir: assetsDir,
    target: "browser",
    format: "esm",
    splitting: true,
    minify: true,
    sourcemap: "none",
    define: {
      "process.env.NODE_ENV": JSON.stringify("production")
    },
    plugins: [
      {
        name: "src-alias",
        setup(build) {
          const resolveAlias = (specifier: string) => {
            const basePath = join(srcDir, specifier.slice(2));
            for (const ext of ["", ".tsx", ".ts", ".jsx", ".js"]) {
              const candidate = `${basePath}${ext}`;
              if (existsSync(candidate)) {
                return candidate;
              }
            }
            return basePath;
          };

          build.onResolve({ filter: /^@\// }, ({ path }) => ({
            path: resolveAlias(path)
          }));
        }
      }
    ]
  });

  if (!result.success) {
    for (const log of result.logs) {
      console.error(log.message);
    }
    throw new Error("Bun.build failed");
  }
}

async function buildHtml() {
  const template = await readFile(join(frontendDir, "index.html"), "utf8");
  const cacheBuster = Date.now().toString(36);
  const html = template
    .replace(
      '<link rel="stylesheet" href="/src/styles.css" />',
      `<link rel="stylesheet" href="/assets/app.css?v=${cacheBuster}" />`
    )
    .replace(
      '<script type="module" src="/src/main.tsx"></script>',
      `<script type="module" src="/assets/main.js?v=${cacheBuster}"></script>`
    );
  await writeFile(join(backendPublicDir, "index.html"), html);
}

await rm(backendPublicDir, { recursive: true, force: true });
await mkdir(assetsDir, { recursive: true });
await run("bunx", ["tsc", "--noEmit"]);
await buildJs();
await buildCss();
await buildHtml();

console.log(`Frontend build written to ${backendPublicDir}`);

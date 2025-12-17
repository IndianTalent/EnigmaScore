import * as fs from "fs";
import * as path from "path";

const line = "\n===================================================================\n";

const errors = [];

function checkFile(filePath, patterns, errorMsg) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  
  const content = fs.readFileSync(filePath, "utf-8");
  
  for (const pattern of patterns) {
    if (content.includes(pattern)) {
      errors.push(`${errorMsg}: ${filePath} contains "${pattern}"`);
    }
  }
}

function checkDirectory(dirPath, patterns, errorMsg) {
  if (!fs.existsSync(dirPath)) {
    return;
  }
  
  const files = fs.readdirSync(dirPath, { recursive: true });
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isFile()) {
      checkFile(filePath, patterns, errorMsg);
    }
  }
}

function checkDynamicRoutes() {
  const appDir = path.resolve("./app");
  if (!fs.existsSync(appDir)) {
    return;
  }
  
  const files = fs.readdirSync(appDir, { recursive: true });
  
  for (const file of files) {
    if (file.includes("[") && file.includes("]")) {
      const dirPath = path.dirname(path.join(appDir, file));
      const dirName = path.basename(dirPath);
      
      if (dirName.includes("[") && !dirName.includes("generateStaticParams")) {
        const hasGenerateStaticParams = files.some(f => 
          f.includes(dirName) && f.includes("generateStaticParams")
        );
        
        if (!hasGenerateStaticParams) {
          errors.push(`Dynamic route ${dirPath} must have generateStaticParams`);
        }
      }
    }
  }
}

console.log("Checking static export compliance...\n");

checkDirectory("./app", [
  "getServerSideProps",
  "getStaticProps",
  "server-only",
  "next/headers",
  "cookies()",
  "dynamic = 'force-dynamic'",
], "SSR/ISR/Edge features detected");

checkDirectory("./app", [
  "route.ts",
  "route.js",
], "API Route detected");

checkFile("./next.config.ts", [
  "output: 'export'",
], "Static export not configured");

checkDynamicRoutes();

if (errors.length > 0) {
  console.error(line);
  console.error("Static export check FAILED:\n");
  errors.forEach((error, index) => {
    console.error(`${index + 1}. ${error}`);
  });
  console.error(line);
  process.exit(1);
} else {
  console.log("✅ Static export check passed!");
}


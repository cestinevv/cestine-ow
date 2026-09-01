import * as fs from 'fs';
import * as path from 'path';

const GENERATED_DIR = path.join(
  process.cwd(),
  'src/solana/generated/story/src/generated'
);

const STORY_ABI_PATH = path.join(process.cwd(), 'src/abis/Story.json');

function readStoryProgramAddress(): string {
  if (!fs.existsSync(STORY_ABI_PATH)) {
    console.error(`[Patch] Story ABI not found: ${STORY_ABI_PATH}`);
    process.exit(1);
  }

  const abi = JSON.parse(fs.readFileSync(STORY_ABI_PATH, 'utf-8')) as {
    address?: string;
  };
  const address = abi.address?.trim();

  if (!address) {
    console.error(`[Patch] Missing "address" in ${STORY_ABI_PATH}`);
    process.exit(1);
  }

  return address;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function walkDir(dir: string, callback: (filePath: string) => void) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

function main() {
  if (!fs.existsSync(GENERATED_DIR)) {
    console.error(`[Patch] Target directory not found: ${GENERATED_DIR}`);
    process.exit(1);
  }

  const programAddress = readStoryProgramAddress();
  const programAddressPattern = escapeRegExp(programAddress);
  console.log(`[Patch] Program address from Story ABI: ${programAddress}`);

  walkDir(GENERATED_DIR, (filePath) => {
    if (!filePath.endsWith('.ts')) return;

    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;

    // 1. Patch STORY_PROGRAM_ADDRESS definition in programs/story.ts
    const programDefRegex = new RegExp(`export const STORY_PROGRAM_ADDRESS =[\\s\\S]*?as Address<[^>]+>;`);
    const programDefReplacement = `export const STORY_PROGRAM_ADDRESS = import.meta.env.VITE_STORY_PROGRAM_ID as Address;`;

    if (programDefRegex.test(content)) {
      content = content.replace(programDefRegex, programDefReplacement);
      modified = true;
    }

    // 2. Patch PDA default programAddress
    const pdaRegex = new RegExp(
      `programAddress = "${programAddressPattern}" as Address<"${programAddressPattern}">`,
      'g',
    );
    if (pdaRegex.test(content)) {
      content = content.replace(
        pdaRegex,
        `programAddress = STORY_PROGRAM_ADDRESS`
      );
      modified = true;
    }

    const typeRegex = new RegExp(
      `TProgram extends string = "${programAddressPattern}"`,
      'g',
    );
    if (typeRegex.test(content)) {
      content = content.replace(typeRegex, `TProgram extends string = string`);
      modified = true;
    }

    // 4. Any remaining hardcoded address in Address<...>
    const addressTypeRegex = new RegExp(
      `Address<"${programAddressPattern}">`,
      'g',
    );
    if (addressTypeRegex.test(content)) {
      content = content.replace(addressTypeRegex, `Address`);
      modified = true;
    }

    // 5. Catch-all for any other occurrences of the hardcoded address
    const catchAllRegex = new RegExp(`"${programAddressPattern}"`, 'g');
    if (catchAllRegex.test(content)) {
      content = content.replace(catchAllRegex, `STORY_PROGRAM_ADDRESS`);
      modified = true;
    }

    // If we added STORY_PROGRAM_ADDRESS, make sure it's imported
    if (modified && content.includes('STORY_PROGRAM_ADDRESS') && !content.includes('import { STORY_PROGRAM_ADDRESS }') && !filePath.includes('programs/story.ts')) {
      const importRegex = /import\s+.*?from\s+['"].*?['"];/gs;
      let match;
      let lastImportIndex = 0;
      while ((match = importRegex.exec(content)) !== null) {
        lastImportIndex = match.index + match[0].length;
      }
      
      let importPath = "../programs";
      if (filePath.includes('errors/story.ts')) {
          importPath = "../programs";
      }
      
      const importStmt = `\nimport { STORY_PROGRAM_ADDRESS } from "${importPath}";\n`;
      content = content.slice(0, lastImportIndex) + importStmt + content.slice(lastImportIndex);
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`[Patch] Successfully patched ${path.relative(process.cwd(), filePath)}`);
    }
  });
}

main();

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { exec as execCallback } from 'child_process';
import util from 'util';
import { readFile, writeFile } from './filesystem.js';

// Promisify exec
const exec = util.promisify(execCallback);

interface SearchReplace {
    search: string;
    replace: string;
}

/**
 * Smart file edit function that chooses the appropriate method
 * based on file size and content
 * 
 * @param filePath - Path to the file to edit
 * @param block - Search and replace content
 */
export async function performSearchReplace(filePath: string, block: SearchReplace): Promise<void> {
    try {
        // Get file stats to determine size
        const stats = await fs.stat(filePath);
        
        // For small files (< 1MB), use simple in-memory replace for better performance
        if (stats.size < 1_000_000) {
            await simpleInMemoryReplace(filePath, block);
        } else {
            // For larger files, use the Git-based approach
            try {
                await gitBasedReplace(filePath, block);
            } catch (gitError) {
                // Fallback to simple replace if Git approach fails
                console.warn(`Git-based replace failed, falling back to simple replace: ${gitError}`);
                await simpleInMemoryReplace(filePath, block);
            }
        }
    } catch (error) {
        throw new Error(`Failed to perform search/replace: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Simple in-memory search and replace for small files
 * 
 * @param filePath - Path to the file to edit
 * @param block - Search and replace content
 */
async function simpleInMemoryReplace(filePath: string, block: SearchReplace): Promise<void> {
    const content = await readFile(filePath);
    
    // Find first occurrence
    const searchIndex = content.indexOf(block.search);
    if (searchIndex === -1) {
        throw new Error(`Search content not found in ${filePath}`);
    }

    // Replace content
    const newContent = 
        content.substring(0, searchIndex) + 
        block.replace + 
        content.substring(searchIndex + block.search.length);

    // Only write if content actually changed
    if (newContent !== content) {
        await writeFile(filePath, newContent);
    }
}

/**
 * Git-based search and replace using diff/patch for large files
 * Leverages Git's efficient diffing and patching algorithms
 * 
 * @param filePath - Path to the file to edit
 * @param block - Search and replace content
 */
export async function gitBasedReplace(filePath: string, block: SearchReplace): Promise<void> {
    // Create a temporary directory for git operations
    const tempDir = path.join(os.tmpdir(), `git-edit-${Date.now()}`);
    const tempFilePath = path.join(tempDir, path.basename(filePath));
    
    try {
        // Create temp directory
        await fs.mkdir(tempDir, { recursive: true });
        
        // Copy the original file to temp directory
        await fs.copyFile(filePath, tempFilePath);
        
        // Initialize git repo in temp directory
        await exec(`cd ${tempDir} && git init && git config user.email "temp@example.com" && git config user.name "Temp User"`);
        
        // Add and commit the original file
        await exec(`cd ${tempDir} && git add ${path.basename(filePath)} && git commit -m "Original file"`);
        
        // Read the file content
        const content = await fs.readFile(tempFilePath, 'utf-8');
        
        // Find and replace content
        const searchIndex = content.indexOf(block.search);
        if (searchIndex === -1) {
            throw new Error(`Search content not found in ${filePath}`);
        }
        
        const newContent = 
            content.substring(0, searchIndex) + 
            block.replace + 
            content.substring(searchIndex + block.search.length);
        
        // Write the new content to the temp file
        await fs.writeFile(tempFilePath, newContent);
        
        // Create a patch using git diff
        const { stdout: patchContent } = await exec(`cd ${tempDir} && git diff`);
        
        // Save patch to a file
        const patchFile = path.join(tempDir, 'changes.patch');
        await fs.writeFile(patchFile, patchContent);
        
        try {
            // Apply the patch to the original file
            await exec(`cd ${path.dirname(filePath)} && git apply ${patchFile}`);
        } catch (applyError) {
            // Try with -3way merge if standard apply fails
            try {
                await exec(`cd ${path.dirname(filePath)} && git apply --3way ${patchFile}`);
            } catch (retryError) {
                throw new Error(`Failed to apply changes: ${retryError}`);
            }
        }
        
        return;
    } finally {
        // Clean up the temporary directory
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
            console.error(`Failed to clean up temp directory: ${error}`);
        }
    }
}

/**
 * Parses an edit block with a VERY SPECIFIC format. IMPORTANT: Follow this EXACTLY.
 * 
 * Format Requirements:
 * 1. FIRST LINE: Full absolute file path (NO ~ shortcut)
 * 2. NEXT LINE: Exactly '<<<<<<< SEARCH' (case-sensitive)
 * 3. NEXT LINES: Exact content to search for
 * 4. NEXT LINE: Exactly '=======' (case-sensitive)
 * 5. NEXT LINES: Exact replacement content
 * 6. LAST LINE: Exactly '>>>>>>> REPLACE' (case-sensitive)
 * 
 * Example:
 * /full/path/to/file.txt
 * <<<<<<< SEARCH
 * original text to replace
 * =======
 * new replacement text
 * >>>>>>> REPLACE
 * 
 * @param blockContent - Edit block content following EXACT format
 * @returns Object with file path and search/replace content
 * @throws Error if format is not precisely followed
 */
export async function parseEditBlock(blockContent: string): Promise<{
    filePath: string;
    searchReplace: SearchReplace;
}> {
    const lines = blockContent.split('\n');
    
    // First line should be the FULL absolute file path
    const filePath = lines[0].trim();
    
    // Find the markers - THESE MUST BE EXACT
    const searchStart = lines.indexOf('<<<<<<< SEARCH');
    const divider = lines.indexOf('=======');
    const replaceEnd = lines.indexOf('>>>>>>> REPLACE');
    
    if (searchStart === -1 || divider === -1 || replaceEnd === -1) {
        throw new Error('Invalid edit block format. REQUIRED: Exact "<<<<<<< SEARCH", "=======", and ">>>>>>> REPLACE" markers');
    }
    
    // Extract search and replace content
    const search = lines.slice(searchStart + 1, divider).join('\n');
    const replace = lines.slice(divider + 1, replaceEnd).join('\n');
    
    return {
        filePath,
        searchReplace: { search, replace }
    };
}
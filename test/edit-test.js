// test/edit-test.js
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { strict as assert } from 'assert';
import { gitBasedReplace, parseEditBlock, performSearchReplace } from '../dist/tools/edit.js';

// Helper to create temporary test files
async function createTempFile(content, filename = 'test-file.txt') {
    const tempDir = path.join(os.tmpdir(), `edit-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    const filePath = path.join(tempDir, filename);
    await fs.writeFile(filePath, content);
    
    return { filePath, tempDir };
}

// Helper to clean up temporary files
async function cleanupTempFile(tempDir) {
    try {
        await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
        console.error(`Failed to clean up: ${error}`);
    }
}

// Test parseEditBlock function
async function testParseEditBlock() {
    console.log('Testing parseEditBlock...');
    
    const blockContent = `test-file.txt
<<<<<<< SEARCH
original content
=======
new content
>>>>>>> REPLACE`;

    const result = await parseEditBlock(blockContent);
    
    assert.equal(result.filePath, 'test-file.txt', 'File path should match');
    assert.equal(result.searchReplace.search, 'original content', 'Search content should match');
    assert.equal(result.searchReplace.replace, 'new content', 'Replace content should match');
    
    console.log('✅ parseEditBlock test passed');
}

// Test simpleInMemoryReplace through performSearchReplace for small files
async function testSimpleReplace() {
    console.log('Testing simple in-memory replace...');
    
    const originalContent = 'This is a test file with original content that will be replaced.';
    const { filePath, tempDir } = await createTempFile(originalContent);
    
    try {
        await performSearchReplace(filePath, {
            search: 'original content',
            replace: 'new content'
        });
        
        const updatedContent = await fs.readFile(filePath, 'utf-8');
        const expectedContent = 'This is a test file with new content that will be replaced.';
        
        assert.equal(updatedContent, expectedContent, 'File content should be updated correctly');
        
        console.log('✅ Simple replace test passed');
    } finally {
        await cleanupTempFile(tempDir);
    }
}

// Test gitBasedReplace directly
async function testGitBasedReplace() {
    console.log('Testing Git-based replace...');
    
    // Create a large file (>1MB) to ensure the Git approach is used
    let largeContent = '';
    for (let i = 0; i < 100000; i++) {
        largeContent += `Line ${i}: This is test content that will be part of a large file.\n`;
    }
    
    // Insert some unique content that we can replace
    largeContent += 'THIS_IS_UNIQUE_CONTENT_TO_REPLACE\n';
    
    for (let i = 0; i < 100000; i++) {
        largeContent += `Line ${i}: More content after the unique section.\n`;
    }
    
    const { filePath, tempDir } = await createTempFile(largeContent, 'large-test-file.txt');
    
    try {
        // Directly test gitBasedReplace
        await gitBasedReplace(filePath, {
            search: 'THIS_IS_UNIQUE_CONTENT_TO_REPLACE',
            replace: 'THIS_HAS_BEEN_REPLACED_SUCCESSFULLY'
        });
        
        // Read file content
        const updatedContent = await fs.readFile(filePath, 'utf-8');
        
        // Assert the content was updated
        assert.ok(updatedContent.includes('THIS_HAS_BEEN_REPLACED_SUCCESSFULLY'), 
            'File should contain the replaced content');
        assert.ok(!updatedContent.includes('THIS_IS_UNIQUE_CONTENT_TO_REPLACE'), 
            'File should not contain the original content');
        
        console.log('✅ Git-based replace test passed');
    } finally {
        await cleanupTempFile(tempDir);
    }
}

// Test performSearchReplace with large file (should use Git-based approach)
async function testPerformSearchReplaceWithLargeFile() {
    console.log('Testing performSearchReplace with large file...');
    
    // Create a large file (>1MB) to ensure the Git approach is used
    let largeContent = '';
    for (let i = 0; i < 100000; i++) {
        largeContent += `Line ${i}: This is test content that will be part of a large file.\n`;
    }
    
    // Insert some unique content that we can replace
    largeContent += 'THIS_IS_UNIQUE_CONTENT_TO_REPLACE\n';
    
    for (let i = 0; i < 100000; i++) {
        largeContent += `Line ${i}: More content after the unique section.\n`;
    }
    
    const { filePath, tempDir } = await createTempFile(largeContent, 'large-test-file.txt');
    
    try {
        // Test performSearchReplace which should use the Git-based approach for large files
        await performSearchReplace(filePath, {
            search: 'THIS_IS_UNIQUE_CONTENT_TO_REPLACE',
            replace: 'THIS_HAS_BEEN_REPLACED_SUCCESSFULLY'
        });
        
        // Read file content
        const updatedContent = await fs.readFile(filePath, 'utf-8');
        
        // Assert the content was updated
        assert.ok(updatedContent.includes('THIS_HAS_BEEN_REPLACED_SUCCESSFULLY'), 
            'File should contain the replaced content');
        assert.ok(!updatedContent.includes('THIS_IS_UNIQUE_CONTENT_TO_REPLACE'), 
            'File should not contain the original content');
        
        console.log('✅ performSearchReplace with large file test passed');
    } finally {
        await cleanupTempFile(tempDir);
    }
}

// Run all tests
async function runTests() {
    try {
        await testParseEditBlock();
        await testSimpleReplace();
        await testGitBasedReplace();
        await testPerformSearchReplaceWithLargeFile();
        
        console.log('🎉 All tests passed!');
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

runTests();

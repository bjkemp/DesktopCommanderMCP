# Desktop Commander MCP - Project Planning

## Project Overview

Desktop Commander MCP is a server that allows the Claude desktop app to execute terminal commands and manage files on your computer through the Model Context Protocol (MCP). It extends the MCP Filesystem Server to provide additional search and replace file editing capabilities, enabling Claude to work with your local development environment effectively.

## Architecture

The project follows a modular architecture with clear separation of concerns:

### Core Components

1. **Server** (`src/server.ts`): The main MCP server implementation that registers tools and handles requests.
2. **Terminal Manager** (`src/terminal-manager.ts`): Manages terminal sessions, command execution, and process monitoring.
3. **Command Manager** (`src/command-manager.ts`): Handles command validation, execution, and blocking of restricted commands.
4. **Custom StdIO** (`src/custom-stdio.ts`): Provides custom stdio transport for handling non-JSON messages.

### Tools (in `src/tools/`)

1. **Execute** (`src/tools/execute.ts`): Tools for executing terminal commands and managing sessions.
2. **Process** (`src/tools/process.ts`): Tools for process management (listing, terminating).
3. **Filesystem** (`src/tools/filesystem.ts`): Tools for file system operations (read, write, create directories).
4. **Edit** (`src/tools/edit.ts`): Tools for surgical text replacements and file editing, leveraging Git for efficient diff and patch operations.
5. **Search** (`src/tools/search.ts`): Tools for searching files and code using ripgrep.
6. **Schemas** (`src/tools/schemas.ts`): Zod schemas for input validation.

### Utilities

1. **Config** (`src/config.ts`): Configuration loading and management.
2. **Utils** (`src/utils.ts`): General utility functions.
3. **Types** (`src/types.ts`): TypeScript type definitions.
4. **Version** (`src/version.ts`): Version information for the package.

## Coding Style & Conventions

### TypeScript

- Use TypeScript for all code with strict typing.
- Define interfaces and types in `src/types.ts` for shared types.
- Use Zod schemas for API input validation.

### File Structure

- Each tool category has its own file in the `src/tools/` directory.
- Main components are in the root `src/` directory.
- Keep files focused and under 500 lines.
- Use ES Modules with `import`/`export` syntax.

### Naming Conventions

- Use camelCase for variables and functions.
- Use PascalCase for classes and interfaces.
- Use UPPER_SNAKE_CASE for constants.
- Prefix interfaces with `I` (e.g., `IToolFunction`).
- Prefix types with `T` (e.g., `TCommandOptions`).

### Code Quality

- Use meaningful variable and function names.
- Add JSDoc comments for exported functions and interfaces.
- Handle errors gracefully with try/catch blocks.
- Use async/await for asynchronous operations.
- Log important events and errors.

## Development Workflow

1. **Feature Planning**: Add new features to the TASK.md file with a clear description.
2. **Implementation**: Follow the established architecture and coding style.
3. **Testing**: Add tests for new features in the `test/` directory.
4. **Documentation**: Update README.md and other documentation with the new features.
5. **Version Bump**: Use the bump scripts to update the version before releasing.

## Constraints & Considerations

### Security

- Command validation to prevent dangerous operations.
- Path restrictions and sandboxing.
- Implement a command blocklist system.

### Performance

- Use Git-based diff and patch for efficient file editing operations.
- Implement smart selection between approaches based on file size and content.
- Use streaming for large file operations.
- Handle long-running commands efficiently.
- Optimize search operations for large codebases.

### Cross-Platform Support

- Ensure compatibility with Windows, macOS, and Linux.
- Handle path differences between platforms.
- Consider shell differences (cmd vs bash vs PowerShell).

## Future Roadmap

1. **Configuration Improvements**: Better settings for allowed paths, commands, and shell environment.
2. **Windows and Linux Support**: Fix platform-specific issues.
3. **WSL Support**: Windows Subsystem for Linux integration.
4. **SSH Support**: Remote server command execution.
5. **Improved Error Handling**: Better error messages and recovery strategies.
6. **User Interface**: Potential graphical interface for configuration.

## Integration Points

The project integrates with:

1. **Claude Desktop**: Through the MCP protocol.
2. **MCP SDK**: Using the `@modelcontextprotocol/sdk` package.
3. **VSCode Ripgrep**: For code searching functionality.
4. **Node.js File System**: For file operations.
5. **Child Process Module**: For command execution.
6. **Git**: For efficient diff and patch operations in file editing.

## Resources

- [Model Context Protocol Documentation](https://github.com/modelcontextprotocol/schema)
- [MCP Filesystem Server](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem)
- [Official Project Website](https://desktopcommander.app/)

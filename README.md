# Building and Publishing Your Sui Move Package

Follow these steps to test, build, and publish your Sui Move package:

## Prerequisites

- Ensure you have the Sui CLI installed and configured
- Make sure you're in the correct project directory

## Commands

### 1. Navigate to Package Directory
```bash
cd my_first_package
```

### 2. Test the Package
```bash
sui move test
```
This command runs all unit tests in your Move package to ensure everything works correctly.

### 3. Build the Package
```bash
sui move build
```
This compiles your Move code and generates the necessary bytecode for deployment.

### 4. Publish to Sui Network
```bash
sui client publish
```
This publishes your compiled package to the Sui blockchain network.

## Notes

- Make sure all tests pass before building
- Ensure your package builds successfully before attempting to publish
- Publishing requires gas fees, so ensure your wallet has sufficient SUI tokens
- The publish command will return a package ID that you can use to interact with your deployed package

## Troubleshooting

If you encounter any issues:
- Verify your Sui CLI is up to date
- Check that your Move.toml file is properly configured
- Ensure you have an active network connection
- Confirm your wallet has sufficient balance for gas fees
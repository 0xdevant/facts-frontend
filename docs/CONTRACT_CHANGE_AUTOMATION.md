# Contract Change Database Automation

This document explains how the automated database reset/clear system works when the contract address changes.

## Overview

When you deploy a new contract and update the address in `src/lib/contract.ts`, the GitHub workflow automatically detects this change and clears the database to prevent data inconsistencies between the old and new contracts.

## How It Works

### 1. Detection

- The workflow monitors changes to `src/lib/contract.ts`
- It compares the contract address between the current and previous commits
- Uses regex to extract the `factsContractAddress` value

### 2. Database Action

The workflow clears all data from the database while preserving the schema:

- Preserves database schema
- Only deletes data from `Source` and `Question` tables
- Safe approach that maintains database structure

### 3. Notification

- Creates a GitHub issue when database is cleared
- Provides details about the change and next steps

## Setup Instructions

### 1. Add GitHub Secrets

In your GitHub repository settings, add the following secret:

```
DATABASE_URL=your_database_connection_string
```

### 2. Workflow File

The workflow file is located at `.github/workflows/reset-db-on-contract-change.yml`

### 3. Enable Workflow

The workflow will automatically run when:

- You push to the `main` branch
- The `src/lib/contract.ts` file is modified
- You manually trigger it via GitHub Actions

## Usage

### Normal Contract Deployment

1. Deploy your new contract
2. Update `src/lib/contract.ts` with the new address
3. Commit and push to `main`
4. The workflow automatically detects the change and clears the database
5. Check the created GitHub issue for confirmation

### Manual Trigger

If you need to manually trigger the workflow:

1. Go to GitHub Actions tab
2. Select the workflow
3. Click "Run workflow"
4. Choose the branch and run

## Safety Features

### Backup (Recommended)

Before relying on this automation, consider:

- Setting up database backups
- Testing the workflow on a staging environment
- Having a rollback plan

### Manual Override

You can always:

- Skip the workflow by not modifying `src/lib/contract.ts`
- Manually clear the database using Prisma commands
- Disable the workflow temporarily

## Troubleshooting

### Workflow Fails

1. Check GitHub Actions logs
2. Verify `DATABASE_URL` secret is set correctly
3. Ensure database is accessible from GitHub Actions

### Database Not Cleared

1. Check if the contract address actually changed
2. Verify the regex pattern matches your address format
3. Check workflow logs for any errors

### False Positives

If the workflow triggers when it shouldn't:

1. Check if other changes in `src/lib/contract.ts` triggered it
2. Verify the address comparison logic
3. Consider adding more specific path filters

## Customization

### Modify Detection Logic

Edit the regex pattern in the workflow:

```bash
const match = contractFile.match(/factsContractAddress\s*=\s*["']([^"']+)["']/);
```

### Add More Tables

If you add more tables to clear, modify the Node.js script:

```javascript
await prisma.yourNewTable.deleteMany({});
```

### Change Notification

Modify the GitHub issue creation script to include different information or format.

## Best Practices

1. **Test First**: Always test contract changes on a staging environment
2. **Backup Data**: Keep backups of important data before major changes
3. **Monitor**: Watch the GitHub Actions tab for workflow execution
4. **Document**: Update this documentation when making changes
5. **Review**: Always review the created GitHub issue for accuracy

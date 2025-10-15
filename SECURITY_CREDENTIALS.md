# 🔐 Security Notice: Credential Management

## ⚠️ IMPORTANT: Never Commit Real Credentials

### ❌ DO NOT commit these to git:
- AWS Access Keys
- AWS Secret Keys
- Google Cloud Service Account Keys
- API Tokens
- Database Passwords
- JWT Secrets

### ✅ How to Handle Credentials

#### 1. **Use Environment Variables**
All sensitive credentials should be in `.env` file:

```env
# .env (NEVER commit this file)
AWS_ACCESS_KEY_ID=your-real-key-here
AWS_SECRET_ACCESS_KEY=your-real-secret-here
```

#### 2. **Use .env.example for Templates**
Create a template without real values:

```env
# .env.example (Safe to commit)
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
```

#### 3. **Documentation Files**
Always use placeholders in documentation:

```markdown
# ❌ WRONG
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE

# ✅ CORRECT
AWS_ACCESS_KEY_ID=your-aws-access-key-id
```

---

## 🛡️ What's Already Protected

### Files in `.gitignore`:
```
.env
.env.local
.env.*.local
```

### GitHub Protection:
- ✅ Secret scanning enabled
- ✅ Push protection active
- ✅ Blocks commits with exposed secrets

---

## 🚨 If You Accidentally Commit Secrets

### Immediate Actions:

1. **Rotate the Exposed Credentials**
   - AWS: Create new access keys, delete old ones
   - Google Cloud: Generate new service account key
   - Database: Change password

2. **Remove from Git History**
   ```bash
   # Option 1: Amend last commit
   git add .
   git commit --amend --no-edit
   git push --force
   
   # Option 2: Use BFG Repo-Cleaner for older commits
   # https://rtyley.github.io/bfg-repo-cleaner/
   ```

3. **Notify Team**
   - Alert team members about the incident
   - Ensure everyone pulls the cleaned history

---

## 📋 Credential Checklist

Before committing:

- [ ] Check for AWS keys in code/docs
- [ ] Verify `.env` is in `.gitignore`
- [ ] Use placeholders in documentation
- [ ] Review changes with `git diff`
- [ ] Use `git secrets` tool (optional)

---

## 🔧 Tools to Prevent Secrets

### 1. **git-secrets**
```bash
# Install
brew install git-secrets  # macOS
# or download from: https://github.com/awslabs/git-secrets

# Setup
git secrets --install
git secrets --register-aws
```

### 2. **pre-commit hooks**
```bash
# Install pre-commit
pip install pre-commit

# Add to .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    hooks:
      - id: detect-aws-credentials
      - id: detect-private-key
```

---

## 📞 Questions?

If you're unsure whether something is safe to commit:
1. Ask yourself: "Could this be used to access our systems?"
2. If yes → use environment variable
3. If no → probably safe to commit

**When in doubt, use a placeholder!**

---

**Last Updated:** October 16, 2025  
**Security Level:** High Priority 🔴

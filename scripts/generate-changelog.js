#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CATEGORIES = {
  feat: { emoji: '✨', title: 'Novas funcionalidades' },
  fix: { emoji: '🐛', title: 'Correções' },
  perf: { emoji: '⚡', title: 'Performance' },
  refactor: { emoji: '♻️', title: 'Refatoração' },
  docs: { emoji: '📝', title: 'Documentação' },
  chore: { emoji: '🔧', title: 'Melhorias internas' }
};

const SKIP_PREFIXES = ['build:', 'ci:', 'test:', 'style:'];

function getPreviousTag() {
  try {
    return execSync('git describe --tags --abbrev=0 HEAD~1 2>/dev/null', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
  } catch (error) {
    // Se não houver tag anterior, retorna null (vai usar todos os commits)
    return null;
  }
}

function getCommitsSinceTag(fromTag) {
  const gitRange = fromTag ? `${fromTag}..HEAD` : 'HEAD';
  try {
    return execSync(`git log ${gitRange} --pretty=format:"%s"`, {
      encoding: 'utf8'
    })
      .split('\n')
      .filter(line => line.trim())
      .filter(line => !line.includes('chore: bump version to')) // Ignora bump version commits
      .filter(line => !SKIP_PREFIXES.some(prefix => line.startsWith(prefix)));
  } catch (error) {
    console.error('Erro ao listar commits:', error.message);
    return [];
  }
}

function categorizeCommits(commits) {
  const categorized = {};

  commits.forEach(commit => {
    let matched = false;

    for (const [prefix, { emoji, title }] of Object.entries(CATEGORIES)) {
      if (commit.startsWith(`${prefix}:`)) {
        if (!categorized[title]) {
          categorized[title] = [];
        }
        categorized[title].push(commit);
        matched = true;
        break;
      }
    }

    if (!matched) {
      if (!categorized['Outros']) {
        categorized['Outros'] = [];
      }
      categorized['Outros'].push(commit);
    }
  });

  return categorized;
}

function getEmojiForCategory(title) {
  for (const { emoji, title: catTitle } of Object.values(CATEGORIES)) {
    if (catTitle === title) return emoji;
  }
  return '📌';
}

function generateMarkdown(categorized) {
  if (Object.keys(categorized).length === 0) {
    return '## What\'s Changed\n\nNo changes in this release.';
  }

  let markdown = '## What\'s Changed\n\n';

  // Ordem de aparição preferida
  const preferredOrder = ['Novas funcionalidades', 'Correções', 'Performance', 'Refatoração', 'Documentação', 'Melhorias internas', 'Outros'];

  for (const category of preferredOrder) {
    if (!categorized[category]) continue;

    const emoji = getEmojiForCategory(category);
    markdown += `### ${emoji} ${category}\n`;

    categorized[category].forEach(commit => {
      markdown += `- ${commit}\n`;
    });

    markdown += '\n';
  }

  return markdown;
}

function generateChangelog() {
  console.log('📝 Gerando release notes...');

  const previousTag = getPreviousTag();
  console.log(`  Tag anterior: ${previousTag || '(nenhuma)'}`);

  const commits = getCommitsSinceTag(previousTag);
  console.log(`  Commits encontrados: ${commits.length}`);

  if (commits.length === 0) {
    console.log('  ⚠️  Nenhum commit para gerar release notes');
    return;
  }

  const categorized = categorizeCommits(commits);
  const markdown = generateMarkdown(categorized);

  const outputPath = path.join(__dirname, '../RELEASE_NOTES.md');
  fs.writeFileSync(outputPath, markdown);

  console.log(`✅ Release notes gerado: ${outputPath}`);
}

generateChangelog();

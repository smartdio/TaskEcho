#!/usr/bin/env node

/**
 * 版本号生成脚本
 * 功能：
 * 1. 读取当前版本号（从 package.json 或 public/version.json）
 * 2. 解析 Git commit message，判断版本号递增规则
 * 3. 根据规则生成新版本号
 * 4. 获取 Git 信息（commit hash、branch）
 * 5. 生成 public/version.json 文件
 * 6. 更新 package.json 中的版本号
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// 获取项目根目录
const rootDir = path.resolve(__dirname, '..')
const packageJsonPath = path.join(rootDir, 'package.json')
const versionJsonPath = path.join(rootDir, 'public', 'version.json')

/**
 * 读取 package.json
 */
function readPackageJson() {
  try {
    const content = fs.readFileSync(packageJsonPath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error('读取 package.json 失败:', error.message)
    process.exit(1)
  }
}

/**
 * 读取 version.json（如果存在）
 */
function readVersionJson() {
  try {
    if (fs.existsSync(versionJsonPath)) {
      const content = fs.readFileSync(versionJsonPath, 'utf-8')
      return JSON.parse(content)
    }
  } catch (error) {
    // 如果文件不存在或解析失败，返回 null
  }
  return null
}

/**
 * 解析版本号字符串为对象
 */
function parseVersion(versionString) {
  const parts = versionString.split('.')
  if (parts.length !== 3) {
    throw new Error(`无效的版本号格式: ${versionString}`)
  }
  return {
    major: parseInt(parts[0], 10),
    minor: parseInt(parts[1], 10),
    patch: parseInt(parts[2], 10)
  }
}

/**
 * 格式化版本号为字符串
 */
function formatVersion(version) {
  return `${version.major}.${version.minor}.${version.patch}`
}

/**
 * 获取当前版本号
 */
function getCurrentVersion() {
  // 优先从 version.json 读取
  const versionJson = readVersionJson()
  if (versionJson && versionJson.version) {
    return parseVersion(versionJson.version)
  }
  
  // 从 package.json 读取
  const packageJson = readPackageJson()
  if (packageJson.version) {
    return parseVersion(packageJson.version)
  }
  
  // 默认版本
  return { major: 0, minor: 1, patch: 0 }
}

/**
 * 获取 Git commit message（从环境变量或 Git 历史）
 */
function getCommitMessage() {
  // 从环境变量获取（Git hook 设置）
  if (process.env.GIT_COMMIT_MSG) {
    return process.env.GIT_COMMIT_MSG
  }
  
  // 从命令行参数获取
  if (process.argv.length > 2) {
    return process.argv.slice(2).join(' ')
  }
  
  // 尝试从 Git 获取最新的 commit message
  try {
    const message = execSync('git log -1 --pretty=%B', { 
      encoding: 'utf-8',
      cwd: rootDir,
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim()
    return message
  } catch (error) {
    // Git 不可用，返回空字符串
    return ''
  }
}

/**
 * 判断版本号递增规则
 */
function determineVersionIncrement(commitMessage) {
  const message = commitMessage.toLowerCase()
  
  if (message.includes('[major]') || message.includes('[major]')) {
    return 'major'
  }
  
  if (message.includes('[minor]') || message.includes('[minor]')) {
    return 'minor'
  }
  
  // 默认递增 patch
  return 'patch'
}

/**
 * 递增版本号
 */
function incrementVersion(currentVersion, incrementType) {
  const newVersion = { ...currentVersion }
  
  switch (incrementType) {
    case 'major':
      newVersion.major += 1
      newVersion.minor = 0
      newVersion.patch = 0
      break
    case 'minor':
      newVersion.minor += 1
      newVersion.patch = 0
      break
    case 'patch':
    default:
      newVersion.patch += 1
      break
  }
  
  return newVersion
}

/**
 * 获取 Git 信息
 */
function getGitInfo() {
  const info = {
    gitCommit: '',
    gitCommitShort: '',
    gitBranch: ''
  }
  
  try {
    // 获取完整 commit hash
    info.gitCommit = execSync('git rev-parse HEAD', {
      encoding: 'utf-8',
      cwd: rootDir,
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim()
    
    // 获取短 commit hash（7位）
    info.gitCommitShort = info.gitCommit.substring(0, 7)
  } catch (error) {
    // Git 不可用
  }
  
  try {
    // 获取当前分支
    info.gitBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
      cwd: rootDir,
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim()
  } catch (error) {
    // Git 不可用
  }
  
  return info
}

/**
 * 获取构建序号
 */
function getBuildNumber() {
  const versionJson = readVersionJson()
  if (versionJson && typeof versionJson.buildNumber === 'number') {
    return versionJson.buildNumber + 1
  }
  return 1
}

/**
 * 生成版本信息
 */
function generateVersionInfo() {
  // 获取当前版本
  const currentVersion = getCurrentVersion()
  
  // 获取 commit message
  const commitMessage = getCommitMessage()
  
  // 判断版本递增规则
  const incrementType = determineVersionIncrement(commitMessage)
  
  // 生成新版本号
  const newVersion = incrementVersion(currentVersion, incrementType)
  
  // 获取 Git 信息
  const gitInfo = getGitInfo()
  
  // 获取构建序号
  const buildNumber = getBuildNumber()
  
  // 构建时间
  const buildTime = new Date().toISOString()
  
  return {
    version: formatVersion(newVersion),
    major: newVersion.major,
    minor: newVersion.minor,
    patch: newVersion.patch,
    buildTime,
    gitCommit: gitInfo.gitCommit,
    gitCommitShort: gitInfo.gitCommitShort,
    gitBranch: gitInfo.gitBranch,
    buildNumber
  }
}

/**
 * 写入 version.json
 */
function writeVersionJson(versionInfo) {
  // 确保 public 目录存在
  const publicDir = path.dirname(versionJsonPath)
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }
  
  // 写入文件
  fs.writeFileSync(
    versionJsonPath,
    JSON.stringify(versionInfo, null, 2) + '\n',
    'utf-8'
  )
  
  console.log(`✓ 版本信息已生成: ${versionInfo.version}`)
  console.log(`  构建时间: ${versionInfo.buildTime}`)
  console.log(`  Git 提交: ${versionInfo.gitCommitShort}`)
  console.log(`  构建序号: ${versionInfo.buildNumber}`)
}

/**
 * 更新 package.json 中的版本号
 */
function updatePackageJson(version) {
  const packageJson = readPackageJson()
  packageJson.version = version
  
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + '\n',
    'utf-8'
  )
  
  console.log(`✓ package.json 版本已更新: ${version}`)
}

/**
 * 主函数
 */
function main() {
  try {
    // 生成版本信息
    const versionInfo = generateVersionInfo()
    
    // 写入 version.json
    writeVersionJson(versionInfo)
    
    // 更新 package.json
    updatePackageJson(versionInfo.version)
    
    console.log('\n版本号生成完成！')
  } catch (error) {
    console.error('生成版本号失败:', error.message)
    process.exit(1)
  }
}

// 执行主函数
if (require.main === module) {
  main()
}

module.exports = {
  generateVersionInfo,
  getCurrentVersion,
  parseVersion,
  formatVersion
}








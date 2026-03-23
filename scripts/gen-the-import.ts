#!/usr/bin/env ts-node
import ts from 'typescript'
import { readdirSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const ROOT = resolve(__dirname, '..')
const SRC = join(ROOT, 'src')
const OUT = join(SRC, 'the-import.ts')

const PURE_REEXPORTS = new Set([
  'src/config/index.ts',
  'src/Queue/index.ts',
  'src/Queue/worker.ts',
  'src/Queue/jobs/email.job.ts',
  'src/Queue/email/index.ts',
  'src/Module/Authentication/index.ts',
])

const SKIP_PATTERNS = [
  '__tests__',
  '.test.',
  '.spec.',
  'the-import',
  'src/types/', // global Express augmentation — not re-exportable
  'src/app.ts',      // entry point — not re-exportable
  'src/app.config.ts', // entry-point config — would create circular deps
  'src/app.module.ts', // entry-point router — would create circular deps
  'src/config/dotenv', // side-effect only
]

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name)
    return e.isDirectory() ? walk(full) : [full]
  })
}

function shouldSkip(file: string): boolean {
  if (!file.endsWith('.ts')) return true
  const rel = relative(ROOT, file).replace(/\\/g, '/')
  if (PURE_REEXPORTS.has(rel)) return true
  return SKIP_PATTERNS.some((p) => rel.includes(p))
}

interface FileInfo {
  importPath: string
  types: string[]
  values: string[]
  defaultAlias: string | null
}

function analyzeFiles(files: string[]): FileInfo[] {
  const cfgFile = ts.readConfigFile(join(ROOT, 'tsconfig.json'), ts.sys.readFile)
  const { options } = ts.parseJsonConfigFileContent(cfgFile.config, ts.sys, ROOT)

  const program = ts.createProgram(files, options)
  const checker = program.getTypeChecker()

  return files.flatMap((file): FileInfo[] => {
    const sf = program.getSourceFile(file)
    if (!sf) return []

    const mod = checker.getSymbolAtLocation(sf)
    if (!mod) return []

    const types: string[] = []
    const values: string[] = []
    let hasDefault = false

    for (const sym of checker.getExportsOfModule(mod)) {
      const name = sym.getName()

      if (name === 'default') {
        hasDefault = true
        continue
      }

      const f = sym.getFlags()

      const isTypeOnly =
        !!(f & (ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias)) &&
        !(f & ts.SymbolFlags.Value)

      isTypeOnly ? types.push(name) : values.push(name)
    }

    if (!types.length && !values.length && !hasDefault) return []

    const rel = relative(SRC, file)
      .replace(/\\/g, '/')
      .replace(/(?:\.d)?\.ts$/, '')
      .replace(/\/index$/, '')

    const lastSegment = rel.split('/').pop()!.replace(/[^a-zA-Z0-9_$]/g, '_')
    const defaultAlias = hasDefault ? lastSegment || null : null

    return [{ importPath: `./${rel}`, types, values, defaultAlias }]
  })
}

function buildOutput(infos: FileInfo[]): string {
  const seen = new Set<string>()

  const lines: string[] = [
    '/**',
    ' * the-import.ts — AUTO-GENERATED, do not edit manually.',
    ' * Regenerate: pnpm gen:imports',
    ' */',
    '',
  ]

  for (const { importPath, types, values, defaultAlias } of infos) {
    // Deduplicate across files (first occurrence wins)
    const t = types.filter((n) => !seen.has(n))
    const v = values.filter((n) => !seen.has(n))

    t.forEach((n) => seen.add(n))
    v.forEach((n) => seen.add(n))

    if (t.length) lines.push(`export type { ${t.join(', ')} } from '${importPath}';`)
    if (v.length) lines.push(`export { ${v.join(', ')} } from '${importPath}';`)

    if (defaultAlias && !seen.has(defaultAlias)) {
      seen.add(defaultAlias)
      lines.push(`export { default as ${defaultAlias} } from '${importPath}';`)
    }
  }

  lines.push('')
  return lines.join('\n')
}

export function genTheImport(): void {
  const files = walk(SRC).filter((f) => !shouldSkip(f)).sort()
  const infos = analyzeFiles(files)
  const output = buildOutput(infos)

  writeFileSync(OUT, output, 'utf-8')

  const total = infos.reduce(
    (n, i) => n + i.types.length + i.values.length + (i.defaultAlias ? 1 : 0),
    0,
  )

  console.log(`✓  ${relative(ROOT, OUT)}`)
  console.log(`   ${infos.length} source files · ${total} exports`)
}

genTheImport()

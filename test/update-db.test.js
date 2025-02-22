let { remove, copy, readFile, ensureDir } = require('fs-extra')
let { execSync } = require('child_process')
let { tmpdir } = require('os')
let { join } = require('path')
let nanoid = require('nanoid/non-secure')

let updateDd = require('../update-db')

let testdir

afterEach(async () => {
  process.chdir(join(__dirname, '..'))
  await remove(testdir)
})

async function chdir (fixture, ...files) {
  testdir = join(tmpdir(), `browserslist-${ fixture }-${ nanoid() }`)
  await ensureDir(testdir)

  let from = join(__dirname, 'fixtures', fixture)
  await Promise.all(files.map(async i => {
    await copy(join(from, i), join(testdir, i))
  }))

  process.chdir(testdir)
  return testdir
}

function runUpdate () {
  let out = ''
  updateDd(str => {
    out += str
  })
  return out
}

let caniuse = JSON.parse(execSync('npm show caniuse-lite --json').toString())

it('throws on missing package.json', async () => {
  await chdir('update-missing')
  expect(runUpdate).toThrow(
    'Cannot find package.json. ' +
    'Is it a right project to run npx browserslist --update-db?'
  )
})

it('throws on missing lockfile', async () => {
  await chdir('update-missing', 'package.json')
  expect(runUpdate).toThrow(
    'No lockfile found. Run "npm install", "yarn install" or "pnpm install"'
  )
})

it('updates caniuse-lite for npm', async () => {
  let dir = await chdir('update-npm', 'package.json', 'package-lock.json')

  expect(runUpdate()).toEqual(
    'Current version: 1.0.30001030\n' +
    `New version: ${ caniuse.version }\n` +
    'Updating caniuse-lite…\n' +
    'caniuse-lite has been successfully updated'
  )

  let lock = JSON.parse(await readFile(join(dir, 'package-lock.json')))
  expect(lock.dependencies['caniuse-lite'].version).toEqual(caniuse.version)
})

it('updates caniuse-lite without previous version', async () => {
  let dir = await chdir('update-missing', 'package.json', 'package-lock.json')

  expect(runUpdate()).toEqual(
    `New version: ${ caniuse.version }\n` +
    'Updating caniuse-lite…\n' +
    'caniuse-lite has been successfully updated'
  )

  let lock = JSON.parse(await readFile(join(dir, 'package-lock.json')))
  expect(lock.dependencies['caniuse-lite']).toBeUndefined()
})

it('updates caniuse-lite for yarn', async () => {
  let dir = await chdir('update-yarn', 'package.json', 'yarn.lock')

  expect(runUpdate()).toEqual(
    'Current version: 1.0.30001035\n' +
    `New version: ${ caniuse.version }\n` +
    'Updating caniuse-lite…\n' +
    'caniuse-lite has been successfully updated'
  )

  let lock = (await readFile(join(dir, 'yarn.lock'))).toString()
  expect(lock).toContain(
    'caniuse-lite@^1.0.30001030:\n' +
    `  version "${ caniuse.version }"`
  )
})

it('updates caniuse-lite for pnpm', async () => {
  let dir = await chdir('update-pnpm', 'package.json', 'pnpm-lock.yaml')

  expect(runUpdate()).toEqual(
    'Current version: 1.0.30001035\n' +
    `New version: ${ caniuse.version }\n` +
    'Updating caniuse-lite…\n' +
    'caniuse-lite has been successfully updated'
  )

  let lock = (await readFile(join(dir, 'pnpm-lock.yaml'))).toString()
  expect(lock).toContain(`/caniuse-lite/${ caniuse.version }:`)
})

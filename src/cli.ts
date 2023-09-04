#!/usr/bin/env node

import * as fsPromises from "node:fs/promises"
import * as path from "node:path"

import axios from "axios"
import { Command } from "commander"
import { SourceMapConsumer } from "source-map"

import { getAggregatedSourceContents } from "./lib.js"

// eslint-disable-next-line no-control-regex
const ILLEGAL_FILENAME_CHARS = /[<>:"|?*\x00-\x1F#%&{}$!'"@+`=]/g

const program = new Command()

async function main(options: { outDirectory: string }, files: string[]) {
  const inputFiles = files

  const dependencies = {
    SourceMapConsumer,
    axios,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    normalizePath: path.normalize,
    readFile: fsPromises.readFile,
  }

  const sourceContents = await getAggregatedSourceContents(
    inputFiles,
    dependencies,
  )

  let maxParentDirDepth = 0
  // avoid saving files outside of the output directory
  const sourceContentsSanitized = Object.entries(sourceContents).map(
    ([filename, content]) => {
      let filePath = filename
      if (filePath.match(/^[a-zA-Z]:/)) {
        // chop off drive letter
        filePath = filePath.slice(2)
      }
      if (filePath.startsWith("/")) {
        // chop off leading slashes (potentially more than 1)
        filePath = filePath.replace(/^\/+/, "")
      }
      if (filePath.startsWith("\\")) {
        // chop off leading backslashes (potentially more than 1)
        filePath = filePath.replace(/^\\+/, "")
      }
      filePath.replace(ILLEGAL_FILENAME_CHARS, "_")
      const parentDirDepth = filePath.match(/\.\./g)?.length
      maxParentDirDepth = Math.max(maxParentDirDepth, parentDirDepth ?? 0)
      return [filePath, content]
    },
  )

  const nestedOutputDir = path.join(
    options.outDirectory,
    "0/".repeat(maxParentDirDepth),
  )

  await fsPromises.mkdir(nestedOutputDir, { recursive: true })

  const writePromises = sourceContentsSanitized.map(
    async ([filename, content]) => {
      if (filename == null || content == null) return
      const filePath = path.join(nestedOutputDir, filename)
      const dirPath = path.dirname(filePath)
      try {
        await fsPromises.mkdir(dirPath, { recursive: true })
        await fsPromises.writeFile(filePath, content)
      } catch (err) {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        console.warn(`fs Error: ${err}`)
      }
      console.info(`Written ${filename} to ${nestedOutputDir}`)
    },
  )

  await Promise.all(writePromises)
}

program
  .arguments("<files...>")
  .requiredOption(
    "-o, --out-directory <dir>",
    "Directory in which to put the downloaded original sources. If download paths contain '..', we'll add nested directories to out-directory in order to avoid saving files outside.",
  )
  .description("Usage: <files...> -o [output directory]")
  .action((files: string[], cmdObj: { outDirectory: string }) => {
    main(cmdObj, files).catch(err => {
      console.error("Error:", err)
      process.exit(1)
    })
  })
  .parse(process.argv)

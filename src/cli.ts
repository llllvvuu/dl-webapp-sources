#!/usr/bin/env node

import * as fsPromises from "node:fs/promises"
import * as path from "node:path"

import axios from "axios"
import { Command } from "commander"
import { SourceMapConsumer } from "source-map"

import { getAggregatedSourceContents } from "./lib.js"

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

  await fsPromises.mkdir(options.outDirectory, { recursive: true })

  const writePromises = Object.entries(sourceContents).map(
    async ([filename, content]) => {
      const filePath = path.join(options.outDirectory, filename)
      const dirPath = path.dirname(filePath)
      try {
        await fsPromises.mkdir(dirPath, { recursive: true })
        await fsPromises.writeFile(filePath, content)
      } catch (err) {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        console.warn(`fs Error: ${err}`)
      }
      console.info(`Written ${filename} to ${options.outDirectory}`)
    },
  )

  await Promise.all(writePromises)
}

program
  .arguments("<files...>")
  .requiredOption(
    "-o, --out-directory <dir>",
    "Directory in which to put the downloaded original sources",
  )
  .description("Usage: <files...> -o [output directory]")
  .action((files: string[], cmdObj: { outDirectory: string }) => {
    main(cmdObj, files).catch(err => {
      console.error("Error:", err)
      process.exit(1)
    })
  })
  .parse(process.argv)

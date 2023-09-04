import * as fs from "node:fs"
import * as fsPromises from "node:fs/promises"
import * as path from "node:path"

import axios from "axios"

import { SourceMapConsumer } from "source-map"
import { describe, expect, test } from "vitest"

import {
  getAggregatedSourceContents,
  getSourceMappingURL,
  fetchFile,
  normalizeSourceMappingURL,
  getSourceContents,
} from "../src/lib"

describe("getSourceMappingURL", () => {
  test("should return the correct relative URL", () => {
    const compiled = fs.readFileSync(
      path.resolve(
        __dirname,
        "./examples/mozilla-source-map-issue-258/index.ios.bundle",
      ),
    )
    const sourceMappingURL = getSourceMappingURL(compiled.toString())
    expect(sourceMappingURL).toBe("index.ios.map")
  })
})

describe("normalizeSourceMappingURL", () => {
  test("filename + filename", () => {
    const sourceMappingURL = normalizeSourceMappingURL(
      "./examples/mozilla-source-map-issue-258/index.ios.bundle",
      "index.ios.map?platform=ios&dev=false&minify=true",
      // eslint-disable-next-line @typescript-eslint/unbound-method
      { normalizePath: path.normalize },
    )
    expect(sourceMappingURL).toBe(
      "examples/mozilla-source-map-issue-258/index.ios.map?platform=ios&dev=false&minify=true",
    )

    const sourceMappingUrlBrowser = normalizeSourceMappingURL(
      "./examples/mozilla-source-map-issue-258/index.ios.bundle",
      "index.ios.map?platform=ios&dev=false&minify=true",
      { normalizePath: null },
    )
    expect(sourceMappingUrlBrowser).toBe(null)
  })

  test("https:// + filename", () => {
    const sourceMappingURL = normalizeSourceMappingURL(
      "https://unpkg.com/mermaid@9.4.0/dist/mermaid.min.js",
      "mermaid.min.js.map",
      { normalizePath: null },
    )
    expect(sourceMappingURL).toBe(
      "https://unpkg.com/mermaid@9.4.0/dist/mermaid.min.js.map",
    )
  })

  test("https:// + null", () => {
    const sourceMappingURL = normalizeSourceMappingURL(
      "https://unpkg.com/mermaid@9.4.0/dist/mermaid.min.js",
      null,
      { normalizePath: null },
    )
    expect(sourceMappingURL).toBe(
      "https://unpkg.com/mermaid@9.4.0/dist/mermaid.min.js.map",
    )
  })

  test("filename + https://", () => {
    const sourceMappingURL = normalizeSourceMappingURL(
      "./mermaid.min.js",
      "https://unpkg.com/mermaid@9.4.0/dist/mermaid.min.js.map",
      { normalizePath: null },
    )
    expect(sourceMappingURL).toBe(
      "https://unpkg.com/mermaid@9.4.0/dist/mermaid.min.js.map",
    )
  })
})

describe("fetchFile", () => {
  test("should return correct source map for data URI", async () => {
    const sourceMap = await fetchFile(
      "data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUlBLFNBQVMsS0FBSyxDQUFDLEVBQWdCO1FBQWYsY0FBSTtJQUNsQixPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVUsSUFBSSxNQUFHLENBQUMsQ0FBQztBQUNqQyxDQUFDO0FBRUQsS0FBSyxDQUFDLEVBQUMsSUFBSSxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUMifQ==",
      { axios, readFile: null },
    )
    expect(JSON.parse(sourceMap ?? "")).toEqual({
      file: "main.js",
      mappings:
        ";AAIA,SAAS,KAAK,CAAC,EAAgB;QAAf,cAAI;IAClB,OAAO,CAAC,GAAG,CAAC,YAAU,IAAI,MAAG,CAAC,CAAC;AACjC,CAAC;AAED,KAAK,CAAC,EAAC,IAAI,EAAE,KAAK,EAAC,CAAC,CAAC",
      names: [],
      sourceRoot: "",
      sources: ["main.ts"],
      version: 3,
    })
  })
  test("should return correct source map for mozilla-source-map-issue-258", async () => {
    const basePath = path.resolve(
      __dirname,
      "./examples/mozilla-source-map-issue-258/index.ios.bundle",
    )
    const compiled = fs.readFileSync(basePath).toString()
    const sourceMappingURL = getSourceMappingURL(compiled)
    const normalizedSourceMappingURL = normalizeSourceMappingURL(
      basePath,
      sourceMappingURL,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      { normalizePath: path.normalize },
    )
    if (!normalizedSourceMappingURL) {
      expect(false).toBe(true)
      return
    }
    const sourceMap = await fetchFile(normalizedSourceMappingURL, {
      axios: null,
      readFile: fsPromises.readFile,
    })
    expect(JSON.parse(sourceMap ?? "")).toEqual({
      file: "index.ios.bundle",
      sections: [
        {
          map: {
            file: "require-0.js",
            mappings: "AAAA;",
            names: [],
            sources: ["require-0.js"],
            sourcesContent: [";require(0);"],
            version: 3,
          },
          offset: {
            column: 0,
            line: 0,
          },
        },
      ],
      version: 3,
    })
  })
})

describe("getSourceContents", () => {
  test("should return correct sources for mozilla-source-map-issue-258", async () => {
    const sourceMap = fs.readFileSync(
      path.resolve(
        __dirname,
        "./examples/mozilla-source-map-issue-258/index.ios.map",
      ),
    )
    const consumer = await new SourceMapConsumer(sourceMap.toString())
    const contents = await getSourceContents("", consumer, {
      axios: null,
      readFile: null,
      normalizePath: null,
    })
    expect(contents).toEqual({ "require-0.js": ";require(0);" })
    Object.values(contents).forEach(content => {
      expect(typeof content).toBe("string")
    })
  })

  test("should return correct sources for no-sources-content", async () => {
    const filepath = path.resolve(
      __dirname,
      "./examples/no-sources-content/index.ios.map",
    )
    const sourceMap = fs.readFileSync(filepath)
    const consumer = await new SourceMapConsumer(sourceMap.toString())
    const contents = await getSourceContents(filepath, consumer, {
      axios: null,
      readFile: fsPromises.readFile,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      normalizePath: path.normalize,
    })
    expect(contents).toEqual({ "require-0.js": ";require(0);\n" })
    Object.values(contents).forEach(content => {
      expect(typeof content).toBe("string")
    })
  })
})

describe("getAggregatedSourceContents", () => {
  test("should return correct sources for mozilla-source-map-issue-258, no-sources-content", async () => {
    const paths = [
      path.resolve(
        __dirname,
        "./examples/mozilla-source-map-issue-258/index.ios.bundle",
      ),
      path.resolve(__dirname, "./examples/no-sources-content/index.ios.map"),
    ]
    const sourceContents = await getAggregatedSourceContents(paths, {
      axios: null,
      readFile: fsPromises.readFile,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      normalizePath: path.normalize,
      SourceMapConsumer,
    })
    expect(sourceContents).toEqual({ "require-0.js": ";require(0);\n" })
  })
})

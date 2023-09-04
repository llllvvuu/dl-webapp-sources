import type axiosModule from "axios"
import type * as nodeFsPromises from "node:fs/promises"
import type * as nodePath from "node:path"
import type {
  SourceMapConsumer,
  BasicSourceMapConsumer,
  IndexedSourceMapConsumer,
} from "source-map"

// Matches only the last occurrence of sourceMappingURL
const innerRegex = /\s*[#@]\s*sourceMappingURL\s*=\s*([^\s'"]*)\s*/

/* eslint-disable prefer-template */
const sourceMappingURLRegex = RegExp(
  "(?:" +
    "/\\*" +
    "(?:\\s*\r?\n(?://)?)?" +
    "(?:" +
    innerRegex.source +
    ")" +
    "\\s*" +
    "\\*/" +
    "|" +
    "//(?:" +
    innerRegex.source +
    ")" +
    ")" +
    "\\s*",
)
/* eslint-enable prefer-template */

/** @public */
export interface GetAggregatedSourceContentsDeps
  extends GetSourceContentsDependencies {
  SourceMapConsumer: typeof SourceMapConsumer
}

/**
 * The main method. End-to-end conversion of list of .js or .js.map filepaths/URLs to source contents.
 * @returns - mapping from source path to source contents
 * @example
 * ```typescript
 * const sourceContents = await getAggregatedSourceContents(
 *   ["https://example.com/bundle.js", "c:/Users/you/bundle.js"],
 *   dependencies
 * )
 * ```
 * @public
 */
export async function getAggregatedSourceContents(
  urlsOrPaths: string[],
  dependencies: GetAggregatedSourceContentsDeps,
): Promise<Record<string, string>> {
  const logger = dependencies.logger ?? console
  const sourceContents: Record<string, string>[] = (
    await Promise.all(
      urlsOrPaths.map(async urlOrPath => {
        const fileContents = await fetchFile(urlOrPath, dependencies)
        if (!fileContents) {
          logger.warn?.(`Fetch of ${urlOrPath} returned null`)
          return null
        }
        if (urlOrPath.endsWith(".map")) {
          const sourceMapConsumer = await new dependencies.SourceMapConsumer(
            fileContents,
          )
          logger.debug?.(`Fetch of ${urlOrPath} returned sourcemap directly`)
          return getSourceContents(urlOrPath, sourceMapConsumer, dependencies)
        } else {
          const normalizedSourceMapUrl = normalizeSourceMappingURL(
            urlOrPath,
            getSourceMappingURL(fileContents),
            dependencies,
          )
          if (!normalizedSourceMapUrl) {
            logger.warn?.(`Could not normalize sourcemap URL ${urlOrPath}`)
            return null
          }
          const sourceMapStr = await fetchFile(
            normalizedSourceMapUrl,
            dependencies,
          )
          if (!sourceMapStr) {
            logger.warn?.(`Fetch of ${normalizedSourceMapUrl} returned null`)
            return null
          }
          const sourceMapConsumer = await new dependencies.SourceMapConsumer(
            sourceMapStr,
          )
          return getSourceContents(
            normalizedSourceMapUrl,
            sourceMapConsumer,
            dependencies,
          )
        }
      }),
    )
  ).filter((x): x is Record<string, string> => x !== null)

  return sourceContents.reduce(
    (acc, sourceContent) => ({ ...acc, ...sourceContent }),
    {},
  )
}

/**
 * Utility method to extract un-normalized sourceMappingURL from .js content.
 * @param compiledContent - contents of the compiled .js file
 * @returns - relative (unnormalized) URL of source map, or null if could not fetch
 * @example
 * ```typescript
 * let compiledJsUrl, dependencies
 *
 * const compiledJsStr = await fetchFile(compiledJsUrl, dependencies)
 * const sourceMapUrl = normalizeSourceMappingURL(
 *   compiledJsUrl,
 *   getSourceMappingURL(compiledJsStr),
 *   dependencies,
 * )
 * const sourceMapStr = await fetchFile(sourceMapUrl, dependencies)
 * const sourceMapConsumer = await new SourceMapConsumer(sourceMapStr)
 * const sourceContents =
 *   await getSourceContents(sourceMapUrl, sourceMapConsumer, dependencies)
 * ```
 * @public
 */
export function getSourceMappingURL(compiledContent: string): string | null {
  const match = compiledContent.match(sourceMappingURLRegex)
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const rawUrl = match && (match[1] || match[2] || null)
  return rawUrl ? decodeURI(rawUrl) : null
}

function isURL(str: string): boolean {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

/** @public */
export interface Logger {
  debug?: (message: string) => void
  info?: (message: string) => void
  warn?: (message: string) => void
}

/** @public */
export interface NormalizeUrlDependencies {
  /** Only necessary if compiledJsUrl is a local filepath */
  normalizePath: typeof nodePath.normalize | null
  /**
   * Defaults to `console`
   * @defaultValue console
   */
  logger?: Logger
}

function normalizePathOrUrl(
  basePathOrUrl: string,
  pathOrUrl: string,
  dependencies: NormalizeUrlDependencies,
): string | null {
  const logger = dependencies.logger ?? console
  if (isURL(pathOrUrl)) {
    logger.debug?.(`${pathOrUrl} is already normalized; returning as-is`)
    return pathOrUrl
  } else if (isURL(basePathOrUrl)) {
    const url = new URL(pathOrUrl, basePathOrUrl).toString()
    logger.debug?.(
      `constructing URL for ${pathOrUrl} with baseURL ${basePathOrUrl}: ${url}`,
    )
    return url
  } else if (dependencies.normalizePath) {
    const path = dependencies.normalizePath(`${basePathOrUrl}/../${pathOrUrl}`)
    logger.debug?.(
      `normalizing filepath ${pathOrUrl} relative to filepath ${basePathOrUrl}: ${path}`,
    )
    return path
  } else {
    logger.warn?.(
      `no normalization function provided for filepath ${pathOrUrl} relative to ${basePathOrUrl}`,
    )
    return null
  }
}

/**
 * Utility method to make a relative URL like "bundle.js.map" into
 * a resolvable URL like "https://example.com/bundle.js.map" or "./example/bundle.js.map"
 * @param sourcemapRelativeUrl - if this is null, the default guess is compiledJsUrl + ".map"
 * @returns URL resolvable from working directory
 * @example
 * ```typescript
 * let compiledJsUrl, dependencies
 *
 * const compiledJsStr = await fetchFile(compiledJsUrl, dependencies)
 * const sourceMapUrl = normalizeSourceMappingURL(
 *   compiledJsUrl,
 *   getSourceMappingURL(compiledJsStr),
 *   dependencies,
 * )
 * const sourceMapStr = await fetchFile(sourceMapUrl, dependencies)
 * const sourceMapConsumer = await new SourceMapConsumer(sourceMapStr)
 * const sourceContents =
 *   await getSourceContents(sourceMapUrl, sourceMapConsumer, dependencies)
 * ```
 * @public
 */
export function normalizeSourceMappingURL(
  compiledJsUrlOrFilename: string,
  sourcemapRelativeUrl: string | null,
  dependencies: NormalizeUrlDependencies,
): string | null {
  const logger = dependencies.logger ?? console
  if (!sourcemapRelativeUrl) {
    logger.info?.(
      `${compiledJsUrlOrFilename} does not specify a sourceMappingURL; guessing ${compiledJsUrlOrFilename}.map`,
    )
    return `${compiledJsUrlOrFilename}.map`
  } else {
    return normalizePathOrUrl(
      compiledJsUrlOrFilename,
      sourcemapRelativeUrl,
      dependencies,
    )
  }
}

/** @public */
export interface FetchFileDependencies {
  /** Only necessary if sourcemap is a URL */
  axios: typeof axiosModule | null
  /** Only necessary if sourcemap is a local filepath */
  readFile: typeof nodeFsPromises.readFile | null
  /**
   * Defaults to `console`
   * @defaultValue console
   */
  logger?: Logger
}

/**
 * Fetch method which can take a filepath or a URL.
 * @param normalizedUrlOrFilename - string resolvable from working directory
 * @returns - contents of resolved file
 * @example
 * ```typescript
 * let compiledJsUrl, dependencies
 *
 * const compiledJsStr = await fetchFile(compiledJsUrl, dependencies)
 * const sourceMapUrl = normalizeSourceMappingURL(
 *   compiledJsUrl,
 *   getSourceMappingURL(compiledJsStr),
 *   dependencies,
 * )
 * const sourceMapStr = await fetchFile(sourceMapUrl, dependencies)
 * const sourceMapConsumer = await new SourceMapConsumer(sourceMapStr)
 * const sourceContents =
 *   await getSourceContents(sourceMapUrl, sourceMapConsumer, dependencies)
 * ```
 * @public
 */
export async function fetchFile(
  normalizedUrlOrFilename: string,
  dependencies: FetchFileDependencies,
): Promise<string | null> {
  const logger = dependencies.logger ?? console
  try {
    if (!isURL(normalizedUrlOrFilename)) {
      if (!dependencies.readFile) {
        logger.warn?.(
          `readFile needed for ${normalizedUrlOrFilename} but not provided`,
        )
        return null
      }
      const sourceMapStr = (
        await dependencies.readFile(normalizedUrlOrFilename)
      ).toString()
      logger.debug?.(
        `read file from ${normalizedUrlOrFilename} with length ${sourceMapStr.length})`,
      )
      return sourceMapStr
    }

    if (!dependencies.axios) {
      logger.warn?.(
        `axios needed for ${normalizedUrlOrFilename} but not provided`,
      )
      return null
    }
    const resp = await dependencies.axios.get(normalizedUrlOrFilename)
    const data = resp.data as unknown
    if (
      typeof data === "string" ||
      data instanceof Buffer ||
      typeof data === "object"
    ) {
      const dataStr = (
        typeof data === "string" || data instanceof Buffer
          ? data
          : JSON.stringify(data)
      ).toString()
      logger.debug?.(
        `fetched file from ${normalizedUrlOrFilename} with status ${resp.status} and length ${dataStr.length})`,
      )
      return dataStr
    } else {
      logger.warn?.(
        `expected file fetched from ${normalizedUrlOrFilename} to be of type string, Buffer, or Object; got: ${typeof data})`,
      )
      return null
    }
  } catch (err) {
    logger.warn?.(
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      `could not fetch file from ${normalizedUrlOrFilename}: ${err}`,
    )
    return null
  }
}

/** @public */
export interface GetSourceContentsDependencies
  extends NormalizeUrlDependencies,
    FetchFileDependencies {}

/**
 * Tries both `sourcesContent` and `sources` paths
 * @param sourceMapConsumer - `new SourceMapConsumer()` from `source-map` package
 * @param dependencies - only necessary for trying `sources` paths
 * @returns - mapping from source path to source contents
 * @example
 * ```typescript
 * let compiledJsUrl, dependencies
 *
 * const compiledJsStr = await fetchFile(compiledJsUrl, dependencies)
 * const sourceMapUrl = normalizeSourceMappingURL(
 *   compiledJsUrl,
 *   getSourceMappingURL(compiledJsStr),
 *   dependencies,
 * )
 * const sourceMapStr = await fetchFile(sourceMapUrl, dependencies)
 * const sourceMapConsumer = await new SourceMapConsumer(sourceMapStr)
 * const sourceContents =
 *   await getSourceContents(sourceMapUrl, sourceMapConsumer, dependencies)
 * ```
 * @public
 */
export async function getSourceContents(
  normalizedSourceMappingURL: string,
  sourceMapConsumer: BasicSourceMapConsumer | IndexedSourceMapConsumer,
  dependencies: GetSourceContentsDependencies,
): Promise<Record<string, string>> {
  const logger = dependencies.logger ?? console
  const { sources } = sourceMapConsumer
  const sourceContents: string[] = (
    await Promise.all(
      sources.map(source => {
        const providedContent = sourceMapConsumer.sourceContentFor(source, true)
        if (providedContent !== null) {
          logger.debug?.(`found original source ${source} in sourcesContent`)
          return providedContent
        } else {
          const sourceURL = normalizePathOrUrl(
            normalizedSourceMappingURL,
            source,
            dependencies,
          )
          if (sourceURL === null) {
            logger.warn?.(
              `didn't find original source ${source} in sourcesContent or via URL/filepath`,
            )
            return null
          } else {
            logger.debug?.(`found original source ${source} via URL/filepath`)
            return fetchFile(sourceURL, dependencies)
          }
        }
      }),
    )
  ).filter((content): content is string => content !== null)
  const sourceEntries = sources.map(
    (source, i) => [source, sourceContents[i]] as [string, string],
  )
  return Object.fromEntries(sourceEntries)
}

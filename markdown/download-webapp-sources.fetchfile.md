<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@llllvvuu/download-webapp-sources](./download-webapp-sources.md) &gt; [fetchFile](./download-webapp-sources.fetchfile.md)

## fetchFile() function

Fetch method which can take a filepath or a URL.

**Signature:**

```typescript
export declare function fetchFile(normalizedUrlOrFilename: string, dependencies: FetchFileDependencies): Promise<string | null>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  normalizedUrlOrFilename | string | string resolvable from working directory |
|  dependencies | [FetchFileDependencies](./download-webapp-sources.fetchfiledependencies.md) |  |

**Returns:**

Promise&lt;string \| null&gt;

- contents of resolved file

## Example


```typescript
let compiledJsUrl, dependencies

const compiledJsStr = await fetchFile(compiledJsUrl, dependencies)
const sourceMapUrl = normalizeSourceMappingURL(
  compiledJsUrl,
  getSourceMappingURL(compiledJsStr),
  dependencies,
)
const sourceMapStr = await fetchFile(sourceMapUrl, dependencies)
const sourceMapConsumer = await new SourceMapConsumer(sourceMapStr)
const sourceContents =
  await getSourceContents(sourceMapUrl, sourceMapConsumer, dependencies)
```


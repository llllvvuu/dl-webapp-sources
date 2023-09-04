<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@llllvvuu/dl-webapp-sources](./dl-webapp-sources.md) &gt; [FetchFileDependencies](./dl-webapp-sources.fetchfiledependencies.md)

## FetchFileDependencies interface


**Signature:**

```typescript
export interface FetchFileDependencies 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [axios](./dl-webapp-sources.fetchfiledependencies.axios.md) |  | typeof axiosModule \| null | Only necessary if sourcemap is a URL |
|  [logger?](./dl-webapp-sources.fetchfiledependencies.logger.md) |  | [Logger](./dl-webapp-sources.logger.md) | _(Optional)_ Defaults to <code>console</code> |
|  [readFile](./dl-webapp-sources.fetchfiledependencies.readfile.md) |  | typeof nodeFsPromises.readFile \| null | Only necessary if sourcemap is a local filepath |

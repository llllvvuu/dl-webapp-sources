# Download original source code from public sourcemaps

I created this solution since neither [denands/sourcemapper](https://github.com/denandz/sourcemapper), [tehryanx/sourcemapper](https://github.com/tehryanx/sourcemapper), nor [paazmaya/shuji](https://github.com/paazmaya/shuji) accept a list of multiple JS files, which is quite common with chunked webapps.

[jonluca/source-map-cloner](https://github.com/jonluca/source-map-cloner) is a solution for crawling an HTML page.

`dl-webapp-sources` leaves auth/crawling to the user. It accepts a list of .js or .js.map.

- [x] .js arguments
- [x] .js.map arguments
- [x] URL arguments
- [x] filename arguments
- [x] `sourceMappingURL=data:...`
- [x] `sourceMappingURL=file:...`
- [x] `sourceMappingURL=http...`
- [x] `sourceMappingURL=<relativepath>`
- [x] lookup from `sourcesContent`
- [x] lookup from `sources` paths

## Installation

```sh
npm install -g @llllvvuu/dl-webapp-sources
```

## CLI Usage

Automated crawler may not pass auth, and it may also miss asynchronously loaded JS. But, you can get a list of loaded JS files by manually logging in.

After logging in,

- Check if there is anything interesting to download: Developer Tools > Sources > ... > Ungroup by folder
- If the app is a SPA, click around to load all of the JS chunks

Now paste into the console:

```javascript
performance
  .getEntriesByType("resource")
  .map(resource => resource.name)
  .filter(name => name.endsWith(".js"))
  .map(name => `"${name}"`)
  .join(" ")
```

This gives you the CLI args for:

```sh
dl-webapp-sources ${JS_URLS} -o ${OUTPUT_DIRECTORY}
```

Now you can try to add some `create-react-app` or `create-next-app` boilerplate to try to get the app to build.

## Library Usage

See the API reference at [markdown/dl-webapp-sources.md](./markdown/dl-webapp-sources.md).

## Credits

- [denands/sourcemapper](https://github.com/denandz/sourcemapper)
- [tehryanx/sourcemapper](https://github.com/tehryanx/sourcemapper)
- [jonluca/source-map-cloner](https://github.com/jonluca/source-map-cloner)
- [paazmaya/shuji](https://github.com/paazmaya/shuji)

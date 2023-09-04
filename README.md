# Download original source code from public sourcemaps

I created this solution since neither [denands/sourcemapper](https://github.com/denandz/sourcemapper), [tehryanx/sourcemapper](https://github.com/tehryanx/sourcemapper), nor [paazmaya/shuji](https://github.com/paazmaya/shuji) accept a list of multiple JS files, which is quite common with chunked webapps.

[jonluca/source-map-cloner](https://github.com/jonluca/source-map-cloner) is a solution for crawling an HTML page.

`dl-webapp-sources` leaves auth/crawling to the user. It accepts a list of .js or .js.map.

Sometimes it can find sources that Google Chrome misses.

- [x] sanitize output paths / pad relative parents
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

After logging in, paste into the console:

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

If you got anything interesting, go back and click around the app to load all of the chunks (if it's a SPA), and repeat.

Now you can try to add some `create-react-app` or `create-next-app` boilerplate to try to get the app to build.

> 💡 Sometimes `axios` gets 403; I will try to fix this if I have time, but in the meantime if you notice that the browser is downloading files fine, you can right click save in the Sources tab, and pass local filepaths to the CLI.

## Library Usage

See the API reference at [markdown/dl-webapp-sources.md](./markdown/dl-webapp-sources.md).

## Credits

- [denands/sourcemapper](https://github.com/denandz/sourcemapper)
- [tehryanx/sourcemapper](https://github.com/tehryanx/sourcemapper)
- [jonluca/source-map-cloner](https://github.com/jonluca/source-map-cloner)
- [paazmaya/shuji](https://github.com/paazmaya/shuji)
- [webpack-contrib/source-map-loader](https://github.com/webpack-contrib/source-map-loader)
- [User Pingolin on StackOverflow](https://stackoverflow.com/a/62640158/5938726)
